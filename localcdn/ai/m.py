#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AI 论坛助手 - 基于智谱 AI GLM-4-Flash 模型
支持自动回复、定时发帖、设置等功能
使用 CMD 终端绘制界面，遥控器式操作
"""

import os
import sys
import json
import time
import sqlite3
import threading
import requests
from datetime import datetime
from pathlib import Path

# 配置常量
DEFAULT_API_BASE = "https://open.bigmodel.cn/api/paas/v4"
DEFAULT_API_KEY = "137e33a723df4028beddc06850b8cb1a.IowCYALy5ZDsFR4T"
DEFAULT_MODEL = "glm-4-flash"
DEFAULT_SERVER = "http://127.0.0.1:8897"
DEFAULT_MAX_CONTEXT_TOKENS = 8000
DEFAULT_MAX_REPLY_TOKENS = 1000
DEFAULT_MAX_POST_TOKENS = 2000
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "ai_assistant.json")

# 确保配置目录存在
os.makedirs(CONFIG_DIR, exist_ok=True)


class ConfigManager:
    """配置管理器"""
    
    def __init__(self):
        self.config = self.load_config()
    
    def load_config(self):
        """加载配置"""
        default = {
            "api_base": DEFAULT_API_BASE,
            "api_key": DEFAULT_API_KEY,
            "model": DEFAULT_MODEL,
            "server": DEFAULT_SERVER,
            "forum_user": "",
            "forum_password": "",
            "max_context_tokens": DEFAULT_MAX_CONTEXT_TOKENS,
            "max_reply_tokens": DEFAULT_MAX_REPLY_TOKENS,
            "max_post_tokens": DEFAULT_MAX_POST_TOKENS,
            "system_prompt": "你是一个友好的论坛助手，帮助回答用户问题。请用简洁、友好的语气回复。",
            "auto_reply": {
                "enabled": False,
                "check_interval": 60,
                "last_check_time": 0,
                "last_commented_post_ids": [],
                "default_comment": "我来看看~ 有什么可以帮大家的吗？"
            },
            "auto_comment": {
                "enabled": False,
                "check_interval": 60,
                "last_check_time": 0,
                "last_commented_post_ids": [],
                "comment_content": "欢迎发布新作品！期待更多精彩内容~"
            },
            "scheduled_posts": {
                "enabled": False,
                "posts": []
            }
        }
        
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                for k, v in default.items():
                    if k not in saved:
                        saved[k] = v
                    elif isinstance(v, dict):
                        for dk, dv in v.items():
                            if dk not in saved[k]:
                                saved[k][dk] = dv
                return saved
            except:
                return default
        return default
    
    def save(self):
        """保存配置"""
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)


class ForumAPI:
    """论坛 API 客户端"""
    
    def __init__(self, config):
        self.server = config["server"]
        self.user = config["forum_user"]
        self.password = config["forum_password"]
        self.session = requests.Session()
        self.logged_in = False
    
    def login(self):
        """登录论坛"""
        try:
            resp = self.session.post(
                f"{self.server}/login",
                data={"username": self.user, "password": self.password},
                allow_redirects=True,
                timeout=10
            )
            if resp.status_code == 200:
                self.logged_in = True
                return True, "登录成功"
            return False, f"登录失败 (状态码: {resp.status_code})"
        except Exception as e:
            return False, f"登录异常: {str(e)}"
    
    def ensure_login(self):
        """确保已登录"""
        if not self.logged_in:
            return self.login()
        return True, "已登录"
    
    def get_latest_posts(self, limit=10):
        """获取最新帖子"""
        try:
            resp = self.session.get(
                f"{self.server}/forum",
                params={"tab": "new"},
                timeout=10
            )
            if resp.status_code == 200:
                return True, []
            return False, []
        except Exception as e:
            return False, []
    
    def get_post_replies(self, post_id):
        """获取帖子回复"""
        try:
            resp = self.session.get(
                f"{self.server}/forum/post/{post_id}",
                timeout=10
            )
            if resp.status_code == 200:
                return True, []
            return False, []
        except Exception as e:
            return False, []
    
    def reply_post(self, post_id, content):
        """回复帖子"""
        # 确保已登录
        success, msg = self.ensure_login()
        if not success:
            return False, f"登录失败: {msg}"
        
        try:
            resp = self.session.post(
                f"{self.server}/forum/reply/{post_id}",
                json={"content": content},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("success", False), data.get("message", "")
            return False, f"回复失败 (状态码: {resp.status_code})"
        except Exception as e:
            return False, f"回复异常: {str(e)}"
    
    def create_post(self, forum_id, title, content):
        """创建帖子"""
        # 确保已登录
        success, msg = self.ensure_login()
        if not success:
            return False, f"登录失败: {msg}", 0
        
        try:
            resp = self.session.post(
                f"{self.server}/forum/new",
                json={"forum_id": forum_id, "title": title, "content": content},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("success", False), data.get("message", ""), data.get("post_id", 0)
            return False, f"发帖失败 (状态码: {resp.status_code})", 0
        except Exception as e:
            return False, f"发帖异常: {str(e)}", 0


class AIClient:
    """AI API 客户端 (OpenAI 兼容)"""
    
    def __init__(self, config):
        self.api_base = config["api_base"]
        self.api_key = config["api_key"]
        self.model = config["model"]
        self.max_context_tokens = config["max_context_tokens"]
        self.max_reply_tokens = config["max_reply_tokens"]
        self.max_post_tokens = config["max_post_tokens"]
        self.system_prompt = config["system_prompt"]
    
    def chat(self, messages, max_tokens=None):
        """发送聊天请求"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens or self.max_reply_tokens
            }
            
            resp = requests.post(
                f"{self.api_base}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                return True, result["choices"][0]["message"]["content"]
            return False, f"API 错误: {resp.status_code}"
        except Exception as e:
            return False, f"请求异常: {str(e)}"
    
    def generate_reply(self, post_title, post_content, replies=None):
        """生成回复"""
        messages = [{"role": "system", "content": self.system_prompt}]
        
        user_msg = f"帖子标题: {post_title}\n帖子内容: {post_content}"
        if replies:
            user_msg += "\n\n已有回复:\n" + "\n".join(replies[-5:])
        
        messages.append({"role": "user", "content": user_msg})
        return self.chat(messages)
    
    def generate_post(self, topic, forum_name=""):
        """生成帖子内容"""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"请为论坛板块「{forum_name}」创建一个关于「{topic}」的帖子，包括标题和内容。格式：\n标题: xxx\n内容: xxx"}
        ]
        return self.chat(messages, max_tokens=self.max_post_tokens)


