# -*- coding: utf-8 -*-
"""导播控制台 - Web 服务（Flask + WSGI）"""
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory

from stream_manager import Manager, parse_list_text

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__, static_folder="static", static_url_path="/static")
manager = Manager()


def ok(data=None):
    r = {"ok": True}
    if data is not None:
        r["data"] = data
    return jsonify(r)


def err(msg, code=400):
    return jsonify({"ok": False, "error": msg}), code


# ---------------- 页面 ----------------
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ---------------- 配置 / 设置 ----------------
@app.route("/api/config")
def api_config():
    return ok({
        "settings": manager.settings,
        "streams": manager.stream_list(),
    })


@app.route("/api/settings", methods=["PUT"])
def api_settings():
    data = request.get_json(silent=True) or {}
    allowed = ("default_rtmp", "port", "ffmpeg_path", "default_bitrate", "default_fps",
               "auto_restart", "loglevel")
    for k in allowed:
        if k in data:
            manager.settings[k] = data[k]
    try:
        manager.settings["port"] = max(1, min(65535, int(manager.settings.get("port", 5000))))
        manager.settings["default_bitrate"] = max(100, int(manager.settings.get("default_bitrate", 2500)))
        manager.settings["default_fps"] = max(1, min(120, int(manager.settings.get("default_fps", 25))))
    except (TypeError, ValueError):
        pass
    manager.settings["default_rtmp"] = str(manager.settings.get("default_rtmp") or "").strip()
    manager.settings["ffmpeg_path"] = str(manager.settings.get("ffmpeg_path") or "ffmpeg").strip()
    manager.settings["auto_restart"] = bool(manager.settings.get("auto_restart", True))
    if manager.settings.get("loglevel") not in ("quiet", "error", "warning", "info", "verbose", "debug"):
        manager.settings["loglevel"] = "warning"
    manager.save()
    return ok(manager.settings)


# ---------------- 推流实例 ----------------
@app.route("/api/streams", methods=["POST"])
def api_create_stream():
    data = request.get_json(silent=True) or {}
    sid = manager.create_stream(data)
    return ok({"sid": sid})


@app.route("/api/streams/<sid>")
def api_stream_detail(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    return ok({"stream": st.data, "status": st.status_dict()})


@app.route("/api/streams/<sid>", methods=["PUT"])
def api_update_stream(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    data = request.get_json(silent=True) or {}
    updated = manager.update_stream(sid, data)
    return ok({"stream": updated})


@app.route("/api/streams/<sid>", methods=["DELETE"])
def api_delete_stream(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    manager.delete_stream(sid)
    return ok()


@app.route("/api/streams/<sid>/start", methods=["POST"])
def api_stream_start(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    if st.status == "running":
        return ok(st.status_dict())
    st.start()
    return ok(st.status_dict())


@app.route("/api/streams/<sid>/stop", methods=["POST"])
def api_stream_stop(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    st.stop()
    return ok(st.status_dict())


@app.route("/api/streams/<sid>/restart", methods=["POST"])
def api_stream_restart(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    st.restart()
    return ok(st.status_dict())


@app.route("/api/streams/<sid>/status")
def api_stream_status(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    return ok(st.status_dict())


@app.route("/api/streams/<sid>/log")
def api_stream_log(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    path = Path(__file__).resolve().parent / "data" / "logs" / ("%s.log" % sid)
    if not path.exists():
        return ok({"size": 0, "lines": []})
    try:
        raw = path.read_bytes()
    except OSError:
        return ok({"size": 0, "lines": []})
    text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    limit = max(1, min(int(request.args.get("lines", 200)), 5000))
    tail = lines[-limit:]
    return ok({"size": len(raw), "lines": tail})


@app.route("/api/streams/<sid>/resolution", methods=["POST"])
def api_stream_resolution(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    data = request.get_json(silent=True) or {}
    try:
        w = int(data.get("width", st.data["width"]))
        h = int(data.get("height", st.data["height"]))
    except (TypeError, ValueError):
        return err("分辨率格式错误")
    manager.set_resolution(sid, w, h)
    if st.status in ("running", "crashed"):
        st.restart()
    return ok({"stream": st.data, "status": st.status_dict()})


# ---------------- 图层 ----------------
@app.route("/api/streams/<sid>/layers", methods=["POST"])
def api_add_layer(sid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    layer = request.get_json(silent=True) or {}
    if not (layer.get("source") or "").strip():
        return err("请填写素材路径")
    manager.add_layer(sid, layer)
    manager._maybe_restart(sid)
    return ok({"layers": st.data["layers"]})


@app.route("/api/streams/<sid>/layers/<lid>", methods=["PUT"])
def api_update_layer(sid, lid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    patch = request.get_json(silent=True) or {}
    layer = manager.update_layer(sid, lid, patch)
    if layer is None:
        return err("图层不存在", 404)
    manager._maybe_restart(sid)
    return ok({"layers": st.data["layers"]})


@app.route("/api/streams/<sid>/layers/<lid>", methods=["DELETE"])
def api_delete_layer(sid, lid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    manager.delete_layer(sid, lid)
    manager._maybe_restart(sid)
    return ok({"layers": st.data["layers"]})


@app.route("/api/streams/<sid>/layers/<lid>/move", methods=["POST"])
def api_move_layer(sid, lid):
    st = manager.get(sid)
    if not st:
        return err("推流实例不存在", 404)
    data = request.get_json(silent=True) or {}
    layers = manager.move_layer(sid, lid, data.get("direction"))
    if layers is None:
        return err("图层不存在", 404)
    return ok({"layers": layers})


# ---------------- 预览 ----------------
@app.route("/api/preview/img")
def api_preview_img():
    path = request.args.get("path", "")
    if not path or not os.path.isfile(path):
        return err("文件不存在", 404)
    if not manager.is_allowed_preview(path):
        return err("无权访问该文件", 403)
    return send_file(path)


if __name__ == "__main__":
    port = int(manager.settings.get("port", 5000))
    try:
        from waitress import serve
        serve(app, host="127.0.0.1", port=port, threads=8)
    except ImportError:
        app.run(host="127.0.0.1", port=port, debug=False, threaded=True)