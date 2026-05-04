import os
from typing import Any, Optional

import httpx


class EvolutionApiClient:
    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        self.base_url = (base_url or os.getenv("EVOLUTION_API_URL", "")).rstrip("/")
        self.api_key = api_key or os.getenv("EVOLUTION_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def create_instance(self, instance_name: str) -> dict[str, Any]:
        return await self._post(
            "/instance/create",
            {
                "instanceName": instance_name,
                "qrcode": True,
                "integration": "WHATSAPP-BAILEYS",
            },
        )

    async def connect_instance(self, instance_name: str) -> dict[str, Any]:
        return await self._get(f"/instance/connect/{instance_name}")

    async def connection_state(self, instance_name: str) -> dict[str, Any]:
        return await self._get(f"/instance/connectionState/{instance_name}")

    async def logout_instance(self, instance_name: str) -> dict[str, Any]:
        return await self._delete(f"/instance/logout/{instance_name}")

    async def send_text(self, instance_name: str, number: str, text: str) -> dict[str, Any]:
        return await self._post(
            f"/message/sendText/{instance_name}",
            {
                "number": number,
                "text": text,
            },
        )

    async def _get(self, path: str) -> dict[str, Any]:
        return await self._request("GET", path)

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", path, payload)

    async def _delete(self, path: str) -> dict[str, Any]:
        return await self._request("DELETE", path)

    async def _request(
        self,
        method: str,
        path: str,
        payload: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        if not self.is_configured():
            raise RuntimeError("EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured in .env")

        headers = {"apikey": self.api_key, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            if not response.content:
                return {"ok": True}
            return response.json()
