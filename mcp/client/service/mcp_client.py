import os
import dotenv

dotenv.load_dotenv()
print(os.getenv("LLM_PROVIDER"))
print(os.getenv("LLM_MODEL"))

class MCPClient:
    """
    A MCP client for a room, managed by MCP client manager.

    It contains:
    bypasser, publisher, 
    connections: host connection, mcp servers
    """
    pass
