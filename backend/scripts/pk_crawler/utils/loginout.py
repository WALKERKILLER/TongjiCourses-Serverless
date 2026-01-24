import requests
from . import myEncrypt
from urllib.parse import urlencode
import json
import time
import xml.etree.ElementTree as ET

from . import imap_email
import configparser

CONFIG = configparser.ConfigParser()
try:
    CONFIG.read("config.ini", encoding="utf-8")
except UnicodeDecodeError:
    # Windows 默认编码可能是 gbk；兼容旧配置文件编码
    CONFIG.read("config.ini", encoding="gbk")

# 加强认证（可选：仅在触发“加强认证验证码通知”时需要）
IMAP_SERVER = CONFIG.get("IMAP", "server_domain", fallback="")
IMAP_PORT = CONFIG.get("IMAP", "server_port", fallback="")
IMAP_USERNAME = CONFIG.get("IMAP", "qq_emailaddr", fallback="")
IMAP_PASSWORD = CONFIG.get("IMAP", "qq_grantcode", fallback="")

# 登录
def login():
    # ----- 第一步：登录前页面 ----- #

    entry_url = "https://1.tongji.edu.cn/api/ssoservice/system/loginIn"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Referer': 'https://1.tongji.edu.cn/',
    }

    session = requests.Session()
    # Avoid picking up proxy env vars (common in CI) which can break SSO/login flows.
    session.trust_env = False
    session.headers.update(headers)
    response = session.get(entry_url)

    # 获取 authnLcKey
    authnLcKey = response.url.split('=')[-1] # 从 URL 中提取 authnLcKey，从后往前找到第一个等号，取等号后的部分
    # print(authnLcKey)

    # ----- 第二步：ActionAuthChain ----- #

    # 获取 RSA 公钥所在 js 文件的链接
    for line in response.text.split('\n'):
        if 'crypt.js' in line:
            RSA_URL = "https://iam.tongji.edu.cn/idp/" + line.split('src=\"')[1].split('\"')[0]
            print(RSA_URL)

    CHAIN_URL = response.url

    SP_AUTH_CHAIN_CODE = myEncrypt.getspAuthChainCode(response.text)

    login_data = urlencode({
        "j_username": myEncrypt.STU_NO,
        "j_password": myEncrypt.encryptPassword(RSA_URL),
        "j_checkcode": "请输入验证码",
        "op": "login",
        "spAuthChainCode": SP_AUTH_CHAIN_CODE, # 似乎是个固定值，写死在页面的 
        "authnLcKey": authnLcKey,
    })

    # 发送登录请求
    session.headers.update(
        {
            # 'Referer': response.url, # 设置 Referer
            # 'Host': 'iam.tongji.edu.cn', # 设置 Host
            'Origin': 'https://iam.tongji.edu.cn', # 设置 Origin
            'Content-Length': str(len(login_data)), # 设置 Content-Length
            'Content-Type': 'application/x-www-form-urlencoded', # 设置 Content-Type
        }
    )
    response = session.post(CHAIN_URL, data=login_data, allow_redirects=False)

    # ----- 第 2.5 步 加强认证 ----- #

    is_enhance = False  # Flag

    # 检查是否需要加强认证
    response_xml = ET.fromstring(response.text)  # 虽然是 json，但是本质是 XML 格式

    print(response.text)
    # input()

    if response_xml.find('loginFailed').text != 'false':
        is_enhance = True  # 是加强认证

        if not (IMAP_SERVER and IMAP_PORT and IMAP_USERNAME and IMAP_PASSWORD):
            raise Exception("触发加强认证：请在 config.ini 的 [IMAP] 中配置邮箱 IMAP 信息以自动读取验证码")

        # 发送验证码
        veri_data = urlencode({
            "j_username": myEncrypt.STU_NO,
            "type": "email" #  邮箱是 email，短信是 sms
        })  # 格式是 form_data

        session.post("https://iam.tongji.edu.cn/idp/sendCheckCode.do",
                        data=veri_data, allow_redirects=False)

        sleep_time = 30
        failed_time = 0

    while True:
        try:
            if is_enhance:
                time.sleep(sleep_time)  # 等待 30 秒

                with imap_email.EmailVerifier(IMAP_USERNAME, IMAP_PASSWORD, IMAP_SERVER, IMAP_PORT) as v:
                    code = v.get_latest_verification_code()
                    if code:
                        print(code)
                    else:
                        raise Exception("登录失败！未找到验证码")

                login_data = urlencode({
                "j_username": myEncrypt.STU_NO,
                "type": "email",
                "sms_checkcode": code,
                "popViewException": "Pop2",
                "j_checkcode": "请输入验证码",
                "op": "login",
                "spAuthChainCode": SP_AUTH_CHAIN_CODE, # 似乎是个固定值，写死在页面的
                })

                response = session.post(CHAIN_URL, data=login_data, allow_redirects=False)

            # ----- 第三步：AuthnEngine ----- #

            if is_enhance:
                auth_url = "https://iam.tongji.edu.cn/idp/AuthnEngine?currentAuth=urn_oasis_names_tc_SAML_2.0_ac_classes_SMSUsernamePassword&authnLcKey=" + authnLcKey + "&entityId=SYS20230001"
            else:  # Not enhance
                auth_url = "https://iam.tongji.edu.cn/idp/AuthnEngine?currentAuth=urn_oasis_names_tc_SAML_2.0_ac_classes_BAMUsernamePassword&authnLcKey=" + authnLcKey + "&entityId=SYS20230001"

            response = session.post(auth_url, data=login_data, allow_redirects=False)

            # ----- 第四步：SSO 登录 ----- #

            sso_url = response.headers['Location']
            
            # 有必要更新 headers
            sso_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            }
            
            session.headers.clear() # 记得清空 headers，因为有 Content-Type 等不需要的字段
            session.headers.update(sso_headers)

            response = session.get(sso_url, allow_redirects=False)

            # ----- 第五步：LoginIn code & state----- #

            loginIn_url = response.headers['Location']  # 如果给的验证码不正确, 这里不会有 Location 属性

            response = session.get(loginIn_url, allow_redirects=False)

            break
        except Exception as e:
            print(f"发生异常{e}，继续")
            sleep_time = 10 + 5 * failed_time
            failed_time += 1

            if failed_time > 5:
                print("登录失败，尝试次数过多")
                return None
    

    # ----- 第六步：ssologin token----- #

    ssologin_url = response.headers['Location']

    response = session.get(ssologin_url, allow_redirects=False)

    # ----- 第七步：转 HTTPS ----- #

    https_url = response.headers['Location']

    response = session.get(https_url, allow_redirects=False)

    global AES_URL

    # 提取 AES 公钥的链接
    for line in response.text.split('>'): # 混淆过的，没有换行符
        if '/static/js/app.' in line:
            # print(line)
            AES_URL = "https://1.tongji.edu.cn" + line.split('src=')[1].split('>')[0] # 提取链接 
            print(AES_URL)


    # ----- 第八步：https://1.tongji.edu.cn/api/sessionservice/session/login ----- #

    login_url = "https://1.tongji.edu.cn/api/sessionservice/session/login"

    # 准备数据，提取 ssologin 链接中的参数
    url_params = ssologin_url.split('?')[1].split('&') # 先用 ? 分割，再用 & 分割
    login_req_body = {
        "token": url_params[0].split('=')[1], # 用 = 分割
        "ts": url_params[2].split('=')[1],
        "uid": url_params[1].split('=')[1]
    }

    # 发送请求

    response = session.post(login_url, data=login_req_body)

    # 打印结果
    if response.status_code == 200:
            print("登录成功！")
            # 不要在日志里输出完整 cookies（包含敏感 session），只输出 cookie 名称用于调试
            try:
                names = list(session.cookies.get_dict().keys())
            except Exception:
                names = []
            print("Cookies captured:", ",".join(names) if names else "(none)")
            return session
    else:
        print("登录失败！")
        return None



def logout(session):
    logout_data = {
        "sessionid": session.cookies.get_dict()['sessionid'],
        "uid": myEncrypt.STU_NO
    }

    logout_data = json.dumps(logout_data, separators=(",", ":"))

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://1.tongji.edu.cn/',        
        'Referer': 'https://1.tongji.edu.cn/workbench',        
        "Content-Type": "application/json",
        "Content-Length": str(len(logout_data),),
    }

    session.headers.update(headers)

    print(headers)

    response = session.post("https://1.tongji.edu.cn/api/sessionservice/session/logout", data=logout_data)

    if (response.status_code == 200):
        print("退出登录成功！")
    else:
        print("退出登录失败！")
        print("状态码：", response.status_code)
