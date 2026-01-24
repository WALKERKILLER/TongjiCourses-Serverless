# 加密部分

import configparser # 读取配置文件
import requests # 网络请求
from Crypto.PublicKey import RSA # RSA 加密
from Crypto.Cipher import PKCS1_v1_5 # RSA 加密
# from Crypto.Cipher import AES # AES 加密
import base64 # base64 编码
# from urllib.parse import quote_plus

# 读取配置文件

CONFIG = configparser.ConfigParser()
try:
    CONFIG.read('config.ini', encoding='utf-8')
except UnicodeDecodeError:
    # Windows 默认编码可能是 gbk；兼容旧配置文件编码
    CONFIG.read('config.ini', encoding='gbk')

# 账号密码认证部分
STU_NO = CONFIG['Account']['sno']
STU_PWD = CONFIG['Account']['passwd']

# ----- 登录部分 ----- #

# 读取 RSA 公钥
def getRSAPublicKey(js_url):
    # js_url = RSA_URL

    s = requests.Session()
    s.trust_env = False
    response = s.get(
        js_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        },
        timeout=60,
    )

    # 从 js 文件中提取公钥
    content = response.text
    for line in content.split('\n'):
        if 'encrypt.setPublicKey' in line and not line.strip().startswith('//'):
            public_key = line.split("'")[1] # Extract key between single quotes
            public_key = "-----BEGIN PUBLIC KEY-----\n" + public_key + "\n-----END PUBLIC KEY-----"
            return public_key
    return None

# 从 HTML 中读取 spAuthChainCode，一行形如 $("#spAuthChainCode1").val('4c1eb8ec14fa4e8ba0f31188dbf88cdd');
def getspAuthChainCode(response_text):
    for line in response_text.split('\n'):
        if '\"#spAuthChainCode1"' in line:
            return line.split("'")[1]
        
    return None
    
# 把密码用 RSA 加密，公钥是 auth_key
# 原始密码(str) -> 字节串(bytes) -> RSA加密(bytes) -> base64编码(bytes) -> 最终字符串(str)
def encryptPassword(js_url):
    auth_key = getRSAPublicKey(js_url)

    public_key = RSA.import_key(auth_key)

    cipher = PKCS1_v1_5.new(public_key)

    crypto = cipher.encrypt(STU_PWD.encode())

    crypto = base64.b64encode(crypto)
    
    return crypto.decode()
