import os
from typing import List, Dict

from loguru import logger
import numpy as np
from ollama import Client
from scipy.spatial.distance import cdist

class Bypasser:
    """
    Bypass a room's query to a specfic mcp server.
    """

    bypass_prompt = """
    You are a helpful assistant that can find a assistant to answer a user's query based on a room's conversation
    
    You will be given a conversation history and a list of assistant descriptions.
    You will need to determine which assistant to answer the user's query.
    
    The conversation history is: {conversation_history}
    The user's query is: {user_query}
    Given the following assistant descriptions,
    {server_descriptions}
    
    determine which assistant to answer the user's query, summarize the chosen assistant's capabilities, 
    and explain why you chose that assistant.
    """
    def __init__(
        self, servers
        ):
        self.servers = servers
        self.server_names = list(self.servers.keys())
        self.server_descriptions_dict: Dict[str, str] = {}
        self.ollama_client = Client(host=os.getenv("OLLAMA_API_BASE_URL"))
        self.ollama_model = os.getenv("BYPASSER_MODEL", "")
        self.embed_model = os.getenv("EMBED_MODEL", "")

        for server in self.servers:
            self.server_descriptions_dict[server] = self.load_server_description(self.servers[server]["description"])

        self.server_embeddings = self.embed_server_descriptions()
        self.server_descriptions_str = self.format_server_descriptions()

    def embed_server_descriptions(self) -> np.ndarray:
        embeddings = []
        for server_name in self.server_names:
            description = self.server_descriptions_dict[server_name]
            embedding = self.ollama_client.embed(
                model=self.embed_model,
                input=description
            )
            embeddings.append(np.array(embedding.embeddings[0], dtype=np.float32))
        return np.array(embeddings)

    def load_server_description(self, server: str) -> str:
        with open(server, 'r') as file:
            return file.read()

    def format_server_descriptions(self) -> str:
        return "\n" + "\n".join([
            f"Server {idx + 1}: {server}\n=================\n{self.server_descriptions_dict[server]}\n" 
            for idx, server in enumerate(self.server_names)])

    async def bypass(self, messages: List[Dict[str, str]], query: str) -> str:
        prompt = self.bypass_prompt.format(
            conversation_history=messages,
            user_query=query,
            server_descriptions=self.server_descriptions_str
        )
        
        response = self.ollama_client.chat(
            model=self.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        
        response_embedding = self.ollama_client.embed(
            model=self.embed_model,
            input=response.message.content # type: ignore
        )
        
        response_embeddings = np.array(response_embedding.embeddings[0], dtype=np.float32).reshape(1, -1)
        
        server_embeddings_array = self.server_embeddings
        distances = cdist(response_embeddings, server_embeddings_array, 'euclidean')
        selected_server = self.server_names[np.argmin(distances)]
        
        return selected_server


class Planner:
    """
    """
    pass
