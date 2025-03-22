AUTH_URL = "https://10.33.80.21/api_jsonrpc.php"

auth_post = {
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
        "username": os.environ.get("ZABBIX_USERNAME", ""),
        "password": os.environ.get("ZABBIX_PASSWORD", "")
    },
    "id": 1,
    "auth": None
}

response = requests.post(AUTH_URL, json=auth_post, verify=False).json()
auth_token = response.get("result", None)

