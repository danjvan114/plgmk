import base64
import secrets
import time
import threading
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAQbExCzbpaLJn8hq1eKhnmfSEkHHrwVbjb2dCcomHrOzbgyyoxkB17C4F5nJOd8FwINlvf3gSWamW0DgbpN70XomC6AOzwRF6w1H+3pLm2EQ0zllJa8mGSqdDVBYxjUfryL0WRs0ulTaT+n+Cv6F5twkaFziVFaYiJmQOZBDzUQIDAQAB
-----END PUBLIC KEY-----"""

class InviteCodeManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance
    
    def _init(self):
        self._current_code = None
        self._encrypted_code = None
        self._code_timestamp = 0
        self._refresh_interval = 15 * 60
        self._generate_new_code()
        self._start_auto_refresh()
    
    def _generate_new_code(self):
        try:
            print(f"[邀请码] 开始生成新邀请码...")
            plain_code = secrets.token_urlsafe(8).upper()
            print(f"[邀请码] 明文邀请码: {plain_code}")
            
            encrypted_code = self._encrypt_code(plain_code)
            print(f"[邀请码] 加密成功")
            
            self._current_code = plain_code
            self._encrypted_code = encrypted_code
            self._code_timestamp = time.time()
            
            print(f"[邀请码] 新邀请码已生成: {plain_code}")
            print(f"[邀请码] 加密邀请码: {encrypted_code[:50]}...")
        except Exception as e:
            print(f"[邀请码] 生成失败: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _encrypt_code(self, plain_code):
        public_key = serialization.load_pem_public_key(
            PUBLIC_KEY_PEM.encode('utf-8'),
            backend=default_backend()
        )
        
        plain_bytes = plain_code.encode('utf-8')
        encrypted = public_key.encrypt(
            plain_bytes,
            padding.PKCS1v15()
        )
        
        return base64.b64encode(encrypted).decode('utf-8')
    
    def _start_auto_refresh(self):
        def refresh_loop():
            while True:
                time.sleep(self._refresh_interval)
                self._generate_new_code()
        
        refresh_thread = threading.Thread(target=refresh_loop, daemon=True)
        refresh_thread.start()
        print(f"[邀请码] 自动刷新已启动，间隔: {self._refresh_interval}秒")
    
    def get_encrypted_code(self):
        with self._lock:
            elapsed = time.time() - self._code_timestamp
            if elapsed >= self._refresh_interval:
                self._generate_new_code()
            
            return {
                'encrypted_code': self._encrypted_code,
                'plain_code': self._current_code,
                'expires_at': self._code_timestamp + self._refresh_interval,
                'refresh_interval': self._refresh_interval
            }
    
    def verify_code(self, input_code):
        with self._lock:
            elapsed = time.time() - self._code_timestamp
            if elapsed >= self._refresh_interval:
                return False, '邀请码已过期，请刷新页面获取新的邀请码'
            
            if input_code.strip().upper() == self._current_code:
                return True, '验证成功'
            else:
                return False, '邀请码错误'

_invite_manager = None

def get_invite_manager():
    global _invite_manager
    if _invite_manager is None:
        _invite_manager = InviteCodeManager()
    return _invite_manager