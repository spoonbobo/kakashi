import os
import dotenv

dotenv.load_dotenv()
print(os.getenv("LLM_PROVIDER"))
print(os.getenv("LLM_MODEL"))

class MCPClientManager:
    """
    Manages mcp clients for different rooms.
    """
    pass

class MCPClient:
    """
    A MCP client for a room, managed by MCP client manager.

    It contains:
    bypasser: bypass room's query to a specific mcp server
    publisher: publish message/ approval request
    mcp server connections with sessions
    """
    pass
