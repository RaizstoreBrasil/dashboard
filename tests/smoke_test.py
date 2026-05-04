import os
from pathlib import Path

from fastapi.testclient import TestClient

from main import app


def test_agent_run_lifecycle():
    db_path = Path("data/test_smoke.db")
    if db_path.exists():
        db_path.unlink()
    os.environ["DATABASE_PATH"] = str(db_path)

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["ok"] is True

        xavier = client.get("/xavier")
        assert xavier.status_code == 200
        assert "Xavier" in xavier.text

        agent_response = client.post(
            "/agents",
            json={
                "workspace_id": 1,
                "name": "Agente Teste",
                "system_prompt": "Responda de forma objetiva.",
                "model": "gpt-4.1-mini",
                "temperature": 0.2,
                "status": "active",
            },
        )
        assert agent_response.status_code == 200
        agent = agent_response.json()

        run_response = client.post(
            "/tasks",
            json={"agent_id": agent["id"], "prompt": "Teste de ciclo da tarefa."},
        )
        assert run_response.status_code == 200
        task = run_response.json()
        assert task["status"] in {"queued", "completed"}

        detail_response = client.get(f"/tasks/{task['id']}")
        assert detail_response.status_code == 200