class TerminalUI:
    """终端 UI 控制器"""
    
    def __init__(self):
        self.cursor_x = 0
        self.cursor_y = 0
        self.menu_items = []
        self.selected = 0
    
    def clear(self):
        """清屏"""
        os.system("cls" if os.name == "nt" else "clear")
    
    def draw_box(self, x, y, w, h, title=""):
        """绘制边框"""
        print("\033[{};{}H".format(y, x), end="")
        print("┌" + "─" * (w - 2) + "┐")
        for i in range(h - 2):
            print("\033[{};{}H".format(y + i + 1, x), end="")
            print("│" + " " * (w - 2) + "│")
        print("\033[{};{}H".format(y + h - 1, x), end="")
        print("└" + "─" * (w - 2) + "┘")
        if title:
            print("\033[{};{}H".format(y, x + 2), end="")
            print(f" {title} ")
    
    def draw_text(self, x, y, text, color=""):
        """绘制文本"""
        if color:
            print(f"\033[{color}m", end="")
        print("\033[{};{}H".format(y, x), end="")
        print(text[:80])
        if color:
            print("\033[0m", end="")
    
    def draw_menu(self, items, selected, x=2, y=5):
        """绘制菜单"""
        for i, item in enumerate(items):
            color = "32" if i == selected else "37"
            prefix = "► " if i == selected else "  "
            self.draw_text(x, y + i, f"{prefix}{item}", color)
    
    def get_key(self):
        """获取按键"""
        import msvcrt
        while True:
            if msvcrt.kbhit():
                key = msvcrt.getch()
                if key == b"\xe0":
                    key = msvcrt.getch()
                    if key == b"H":
                        return "UP"
                    elif key == b"P":
                        return "DOWN"
                    elif key == b"M":
                        return "RIGHT"
                    elif key == b"K":
                        return "LEFT"
                elif key == b"\r":
                    return "ENTER"
                elif key == b"\x1b":
                    return "ESC"
                else:
                    return key.decode("utf-8", errors="ignore")
    
    def input_text(self, x, y, prompt, default="", max_len=100):
        """文本输入"""
        self.draw_text(x, y, prompt)
        text = default
        while True:
            self.draw_text(x + len(prompt), y, text + " ")
            key = self.get_key()
            if key == "ENTER":
                return text
            elif key == "ESC":
                return None
            elif key == "BACKSPACE" or key == "\x08":
                text = text[:-1]
            elif len(key) == 1 and len(text) < max_len:
                text += key


