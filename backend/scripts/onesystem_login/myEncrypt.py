# 加密部分

import base64
import configparser

import requests
from Crypto.Cipher import PKCS1_v1_5
from Crypto.PublicKey import RSA

# 读取配置文件
CONFIG = configparser.ConfigParser()
try:
    CONFIG.read("config.ini", encoding="utf-8")
except UnicodeDecodeError:
    CONFIG.read("config.ini", encoding="gbk")

# 账号密码认证部分
STU_NO = CONFIG["Account"]["sno"]
STU_PWD = CONFIG["Account"]["passwd"]


def getRSAPublicKey(js_url):
    response = requests.get(
        js_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        timeout=30,
    )

    content = response.text
    for line in content.split("\n"):
        if "encrypt.setPublicKey" in line and not line.strip().startswith("//"):
            public_key = line.split("'")[1]
            public_key = "-----BEGIN PUBLIC KEY-----\n" + public_key + "\n-----END PUBLIC KEY-----"
            return public_key
    return None


def getspAuthChainCode(response_text):
    for line in response_text.split("\n"):
        if '"#spAuthChainCode1"' in line:
            return line.split("'")[1]
    return None


def encryptPassword(js_url):
    auth_key = getRSAPublicKey(js_url)
    public_key = RSA.import_key(auth_key)
    cipher = PKCS1_v1_5.new(public_key)
    crypto = cipher.encrypt(STU_PWD.encode())
    crypto = base64.b64encode(crypto)
    return crypto.decode()

