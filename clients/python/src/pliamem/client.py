import os
import requests
from typing import Dict, Any, List, Optional
from .exceptions import PliamemAPIError

class PliamemClient:
    def __init__(self, base_url: str = "http://127.0.0.1:3000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or os.environ.get("PLIAMEM_API_KEY")
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def search(self, query: str, layer: Optional[str] = None, top: Optional[int] = None, recent: bool = False) -> List[Dict[str, Any]]:
        """Search across memory layers."""
        params = {"query": query}
        if layer: params["layer"] = layer
        if top: params["top"] = top
        if recent: params["recent"] = "true"

        response = self.session.get(f"{self.base_url}/v1/search", params=params)
        
        if response.status_code != 200:
            raise PliamemAPIError(f"Search failed: {response.text}")
            
        return response.json().get("results", [])

    def ask(self, query: str) -> Dict[str, Any]:
        """Ask the AI a question based on memory context."""
        params = {"query": query}
        response = self.session.get(f"{self.base_url}/v1/ask", params=params)
        
        if response.status_code != 200:
            raise PliamemAPIError(f"Ask failed: {response.text}")
            
        return response.json()

    def status(self) -> Dict[str, Any]:
        """Get the status of all memory layers."""
        response = self.session.get(f"{self.base_url}/v1/status")
        if response.status_code != 200:
            raise PliamemAPIError(f"Status check failed: {response.text}")
        return response.json().get("status", {})