class AIForumAssistant:
    """AI 论坛助手主程序"""
    
    def __init__(self):
        self.config = ConfigManager()
        self.ui = TerminalUI()
        self.forum_api = None
        self.ai_client = None
        self.running = True
        self.auto_reply_thread = None
        self.auto_comment_thread = None
        self.scheduled_post_thread = None
        self.auto_reply_running = False
        self.auto_comment_running = False
        self.scheduled_post_running = False
    
    def init_clients(self):
        """初始化客户端"""
        self.forum_api = ForumAPI(self.config.config)
        self.ai_client = AIClient(self.config.config)
    
    def check_user_config(self):
        """检查用户配置"""
        if not self.config.config["forum_user"] or not self.config.config["forum_password"]:
            return False
        return True
    
    def setup_wizard(self):
        """配置向导"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 70, 20, "AI 论坛助手 - 初次配置")
        
        self.ui.draw_text(10, 5, "欢迎使用 AI 论坛助手！请先完成以下配置：")
        
        self.ui.draw_text(10, 8, "1. 论坛服务器地址")
        server = self.ui.input_text(10, 9, "服务器: ", self.config.config["server"])
        if server is not None:
            self.config.config["server"] = server
        
        self.ui.draw_text(10, 11, "2. 论坛账号")
        user = self.ui.input_text(10, 12, "用户名: ")
        if user is not None:
            self.config.config["forum_user"] = user
        
        pwd = self.ui.input_text(10, 13, "密码: ")
        if pwd is not None:
            self.config.config["forum_password"] = pwd
        
        self.ui.draw_text(10, 15, "3. API 配置")
        api_key = self.ui.input_text(10, 16, "API Key: ", self.config.config["api_key"])
        if api_key is not None:
            self.config.config["api_key"] = api_key
        
        self.config.save()
        self.init_clients()
        
        self.ui.draw_text(10, 18, "配置已保存！按 Enter 继续...")
        while self.ui.get_key() != "ENTER":
            pass
    
    def main_menu(self):
        """主菜单"""
        items = [
            "1. 自动回复（在新帖子下留默认评论，有人回复时触发AI）",
            "2. 定时发帖",
            "3. 设置",
            "4. 退出"
        ]
        
        selected = 0
        while self.running:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 15, "AI 论坛助手 - 主菜单")
            self.ui.draw_text(10, 5, f"服务器: {self.config.config['server']}")
            self.ui.draw_text(10, 6, f"用户: {self.config.config['forum_user']}")
            self.ui.draw_text(10, 7, f"模型: {self.config.config['model']}")
            
            status = []
            if self.auto_reply_running:
                status.append("自动回复: 运行中")
            if self.scheduled_post_running:
                status.append("定时发帖: 运行中")
            if status:
                self.ui.draw_text(10, 8, " | ".join(status))
            
            self.ui.draw_menu(items, selected, 10, 10)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    self.auto_reply_menu()
                elif selected == 1:
                    self.scheduled_post_menu()
                elif selected == 2:
                    self.settings_menu()
                elif selected == 3:
                    self.running = False
                    return
    
    def auto_reply_menu(self):
        """自动回复菜单"""
        items = ["开启自动回复", "关闭自动回复", "设置默认评论内容", "配置检查间隔", "返回"]
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 16, "自动回复")
            self.ui.draw_text(10, 5, f"状态: {'运行中' if self.auto_reply_running else '已停止'}")
            self.ui.draw_text(10, 6, f"检查间隔: {self.config.config['auto_reply']['check_interval']}秒")
            self.ui.draw_text(10, 7, f"默认评论: {self.config.config['auto_reply']['default_comment'][:30]}...")
            self.ui.draw_text(10, 8, "工作流程:")
            self.ui.draw_text(12, 9, "1. 在新帖子下留默认评论")
            self.ui.draw_text(12, 10, "2. 有人回复该评论时触发AI")
            self.ui.draw_text(12, 11, "3. AI生成回复并回复")
            
            self.ui.draw_menu(items, selected, 10, 13)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    self.start_auto_reply()
                elif selected == 1:
                    self.stop_auto_reply()
                elif selected == 2:
                    self.set_default_comment()
                elif selected == 3:
                    interval = self.ui.input_text(10, 15, "间隔(秒): ", str(self.config.config['auto_reply']['check_interval']))
                    if interval and interval.isdigit():
                        self.config.config['auto_reply']['check_interval'] = int(interval)
                        self.config.save()
                elif selected == 4:
                    return
    
    def set_default_comment(self):
        """设置默认评论内容"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 10, "设置默认评论内容")
        self.ui.draw_text(10, 5, "当前内容:")
        self.ui.draw_text(10, 6, self.config.config['auto_reply']['default_comment'])
        
        content = self.ui.input_text(10, 8, "新内容: ", self.config.config['auto_reply']['default_comment'])
        if content:
            self.config.config['auto_reply']['default_comment'] = content
            self.config.save()
            self.ui.draw_text(10, 9, "已保存！")
            time.sleep(1)
    
    def start_auto_reply(self):
        """启动自动回复"""
        if self.auto_reply_running:
            return
        
        if not self.check_user_config():
            self.ui.draw_text(10, 15, "请先在设置中配置论坛账号！")
            time.sleep(2)
            return
        
        self.auto_reply_running = True
        thread = threading.Thread(target=self._auto_reply_loop, daemon=True)
        thread.start()
        self.ui.draw_text(10, 15, "自动回复已启动！")
        time.sleep(1)
    
    def stop_auto_reply(self):
        """停止自动回复"""
        self.auto_reply_running = False
        self.ui.draw_text(10, 15, "自动回复已停止！")
        time.sleep(1)
    
    def _auto_reply_loop(self):
        """自动回复循环 - 先留默认评论，有人回复时触发AI"""
        while self.auto_reply_running:
            try:
                self.ui.draw_text(10, 20, f"检查新帖子... ({datetime.now().strftime('%H:%M:%S')})")
                
                # 查询论坛数据库
                forum_db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'localcdn', 'shequ', 'forum.db')
                if not os.path.exists(forum_db_path):
                    time.sleep(self.config.config['auto_reply']['check_interval'])
                    continue
                
                conn = sqlite3.connect(forum_db_path)
                conn.row_factory = sqlite3.Row
                
                # 获取最新帖子
                latest_posts = conn.execute(
                    "SELECT id, title, forum_id FROM posts WHERE status = 'active' ORDER BY id DESC LIMIT 20"
                ).fetchall()
                
                commented_ids = self.config.config['auto_reply'].get('last_commented_post_ids', [])
                
                for post in latest_posts:
                    # 检查AI是否已经在这个帖子下评论过
                    ai_comment = conn.execute(
                        "SELECT id, content FROM responses WHERE post_id = ? AND user_id = ? AND status = 'active' ORDER BY id ASC LIMIT 1",
                        (post['id'], self.config.config['forum_user'])
                    ).fetchone()
                    
                    if not ai_comment:
                        # AI还没评论过，留默认评论
                        self.ui.draw_text(10, 21, f"新帖子: {post['title']} - 正在留默认评论...")
                        
                        default_comment = self.config.config['auto_reply']['default_comment']
                        success, msg = self.forum_api.reply_post(post['id'], default_comment)
                        
                        if success:
                            self.ui.draw_text(10, 22, f"已留评论: {default_comment[:30]}...")
                            commented_ids.append(post['id'])
                            self.config.config['auto_reply']['last_commented_post_ids'] = commented_ids[-100:]
                            self.config.save()
                        else:
                            self.ui.draw_text(10, 22, f"评论失败: {msg}")
                        
                        time.sleep(2)
                    else:
                        # AI已经评论过，检查是否有人回复AI的评论
                        replies_to_ai = conn.execute(
                            "SELECT id, user_id, username, content, created_at FROM responses WHERE parent_id = ? AND user_id != ? AND status = 'active' ORDER BY id DESC LIMIT 5",
                            (ai_comment['id'], self.config.config['forum_user'])
                        ).fetchall()
                        
                        if replies_to_ai:
                            # 有人回复了AI的评论，触发AI回复
                            latest_reply = replies_to_ai[0]
                            self.ui.draw_text(10, 21, f"有人回复AI: {latest_reply['username']} - {latest_reply['content'][:30]}...")
                            
                            # 获取帖子信息
                            post_info = conn.execute(
                                "SELECT title, content FROM posts WHERE id = ?",
                                (post['id'],)
                            ).fetchone()
                            
                            if post_info:
                                # 构建对话上下文
                                messages = [
                                    {"role": "system", "content": self.ai_client.system_prompt},
                                    {"role": "assistant", "content": ai_comment['content']},
                                    {"role": "user", "content": f"{latest_reply['username']} 回复: {latest_reply['content']}\n\n帖子标题: {post_info['title']}\n帖子内容: {post_info['content'][:200]}\n\n请生成一个友好的回复:"}
                                ]
                                
                                success, result = self.ai_client.chat(messages, max_tokens=self.ai_client.max_reply_tokens)
                                if success:
                                    # 回复该帖子
                                    success, msg = self.forum_api.reply_post(post['id'], result)
                                    if success:
                                        self.ui.draw_text(10, 22, f"AI已回复: {result[:50]}...")
                                    else:
                                        self.ui.draw_text(10, 22, f"回复失败: {msg}")
                                else:
                                    self.ui.draw_text(10, 22, f"AI生成失败: {result}")
                                
                                time.sleep(3)
                
                conn.close()
                
                time.sleep(self.config.config['auto_reply']['check_interval'])
            except Exception as e:
                self.ui.draw_text(10, 20, f"自动回复错误: {str(e)}")
                time.sleep(5)
    
    def auto_comment_menu(self):
        """自动评论菜单"""
        items = ["开启自动评论", "关闭自动评论", "设置评论内容", "配置检查间隔", "返回"]
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 14, "自动评论新帖子")
            self.ui.draw_text(10, 5, f"状态: {'运行中' if self.auto_comment_running else '已停止'}")
            self.ui.draw_text(10, 6, f"检查间隔: {self.config.config['auto_comment']['check_interval']}秒")
            self.ui.draw_text(10, 7, f"评论内容: {self.config.config['auto_comment']['comment_content'][:40]}...")
            self.ui.draw_text(10, 8, "说明: 新帖子发布时自动评论（不调用AI）")
            
            self.ui.draw_menu(items, selected, 10, 10)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    self.start_auto_comment()
                elif selected == 1:
                    self.stop_auto_comment()
                elif selected == 2:
                    self.set_auto_comment_content()
                elif selected == 3:
                    interval = self.ui.input_text(10, 12, "间隔(秒): ", str(self.config.config['auto_comment']['check_interval']))
                    if interval and interval.isdigit():
                        self.config.config['auto_comment']['check_interval'] = int(interval)
                        self.config.save()
                elif selected == 4:
                    return
    
    def start_auto_comment(self):
        """启动自动评论"""
        if self.auto_comment_running:
            return
        
        if not self.check_user_config():
            self.ui.draw_text(10, 15, "请先在设置中配置论坛账号！")
            time.sleep(2)
            return
        
        self.auto_comment_running = True
        thread = threading.Thread(target=self._auto_comment_loop, daemon=True)
        thread.start()
        self.ui.draw_text(10, 15, "自动评论已启动！")
        time.sleep(1)
    
    def stop_auto_comment(self):
        """停止自动评论"""
        self.auto_comment_running = False
        self.ui.draw_text(10, 15, "自动评论已停止！")
        time.sleep(1)
    
    def set_auto_comment_content(self):
        """设置自动评论内容"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 10, "设置自动评论内容")
        self.ui.draw_text(10, 5, "当前内容:")
        self.ui.draw_text(10, 6, self.config.config['auto_comment']['comment_content'])
        
        content = self.ui.input_text(10, 8, "新内容: ", self.config.config['auto_comment']['comment_content'])
        if content:
            self.config.config['auto_comment']['comment_content'] = content
            self.config.save()
            self.ui.draw_text(10, 9, "已保存！")
            time.sleep(1)
    
    def _auto_comment_loop(self):
        """自动评论循环 - 检测新帖子并自动评论"""
        while self.auto_comment_running:
            try:
                self.ui.draw_text(10, 20, f"检查新帖子... ({datetime.now().strftime('%H:%M:%S')})")
                
                # 查询论坛数据库
                forum_db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'localcdn', 'shequ', 'forum.db')
                if not os.path.exists(forum_db_path):
                    time.sleep(self.config.config['auto_comment']['check_interval'])
                    continue
                
                conn = sqlite3.connect(forum_db_path)
                conn.row_factory = sqlite3.Row
                
                # 获取最新帖子
                latest_posts = conn.execute(
                    "SELECT id, title, forum_id FROM posts WHERE status = 'active' ORDER BY id DESC LIMIT 20"
                ).fetchall()
                
                commented_ids = self.config.config['auto_comment'].get('last_commented_post_ids', [])
                new_posts_found = False
                
                for post in latest_posts:
                    if post['id'] not in commented_ids:
                        # 检查是否已经评论过
                        existing = conn.execute(
                            "SELECT id FROM responses WHERE post_id = ? AND user_id = ? AND status = 'active'",
                            (post['id'], self.config.config['forum_user'])
                        ).fetchone()
                        
                        if not existing:
                            new_posts_found = True
                            self.ui.draw_text(10, 21, f"发现新帖子: {post['title']}")
                            
                            # 使用预设内容自动评论（不调用AI，节省token）
                            comment_content = self.config.config['auto_comment']['comment_content']
                            success, msg = self.forum_api.reply_post(post['id'], comment_content)
                            
                            if success:
                                self.ui.draw_text(10, 22, f"已自动评论: {comment_content[:30]}...")
                                commented_ids.append(post['id'])
                                self.config.config['auto_comment']['last_commented_post_ids'] = commented_ids[-100:]
                                self.config.save()
                            else:
                                self.ui.draw_text(10, 22, f"评论失败: {msg}")
                            
                            time.sleep(2)
                
                conn.close()
                
                if not new_posts_found:
                    self.ui.draw_text(10, 20, f"暂无新帖子 ({datetime.now().strftime('%H:%M:%S')})")
                
                time.sleep(self.config.config['auto_comment']['check_interval'])
            except Exception as e:
                self.ui.draw_text(10, 20, f"自动评论错误: {str(e)}")
                time.sleep(5)
    
    def scheduled_post_menu(self):
        """定时发帖菜单"""
        items = ["开启定时发帖", "关闭定时发帖", "添加定时帖子", "管理定时帖子", "返回"]
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 14, "定时发帖")
            self.ui.draw_text(10, 5, f"状态: {'运行中' if self.scheduled_post_running else '已停止'}")
            
            posts = self.config.config['scheduled_posts']['posts']
            self.ui.draw_text(10, 6, f"定时帖子数: {len(posts)}")
            if posts:
                for i, p in enumerate(posts[:3]):
                    self.ui.draw_text(10, 7 + i, f"  - {p.get('time', '')} | {p.get('title', '')[:30]}")
            
            self.ui.draw_menu(items, selected, 10, 11)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    self.start_scheduled_posts()
                elif selected == 1:
                    self.stop_scheduled_posts()
                elif selected == 2:
                    self.add_scheduled_post()
                elif selected == 3:
                    self.manage_scheduled_posts()
                elif selected == 4:
                    return
    
    def start_scheduled_posts(self):
        """启动定时发帖"""
        if self.scheduled_post_running:
            return
        
        if not self.check_user_config():
            self.ui.draw_text(10, 15, "请先在设置中配置论坛账号！")
            time.sleep(2)
            return
        
        self.scheduled_post_running = True
        thread = threading.Thread(target=self._scheduled_post_loop, daemon=True)
        thread.start()
        self.ui.draw_text(10, 15, "定时发帖已启动！")
        time.sleep(1)
    
    def stop_scheduled_posts(self):
        """停止定时发帖"""
        self.scheduled_post_running = False
        self.ui.draw_text(10, 15, "定时发帖已停止！")
        time.sleep(1)
    
    def add_scheduled_post(self):
        """添加定时帖子"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 18, "添加定时帖子")
        
        self.ui.draw_text(10, 5, "板块ID:")
        forum_id = self.ui.input_text(10, 6, "ID: ")
        if not forum_id or not forum_id.isdigit():
            return
        
        self.ui.draw_text(10, 8, "帖子主题:")
        topic = self.ui.input_text(10, 9, "主题: ")
        if not topic:
            return
        
        self.ui.draw_text(10, 11, "发帖时间 (HH:MM，多个时间用逗号分隔):")
        times = self.ui.input_text(10, 12, "时间: ")
        if not times:
            return
        
        time_list = [t.strip() for t in times.split(",")]
        
        post_config = {
            "forum_id": int(forum_id),
            "topic": topic,
            "times": time_list,
            "title": "",
            "content": ""
        }
        
        self.config.config['scheduled_posts']['posts'].append(post_config)
        self.config.save()
        
        self.ui.draw_text(10, 15, "定时帖子已添加！")
        time.sleep(1)
    
    def manage_scheduled_posts(self):
        """管理定时帖子"""
        posts = self.config.config['scheduled_posts']['posts']
        if not posts:
            self.ui.draw_text(10, 15, "暂无定时帖子！")
            time.sleep(1)
            return
        
        items = [f"{i+1}. {p.get('topic', '')[:30]}" for i, p in enumerate(posts)]
        items.append("返回")
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 15, "管理定时帖子")
            self.ui.draw_menu(items, selected, 10, 5)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == len(items) - 1:
                    return
                else:
                    self.edit_scheduled_post(selected)
    
    def edit_scheduled_post(self, index):
        """编辑定时帖子"""
        post = self.config.config['scheduled_posts']['posts'][index]
        items = ["修改时间", "修改主题", "删除", "返回"]
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 60, 12, "编辑定时帖子")
            self.ui.draw_text(10, 5, f"主题: {post.get('topic', '')}")
            self.ui.draw_text(10, 6, f"时间: {', '.join(post.get('times', []))}")
            self.ui.draw_menu(items, selected, 10, 8)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    times = self.ui.input_text(10, 10, "新时间: ", ",".join(post.get('times', [])))
                    if times:
                        post['times'] = [t.strip() for t in times.split(",")]
                        self.config.save()
                elif selected == 1:
                    topic = self.ui.input_text(10, 10, "新主题: ", post.get('topic', ''))
                    if topic:
                        post['topic'] = topic
                        self.config.save()
                elif selected == 2:
                    del self.config.config['scheduled_posts']['posts'][index]
                    self.config.save()
                    return
                elif selected == 3:
                    return
    
    def _scheduled_post_loop(self):
        """定时发帖循环"""
        while self.scheduled_post_running:
            try:
                now = datetime.now().strftime("%H:%M")
                for post in self.config.config['scheduled_posts']['posts']:
                    if now in post.get('times', []):
                        self.ui.draw_text(10, 20, f"准备发帖: {post.get('topic', '')}")
                        time.sleep(60)
            except Exception as e:
                self.ui.draw_text(10, 20, f"定时发帖错误: {str(e)}")
                time.sleep(60)
    
    def settings_menu(self):
        """设置菜单"""
        items = [
            "1. 论坛账号设置",
            "2. API 配置",
            "3. 服务器配置",
            "4. Token 限制设置",
            "5. 提示词设置",
            "6. 返回"
        ]
        selected = 0
        
        while True:
            self.ui.clear()
            self.ui.draw_box(5, 2, 50, 15, "设置")
            self.ui.draw_menu(items, selected, 10, 5)
            
            key = self.ui.get_key()
            if key == "UP":
                selected = (selected - 1) % len(items)
            elif key == "DOWN":
                selected = (selected + 1) % len(items)
            elif key == "ENTER":
                if selected == 0:
                    self.account_settings()
                elif selected == 1:
                    self.api_settings()
                elif selected == 2:
                    self.server_settings()
                elif selected == 3:
                    self.token_settings()
                elif selected == 4:
                    self.prompt_settings()
                elif selected == 5:
                    return
    
    def account_settings(self):
        """账号设置"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 12, "论坛账号设置")
        
        user = self.ui.input_text(10, 5, "用户名: ", self.config.config["forum_user"])
        if user is not None:
            self.config.config["forum_user"] = user
        
        pwd = self.ui.input_text(10, 7, "密码: ", self.config.config["forum_password"])
        if pwd is not None:
            self.config.config["forum_password"] = pwd
        
        self.config.save()
        self.ui.draw_text(10, 10, "账号设置已保存！")
        time.sleep(1)
    
    def api_settings(self):
        """API 设置"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 15, "API 配置")
        
        self.ui.draw_text(10, 5, f"当前 API Base: {self.config.config['api_base']}")
        self.ui.draw_text(10, 6, f"当前模型: {self.config.config['model']}")
        
        api_base = self.ui.input_text(10, 8, "API Base: ", self.config.config["api_base"])
        if api_base is not None:
            self.config.config["api_base"] = api_base
        
        model = self.ui.input_text(10, 9, "模型: ", self.config.config["model"])
        if model is not None:
            self.config.config["model"] = model
        
        api_key = self.ui.input_text(10, 11, "API Key: ", self.config.config["api_key"])
        if api_key is not None:
            self.config.config["api_key"] = api_key
        
        self.config.save()
        self.init_clients()
        self.ui.draw_text(10, 13, "API 配置已保存！")
        time.sleep(1)
    
    def server_settings(self):
        """服务器设置"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 10, "服务器配置")
        
        server = self.ui.input_text(10, 5, "服务器地址: ", self.config.config["server"])
        if server is not None:
            self.config.config["server"] = server
            self.forum_api = ForumAPI(self.config.config)
        
        self.config.save()
        self.ui.draw_text(10, 8, "服务器配置已保存！")
        time.sleep(1)
    
    def token_settings(self):
        """Token 设置"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 15, "Token 限制设置")
        
        ctx = self.ui.input_text(10, 5, "最大上下文 Token: ", str(self.config.config["max_context_tokens"]))
        if ctx and ctx.isdigit():
            self.config.config["max_context_tokens"] = int(ctx)
        
        reply = self.ui.input_text(10, 7, "单次回复最大 Token: ", str(self.config.config["max_reply_tokens"]))
        if reply and reply.isdigit():
            self.config.config["max_reply_tokens"] = int(reply)
        
        post = self.ui.input_text(10, 9, "单个发帖最大 Token: ", str(self.config.config["max_post_tokens"]))
        if post and post.isdigit():
            self.config.config["max_post_tokens"] = int(post)
        
        self.config.save()
        self.init_clients()
        self.ui.draw_text(10, 12, "Token 设置已保存！")
        time.sleep(1)
    
    def prompt_settings(self):
        """提示词设置"""
        self.ui.clear()
        self.ui.draw_box(5, 2, 60, 12, "提示词设置")
        
        self.ui.draw_text(10, 5, "当前提示词:")
        self.ui.draw_text(10, 6, self.config.config["system_prompt"][:50])
        
        prompt = self.ui.input_text(10, 8, "新提示词: ", self.config.config["system_prompt"])
        if prompt is not None:
            self.config.config["system_prompt"] = prompt
            self.config.save()
            self.init_clients()
            self.ui.draw_text(10, 10, "提示词已保存！")
            time.sleep(1)
    
    def run(self):
        """运行主程序"""
        if not self.check_user_config():
            self.setup_wizard()
        else:
            self.init_clients()
        
        self.main_menu()


if __name__ == "__main__":
    app = AIForumAssistant()
    app.run()