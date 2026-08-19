# -*- coding: utf-8 -*-
"""导播控制台 - 推流实例管理核心（ffmpeg 推流管线）"""
import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOG_DIR = DATA_DIR / "logs"
CONCAT_DIR = DATA_DIR / "concat"
CONFIG_FILE = DATA_DIR / "config.json"

DEFAULT_CONFIG = {
    "settings": {
        "default_rtmp": "",
        "port": 5000,
        "ffmpeg_path": "ffmpeg",
        "default_bitrate": 2500,
        "default_fps": 25,
        "auto_restart": True,
        "loglevel": "warning",
    },
    "streams": {},
}

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".flv", ".ts", ".m4v", ".webm", ".wmv", ".mpg", ".mpeg", ".3gp"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tif", ".tiff"}


def norm_layer(layer):
    layer.setdefault("id", uuid.uuid4().hex[:8])
    layer.setdefault("type", "media")
    layer.setdefault("name", "")
    layer.setdefault("source", "")
    layer.setdefault("mode", "single")
    layer.setdefault("loop", True)
    layer.setdefault("x", 0)
    layer.setdefault("y", 0)
    layer.setdefault("width", None)
    layer.setdefault("height", None)
    layer.setdefault("chroma", False)
    layer.setdefault("chroma_color", "#00FF00")
    layer.setdefault("chroma_intensity", 20)
    layer.setdefault("enabled", True)
    for k in ("x", "y", "width", "height"):
        v = layer.get(k)
        try:
            v = int(v) if v not in (None, "") else None
        except (TypeError, ValueError):
            v = None if k in ("width", "height") else 0
        layer[k] = v
    if layer["type"] not in ("media", "image"):
        layer["type"] = "media"
    if layer["mode"] not in ("single", "folder", "list"):
        layer["mode"] = "single"
    layer["name"] = str(layer.get("name") or "")
    layer["source"] = str(layer.get("source") or "")
    layer["loop"] = bool(layer.get("loop", True))
    layer["chroma"] = bool(layer.get("chroma", False))
    layer["chroma_color"] = str(layer.get("chroma_color") or "#00FF00")
    try:
        layer["chroma_intensity"] = max(0, min(100, int(layer.get("chroma_intensity", 20))))
    except (TypeError, ValueError):
        layer["chroma_intensity"] = 20
    layer["enabled"] = bool(layer.get("enabled", True))
    return layer


def norm_stream(data):
    data.setdefault("name", "未命名推流")
    data.setdefault("rtmp", "")
    data.setdefault("key", "")
    data.setdefault("width", 1920)
    data.setdefault("height", 1080)
    data.setdefault("layers", [])
    for k in ("width", "height"):
        try:
            data[k] = max(16, int(data[k]))
        except (TypeError, ValueError):
            data[k] = 1920 if k == "width" else 1080
    data["name"] = str(data.get("name") or "未命名推流")
    data["rtmp"] = str(data.get("rtmp") or "")
    data["key"] = str(data.get("key") or "")
    data["layers"] = [norm_layer(l) for l in data.get("layers", [])]
    return data


def parse_list_text(text):
    """解析数组格式文本（JSON 数组 / 换行或逗号分隔）"""
    text = (text or "").strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            items = json.loads(text.replace("\\", "/"))
            if isinstance(items, list):
                return [str(i).strip() for i in items if str(i).strip()]
        except Exception:
            pass
    items = re.split(r"[\n,;]+", text)
    return [p.strip().strip('"').strip("'") for p in items if p.strip()]


def folder_items(folder):
    folder = Path(folder)
    if not folder.is_dir():
        return []
    items = []
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.suffix.lower() in (VIDEO_EXTS | IMAGE_EXTS):
            items.append(str(f))
    return items


def write_concat(path, items):
    lines = []
    for it in items:
        it = str(it).strip().strip('"').strip("'")
        it = it.replace("\\", "/")
        it = it.replace("'", "'\\''")
        lines.append("file '%s'" % it)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


