"""
Zabbix host-level information.
"""
from typing import List
import requests
import os
import httpx
import asyncio
from datetime import datetime

from loguru import logger
import dotenv

dotenv.load_dotenv()

from mcp.server.fastmcp import FastMCP

AUTH_URL = os.environ.get("ZABBIX_SERVER_URL", "")

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

mcp = FastMCP("zabbix")

@mcp.tool()
async def get_zabbix_host_list() -> str:
    """
    Retrieve a list of all host names from Zabbix
    
    Args:
        None
    """
    host_post = {
        "jsonrpc": "2.0",
        "method": "host.get",
        "params": {
            "output": ["host", "name"],
        },
        "id": 2,
        "auth": auth_token
    }
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(AUTH_URL, json=host_post)
            response.raise_for_status()
            result = response.json().get("result", [])
            logger.info(f"HOST LIST RESULT: {result}")
            host_names = [host["name"] for host in result]
            return str(host_names)
    except Exception as e:
        logger.error(f"Error retrieving host list: {str(e)}")
        return ""

    
@mcp.tool()
async def get_zabbix_host_items(host_name: str) -> str:
    """
    Retrieve a host's all Zabbix items and their names & descriptions.
    
    Args:
        host_name[str]: The name of the host to retrieve items for
    
    Returns:
        A list of dictionaries containing item details including itemid, name, and key_
    """
    # First get the hostid using the host name
    host_post = {
        "jsonrpc": "2.0",
        "method": "host.get",
        "params": {
            "output": ["hostid", "host", "name"],
            # Search in both host and name fields
            "search": {
                "host": host_name,
                "name": host_name
            },
            "searchByAny": True
        },
        "id": 4,
        "auth": auth_token
    }
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            # Log the request we're making
            logger.info(f"Searching for host with name or host value: {host_name}")
            
            response = await client.post(AUTH_URL, json=host_post)
            response.raise_for_status()
            hosts = response.json().get("result", [])
            
            if not hosts:
                logger.error(f"No hosts found matching: {host_name}")
                return f"Host not found"
            
            # Log what we found
            logger.info(f"Found hosts: {[(h.get('host'), h.get('name')) for h in hosts]}")
                
            hostid = hosts[0]["hostid"]
            
            items_post = {
                "jsonrpc": "2.0",
                "method": "item.get",
                "params": {
                    "hostids": hostid,
                    "output": ["itemid", "name", "description"]
                },
                "id": 5,
                "auth": auth_token
            }
            
            response = await client.post(AUTH_URL, json=items_post)
            response.raise_for_status()
            items = response.json().get("result", [])
            result = [{
                "itemid": item.get("itemid", ""),
                "name": item.get("name", ""),
                "description": item.get("description", "")
            } for item in items]
            logger.info(f"Found items: {result}")
            return str(result)
    except Exception as e:
        return ""

@mcp.tool()
async def get_zabbix_host_memory_utilization(
    host_name: str,
    time_from: int | None = None,
    time_to: int | None = None
) -> str:
    """
    Retrieve memory utilization of a host from Zabbix in a time range (time_from: int, time_to: int)
    
    Args:
        host_name[str]: The name of the host to retrieve memory utilization for
        time_from[int]: The start time of the time range in Unix timestamp (defaults to 1 hour ago if None)
        time_to[int]: The end time of the time range in Unix timestamp (defaults to current time if None)
        
    Returns:
        A string representation of memory utilization data points in the specified time range
    """
    logger.info(f"Getting memory utilization for host: {host_name}")
    logger.info(f"Time from: {time_from}")
    logger.info(f"Time to: {time_to}")
    # Set default time range (past 1 hour to now) if not provided
    current_time = int(datetime.now().timestamp())
    one_hour_ago = current_time - 3600  # 3600 seconds = 1 hour
    
    # Use provided values or defaults
    actual_time_from = time_from if time_from is not None else one_hour_ago
    actual_time_to = time_to if time_to is not None else current_time
    
    # Time range info to prepend to result
    time_range_info = f"Time range: {datetime.fromtimestamp(actual_time_from).strftime('%Y-%m-%d %H:%M:%S')} to {datetime.fromtimestamp(actual_time_to).strftime('%Y-%m-%d %H:%M:%S')}"
    
    
    logger.info(f"Time range info: {time_range_info}")
    logger.info(f"host name type: {type(host_name)}")
    # First get the hostid using the host name
    host_post = {
        "jsonrpc": "2.0",
        "method": "host.get",
        "params": {
            "output": ["hostid", "host", "name"],
            # Search in both host and name fields
            "search": {
                "host": host_name,
                "name": host_name
            },
            "searchByAny": True
        },
        "id": 4,
        "auth": auth_token
    }
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            # Log the request we're making
            logger.info(f"Searching for host with name or host value: {host_name}")
            
            response = await client.post(AUTH_URL, json=host_post)
            response.raise_for_status()
            hosts = response.json().get("result", [])
            logger.info(f"Hosts: {hosts}")
            if not hosts:
                logger.error(f"No hosts found matching: {host_name}")
                return f"{time_range_info}\nHost not found"
            
            # Log what we found
            logger.info(f"Found hosts: {[(h.get('host'), h.get('name')) for h in hosts]}")
                
            hostid = hosts[0]["hostid"]
            
            items_post = {
                "jsonrpc": "2.0",
                "method": "item.get",
                "params": {
                    "hostids": hostid,
                    "output": ["itemid", "name", "description"]
                },
                "id": 5,
                "auth": auth_token
            }
            
            response = await client.post(AUTH_URL, json=items_post)
            response.raise_for_status()
            items = response.json().get("result", [])
            
            if not items:
                return f"{time_range_info}\nNo items found for this host"
            
            # Find the memory utilization item
            memory_items = [item for item in items if item.get("name") == "Memory utilization"]
            
            if not memory_items:
                return f"{time_range_info}\nMemory utilization item not found for this host"
                
            itemid = memory_items[0]["itemid"]
            
            history_post = {
                "jsonrpc": "2.0",
                "method": "history.get",
                "params": {
                    "output": "extend",
                    "itemids": itemid,
                    "time_from": actual_time_from,
                    "time_till": actual_time_to,
                    "sortfield": "clock",
                    "sortorder": "ASC",
                    "history": 0
                },
                "id": 6,
                "auth": auth_token
            }
            
            response = await client.post(AUTH_URL, json=history_post)
            response.raise_for_status()
            history = response.json().get("result", [])
            
            if not history:
                return f"{time_range_info}\nNo memory utilization data found in the specified time range"
                
            # Format the result as a list of timestamp-value pairs
            result = [{"timestamp": point["clock"], "value": point["value"]} for point in history]
            return f"{time_range_info}\n{str(result)}"
    except Exception as e:
        return f"{time_range_info}\nError retrieving memory utilization: {str(e)}"

# print(asyncio.run(get_host_list_on_zabbix()))
# print(asyncio.run(get_host_infomation_on_zabbix("KLB-DGX-076-Agent")))
# print(asyncio.run(get_zabbix_host_items("KLB-DGX-076-Agent")))
print(asyncio.run(get_zabbix_host_memory_utilization("KLB-DGX-076-Agent")))

if __name__ == "__main__":
    print("Starting zabbix server")
    mcp.run(transport='stdio')
    
