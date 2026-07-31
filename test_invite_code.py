#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试邀请码系统
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from libs.invite_code import invite_manager

def test_invite_code():
    print("=" * 50)
    print("测试邀请码系统")
    print("=" * 50)
    
    print("\n1. 获取加密的邀请码...")
    code_info = invite_manager.get_encrypted_code()
    print(f"   加密邀请码: {code_info['encrypted_code'][:50]}...")
    print(f"   过期时间: {code_info['expires_at']}")
    print(f"   刷新间隔: {code_info['refresh_interval']}秒")
    
    print("\n2. 验证正确的邀请码...")
    is_valid, message = invite_manager.verify_code(invite_manager._current_code)
    print(f"   结果: {is_valid}, {message}")
    
    print("\n3. 验证错误的邀请码...")
    is_valid, message = invite_manager.verify_code("WRONG_CODE")
    print(f"   结果: {is_valid}, {message}")
    
    print("\n" + "=" * 50)
    print("测试完成!")
    print("=" * 50)

if __name__ == "__main__":
    test_invite_code()