class StreamInstance:
    """单个 RTMP 推流实例"""

    def __init__(self, sid, data, manager):
        self.sid = sid
        self.data = data
        self.manager = manager
        self.proc = None
        self.status = "stopped"  # stopped | starting | running | crashed
        self.started_at = None
        self.restarts = 0
        self.last_error = ""
        self._running = False
        self._monitor_thread = None
        self._lock = threading.Lock()
        self._concat_files = []
        self._last_input_args = []

    # ---------------- 命令构建 ----------------
    def build_url(self):
        rtmp = (self.data.get("rtmp") or "").strip()
        key = (self.data.get("key") or "").strip()
        if not rtmp:
            return ""
        return rtmp.rstrip("/") + "/" + key if key else rtmp

    def _layer_input_args(self, layer):
        src = (layer.get("source") or "").strip()
        if layer["type"] == "image":
            args = ["-loop", "1", "-i", src]
        elif layer["mode"] == "single":
            pre = ["-stream_loop", "-1"] if layer.get("loop", True) else []
            args = pre + ["-re", "-i", src]
        else:
            items = parse_list_text(src) if layer["mode"] == "list" else folder_items(src)
            if not items:
                raise ValueError("图层 [%s] 未找到任何可用的媒体文件" % (layer.get("name") or src))
            lst = CONCAT_DIR / ("%s_%s.txt" % (self.sid, layer["id"]))
            write_concat(lst, items)
            self._concat_files.append(lst)
            args = ["-stream_loop", "-1", "-re", "-f", "concat", "-safe", "0", "-i", str(lst)]
        self._last_input_args = args
        return args

    def _probe_layer(self, layer):
        """探测素材是否含视频/音频流。探测失败时返回 None（按有视频处理，保持向后兼容）"""
        src = (layer.get("source") or "").strip()
        try:
            if layer["type"] == "image":
                return {"video": True, "audio": False}
            if layer["mode"] == "single":
                if not os.path.isfile(src):
                    return None
                return self._probe(src)
            # folder / list：探测生成的 concat 列表文件
            if self._concat_files:
                return self._probe_concat(str(self._concat_files[-1]))
        except Exception:
            return None
        return None

    def _probe(self, src):
        key = (src, os.path.getmtime(src), os.path.getsize(src))
        cache = self.manager._probe_cache
        if key in cache:
            return cache[key]
        res = self._probe_cmd([self.manager.ffprobe_path, "-v", "error",
                               "-show_entries", "stream=codec_type", "-of", "json", src])
        if res is not None:
            cache[key] = res
        return res

    def _probe_concat(self, list_file):
        res = self._probe_cmd([self.manager.ffprobe_path, "-v", "error",
                               "-f", "concat", "-safe", "0",
                               "-show_entries", "stream=codec_type", "-of", "json", list_file])
        return res

    @staticmethod
    def _probe_cmd(args):
        try:
            out = subprocess.run(args, capture_output=True, text=True, timeout=15,
                                 creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)).stdout
            video = '"codec_type": "video"' in (out or "")
            audio = '"codec_type": "audio"' in (out or "")
            return {"video": video, "audio": audio}
        except Exception:
            return None

    def build_command(self, settings):
        s = self.data
        ffmpeg = str(settings.get("ffmpeg_path") or "ffmpeg")
        w, h = int(s["width"]), int(s["height"])
        fps = max(1, int(settings.get("default_fps", 25)))
        bitrate = max(100, int(settings.get("default_bitrate", 2500)))
        url = self.build_url()
        if not url:
            raise ValueError("未设置 RTMP 地址")

        self._concat_files = []
        cmd = [ffmpeg, "-hide_banner", "-loglevel", str(settings.get("loglevel", "warning")), "-y",
               "-f", "lavfi", "-i", "color=c=black:s=%dx%d:r=%d" % (w, h, fps)]

        enabled = []
        for layer in s.get("layers", []):
            if layer.get("enabled", True) and (layer.get("source") or "").strip():
                enabled.append(layer)

        # 逐个添加输入并探测流类型：无视频的媒体（如 mp3）作为音频伴音层
        input_idx = 1
        video_layers = []   # (input_idx, layer) 参与画面叠加
        audio_idx = None    # 第一个含音频的输入
        for layer in enabled:
            self._layer_input_args(layer)
            cmd += self._last_input_args
            info = self._probe_layer(layer)
            has_video = info is None or info["video"]
            has_audio = info is None or info["audio"]
            if has_audio and audio_idx is None:
                audio_idx = input_idx
            if layer["type"] == "image" or has_video:
                video_layers.append((input_idx, layer))
            elif not has_audio:
                raise ValueError("图层 [%s] 无视频且无音频，无法处理：%s"
                                 % (layer.get("name") or layer.get("source"), layer.get("source")))
            input_idx += 1

        # 画面滤镜：缩放 -> 抠图 -> rgba -> 按图层顺序叠加（数组顺序即 Z 序，后者在上）
        filters = []
        labels = {}
        for i, (k, layer) in enumerate(video_layers):
            chain = []
            lw, lh = layer.get("width"), layer.get("height")
            if lw and lh:
                chain.append("scale=%d:%d" % (int(lw), int(lh)))
            else:
                chain.append("scale=%d:%d:force_original_aspect_ratio=decrease" % (w, h))
            if layer.get("chroma"):
                color = (layer.get("chroma_color") or "#00FF00").lstrip("#") or "00FF00"
                intensity = max(0, min(100, int(layer.get("chroma_intensity", 20))))
                sim = max(0.05, round(intensity / 100.0 * 0.9, 2))
                chain.append("chromakey=color=0x%s:similarity=%.2f:blend=0.1" % (color, sim))
            chain.append("format=rgba")
            labels[k] = "[l%d]" % i
            filters.append("[%d:v]%s%s" % (k, ",".join(chain), labels[k]))

        if video_layers:
            prev = "[0:v]"
            out = "[0:v]"
            for i, (k, layer) in enumerate(video_layers):
                out = "[o%d]" % i
                filters.append("%s%soverlay=x=%d:y=%d:eof_action=repeat%s" % (
                    prev, labels[k], int(layer.get("x", 0)), int(layer.get("y", 0)), out))
                prev = out
            cmd += ["-filter_complex", ";".join(filters), "-map", out]
        else:
            cmd += ["-map", "0:v:0"]

        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
                "-pix_fmt", "yuv420p", "-g", str(max(2, fps * 2)),
                "-b:v", "%dk" % bitrate, "-maxrate", "%dk" % (bitrate * 2),
                "-bufsize", "%dk" % (bitrate * 2)]
        if audio_idx is not None:
            cmd += ["-map", "%d:a:0" % audio_idx, "-c:a", "aac", "-b:a", "128k", "-ar", "44100"]
        cmd += ["-f", "flv", "-flvflags", "no_duration_filesize", url]
        return cmd

    # ---------------- 生命周期 ----------------
    @staticmethod
    def _win_argv_split(cmdline):
        args = []
        cur = []
        in_q = False
        for c in (cmdline or ""):
            if c == '"':
                in_q = not in_q
            elif c == " " and not in_q:
                if cur:
                    args.append("".join(cur))
                    cur = []
            else:
                cur.append(c)
        if cur:
            args.append("".join(cur))
        return args

    @staticmethod
    def _norm_cmdline(cmdline):
        args = [a.strip('"') for a in StreamInstance._win_argv_split(cmdline)]
        if not args:
            return ""
        exe = args[0]
        if os.path.sep not in exe:
            exe = shutil.which(exe) or exe
        return (" ".join([exe] + args[1:])).strip().lower()

    def _kill_orphans(self, cmd):
        """清理残留 ffmpeg 进程：命令行一致，或占用同一推流目标 URL（RTMP 地址+推流码）"""
        if self.proc is not None and self.proc.poll() is None:
            return
        ffmpeg = cmd[0]
        resolved = shutil.which(ffmpeg) if os.path.sep not in ffmpeg else ffmpeg
        resolved = resolved or ffmpeg
        expected = StreamInstance._norm_cmdline(subprocess.list2cmdline(cmd))
        expected2 = StreamInstance._norm_cmdline(subprocess.list2cmdline([resolved] + cmd[1:]))
        target_url = self.build_url().lower().rstrip("/")
        script = ("Get-CimInstance Win32_Process -Filter \"Name='ffmpeg.exe'\" | "
                  "ForEach-Object { $_.ProcessId.ToString() + '|' + $_.CommandLine }")
        try:
            out = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                capture_output=True, text=True, timeout=15,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)).stdout
        except Exception:
            return
        killed = []
        for line in (out or "").splitlines():
            if "|" not in line:
                continue
            pid_s, cl = line.split("|", 1)
            if not cl:
                continue
            norm = StreamInstance._norm_cmdline(cl)
            low = cl.strip().lower()
            if norm == expected or norm == expected2 or (
                    target_url and low.endswith(target_url)):
                try:
                    subprocess.run(["taskkill", "/PID", str(int(pid_s)), "/F"],
                                   capture_output=True, timeout=10,
                                   creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                    killed.append(pid_s)
                except Exception:
                    pass
        if killed:
            self.last_error = "已清理残留推流进程 PID: %s" % ", ".join(killed)

    def start(self):
        with self._lock:
            if self._running:
                return
            self._running = True
        self._launch()

    def _launch(self):
        with self._lock:
            if not self._running:
                return
        settings = self.manager.settings
        self.status = "starting"
        self.last_error = ""
        try:
            cmd = self.build_command(settings)
        except Exception as e:
            self.last_error = "构建推流命令失败: %s" % e
            self.status = "crashed"
            with self._lock:
                self._running = False
            return
        self._kill_orphans(cmd)
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_file = open(str(LOG_DIR / ("%s.log" % self.sid)), "ab")
        try:
            log_file.write(("\n===== %s start =====\n" % time.strftime("%Y-%m-%d %H:%M:%S")).encode("utf-8"))
            log_file.flush()
            self.proc = subprocess.Popen(
                cmd, stdout=log_file, stderr=log_file, stdin=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        except Exception as e:
            self.last_error = "启动 ffmpeg 失败: %s" % e
            self.status = "crashed"
            with self._lock:
                self._running = False
            return
        self.started_at = time.time()
        self.status = "running"
        if not self._monitor_thread or not self._monitor_thread.is_alive():
            self._monitor_thread = threading.Thread(target=self._monitor, daemon=True)
            self._monitor_thread.start()

    def _monitor(self):
        while True:
            with self._lock:
                running = self._running
            if not running:
                return
            if self.proc is None:
                time.sleep(0.5)
                continue
            code = self.proc.poll()
            if code is not None:
                with self._lock:
                    running = self._running
                if not running:
                    return
                self.status = "crashed"
                self.last_error = "ffmpeg 进程退出，代码 %s" % code
                if self.manager.settings.get("auto_restart", True):
                    time.sleep(2)
                    with self._lock:
                        self.restarts += 1
                    self._launch()
                    continue
                with self._lock:
                    self._running = False
                return
            time.sleep(1)

    def stop(self):
        with self._lock:
            self._running = False
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
            except Exception:
                pass
            try:
                self.proc.wait(timeout=5)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
        self.proc = None
        self.status = "stopped"

    def restart(self):
        self.stop()
        time.sleep(0.5)
        self.start()

    def status_dict(self):
        with self._lock:
            running = self._running
        proc_alive = self.proc is not None and self.proc.poll() is None
        if proc_alive:
            return {
                "status": self.status if self.status in ("running", "starting") else "running",
                "pid": self.proc.pid,
                "uptime": int(time.time() - self.started_at) if self.started_at else 0,
                "restarts": self.restarts,
                "last_error": self.last_error,
            }
        return {
            "status": "stopped" if not running else "crashed",
            "pid": None,
            "uptime": 0,
            "restarts": self.restarts,
            "last_error": self.last_error,
        }


class Manager:
    """推流实例集合管理"""

    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        CONCAT_DIR.mkdir(parents=True, exist_ok=True)
        self.config = self._load()
        if not isinstance(self.config, dict):
            self.config = {}
        self.config.setdefault("settings", {})
        self.config.setdefault("streams", {})
        for k in DEFAULT_CONFIG["settings"]:
            self.config["settings"].setdefault(k, DEFAULT_CONFIG["settings"][k])
        self.streams = {}
        self._probe_cache = {}
        for sid in self.config["streams"]:
            self.streams[sid] = StreamInstance(sid, self.config["streams"][sid], self)

    @property
    def ffprobe_path(self):
        ff = str(self.settings.get("ffmpeg_path") or "ffmpeg").strip()
        if os.path.sep in ff or (ff.lower().endswith(".exe") and os.path.dirname(ff)):
            cand = os.path.join(os.path.dirname(ff), "ffprobe.exe")
            if os.path.isfile(cand):
                return cand
        return "ffprobe"

    @staticmethod
    def _load():
        if CONFIG_FILE.exists():
            try:
                return json.loads(CONFIG_FILE.read_text(encoding="utf-8-sig"))
            except Exception:
                pass
        return json.loads(json.dumps(DEFAULT_CONFIG))

    @property
    def settings(self):
        return self.config["settings"]

    def save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = CONFIG_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.config, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(str(tmp), str(CONFIG_FILE))

    def stream_list(self):
        out = []
        for sid, st in self.streams.items():
            d = st.data
            out.append({
                "sid": sid,
                "name": d.get("name"),
                "rtmp": d.get("rtmp"),
                "key": d.get("key"),
                "width": d.get("width"),
                "height": d.get("height"),
                "layer_count": len(d.get("layers", [])),
            })
        return out

    def get(self, sid):
        return self.streams.get(sid)

    def create_stream(self, data):
        sid = uuid.uuid4().hex[:8]
        if not (data.get("name") or "").strip():
            data["name"] = "推流 %s" % sid[:4]
        if not (data.get("rtmp") or "").strip() and self.settings.get("default_rtmp"):
            data["rtmp"] = self.settings["default_rtmp"]
        norm_stream(data)
        self.config["streams"][sid] = data
        self.streams[sid] = StreamInstance(sid, data, self)
        self.save()
        return sid

    def delete_stream(self, sid):
        st = self.streams.pop(sid, None)
        if st:
            st.stop()
        self.config["streams"].pop(sid, None)
        self.save()

    def update_stream(self, sid, patch):
        st = self.get(sid)
        if not st:
            return None
        for k in ("name", "rtmp", "key"):
            if k in patch:
                st.data[k] = str(patch[k] or "").strip()
        self.save()
        return st.data

    def set_resolution(self, sid, width, height):
        st = self.get(sid)
        if not st:
            return None
        st.data["width"] = max(16, int(width))
        st.data["height"] = max(16, int(height))
        self.save()
        return st.data

    def add_layer(self, sid, layer):
        st = self.get(sid)
        if not st:
            return None
        norm_layer(layer)
        st.data["layers"].append(layer)
        self.save()
        return layer

    def update_layer(self, sid, lid, patch):
        st = self.get(sid)
        if not st:
            return None
        for l in st.data["layers"]:
            if l.get("id") == lid:
                allowed = ("name", "source", "mode", "loop", "x", "y", "width", "height",
                           "chroma", "chroma_color", "chroma_intensity", "enabled")
                for k in allowed:
                    if k in patch:
                        l[k] = patch[k]
                norm_layer(l)
                self.save()
                return l
        return None

    def delete_layer(self, sid, lid):
        st = self.get(sid)
        if not st:
            return None
        st.data["layers"] = [l for l in st.data["layers"] if l.get("id") != lid]
        self.save()
        return True

    def move_layer(self, sid, lid, direction):
        st = self.get(sid)
        if not st:
            return None
        layers = st.data["layers"]
        idx = next((i for i, l in enumerate(layers) if l.get("id") == lid), None)
        if idx is None:
            return None
        if direction == "up" and idx < len(layers) - 1:
            layers[idx], layers[idx + 1] = layers[idx + 1], layers[idx]
        elif direction == "down" and idx > 0:
            layers[idx], layers[idx - 1] = layers[idx - 1], layers[idx]
        else:
            return layers
        self.save()
        return layers

    def _maybe_restart(self, sid):
        st = self.get(sid)
        if st and st.status in ("running", "crashed"):
            st.restart()

    def is_allowed_preview(self, path):
        p = os.path.normcase(os.path.normpath(path))
        for st in self.streams.values():
            for l in st.data.get("layers", []):
                if l.get("type") == "image" and l.get("enabled", True):
                    src = (l.get("source") or "").strip()
                    if src and os.path.normcase(os.path.normpath(src)) == p:
                        return True
        return False