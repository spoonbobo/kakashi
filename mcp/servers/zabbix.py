import requests
import urllib3
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("zabbix")

ZABBIX_API_BASE = "https://10.33.80.21/api_jsonrpc.php"
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_zabbix_auth_token(username: str, password: str) -> str:
    auth_post = {
        "jsonrpc": "2.0",
        "method": "user.login",
        "params": {
            "username": username,
            "password": password
        },
        "id": 1,
        "auth": None
    }

    response = requests.post(ZABBIX_API_BASE, json=auth_post, verify=False).json()
    auth_token = response.get("result", None)
    return auth_token


# if __name__ == "__main__":
#     mcp.run(transport='stdio')
