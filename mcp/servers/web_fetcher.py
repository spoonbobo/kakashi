from mcp.server.fastmcp import FastMCP
import aiohttp
import os
from pathlib import Path
from urllib.parse import urlparse

mcp = FastMCP("web_fetcher")

@mcp.tool()
async def download_file_from_internet(url: str, destination_path: str) -> str:
    """
    Downloads a file from the internet and saves it to the specified path.
    
    Args:
        url: The URL to download from
        destination_path: Where to save the file on disk
        
    Returns:
        The absolute path where the file was saved
    """
    destination = Path(destination_path)
    
    # Check if destination is a directory
    if destination.is_dir():
        # Extract filename from URL if destination is a directory
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename:
            filename = "downloaded_file"
        destination = destination / filename
    
    os.makedirs(destination.parent, exist_ok=True)
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download: HTTP {response.status}")
            
            with open(destination, 'wb') as f:
                while True:
                    chunk = await response.content.read(1024)
                    if not chunk:
                        break
                    f.write(chunk)
    
    return f"Downloaded file to {str(destination.absolute())}"

if __name__ == "__main__":
    # Initialize and run the server
    print("Starting web fetcher server")
    mcp.run(transport='stdio')