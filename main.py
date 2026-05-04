import os
import json
import re
import time
from datetime import datetime
import random
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import database
from agents.codex_agent import CodexAgentRunner
from agents.evolution_client import EvolutionApiClient
from models import (
    AgentCreate,
    AgentOut,
    AdminItem,
    EvolutionConfigUpdate,
    RunCreate,
    RunDetailOut,
    RunOut,
    SmartAgentCreate,
    TaskCreate,
    TaskOut,
    ToolCreate,
    ToolOut,
    WhatsAppInstanceCreate,
    WhatsAppSendCreate,
    WorkspaceCreate,
    WorkspaceOut,
)


load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    yield


app = FastAPI(
    title=os.getenv("APP_NAME", "Fabrica de Agentes IA"),
    version="0.2.0",
    lifespan=lifespan,
)

STATIC_DIR = Path(__file__).parent / "static"
XAVIER_AUDIO_DIR = STATIC_DIR / "xavier-audio"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

ultima_fala = ""


def agent_out(row: dict) -> AgentOut:
    return AgentOut(**row)


def tool_out(row: dict) -> ToolOut:
    return ToolOut(**row)


def run_out(row: dict) -> RunOut:
    return RunOut(**row)


def run_detail_out(row: dict) -> RunDetailOut:
    return RunDetailOut(**row)


def task_out(row: dict) -> TaskOut:
    return TaskOut(**row)


class XavierAudioGenerateRequest(BaseModel):
    job_id: str = Field(..., min_length=1)
    texto: str = Field(default="")
    contexto: str = Field(default="programacao")
    estilo: str = Field(default="popular")
    horario: str = Field(default="")
    evento_anterior: dict | None = None
    proximo_evento: dict | None = None
    provider: str = Field(default="mock")


class XavierMapaRequest(BaseModel):
    mapa: str = Field(default="")
    origem: str = Field(default="")


def sanitize_audio_filename(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("._-")
    return safe or "locutoria"


def build_eventlabs_payload(payload: XavierAudioGenerateRequest) -> dict:
    return {
        "jobId": payload.job_id,
        "text": payload.texto,
        "context": payload.contexto,
        "style": payload.estilo,
        "scheduledAt": payload.horario,
        "previousEvent": payload.evento_anterior,
        "nextEvent": payload.proximo_evento,
    }


def gerar_fala(tipo: str) -> str:
    global ultima_fala

    falas = {
        "COM": [
            "Voltamos com a melhor programacao!",
            "De volta com mais musica pra voce!",
            "Seguimos com a melhor da radio!",
        ],
        "HC": [
            f"Agora sao {datetime.now().strftime('%H:%M:%S')}",
            f"Hora certa pra voce: {datetime.now().strftime('%H:%M:%S')}",
        ],
    }

    lista = falas.get(tipo, [])
    if not lista:
        return ""

    fala = random.choice(lista)
    while fala == ultima_fala and len(lista) > 1:
        fala = random.choice(lista)

    ultima_fala = fala
    return fala


def write_mock_audio_file(audio_path: Path, payload: XavierAudioGenerateRequest) -> None:
    metadata = {
        "provider": "mock",
        "jobId": payload.job_id,
        "text": payload.texto,
        "context": payload.contexto,
        "style": payload.estilo,
        "scheduledAt": payload.horario,
        "previousEvent": payload.evento_anterior,
        "nextEvent": payload.proximo_evento,
        "generatedAt": time.time(),
    }
    audio_path.write_bytes(
        b"MOCK-MP3\n" + json.dumps(metadata, ensure_ascii=False, indent=2).encode("utf-8")
    )
    audio_path.with_suffix(".json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


@app.post("/xavier/audio/generate", response_model=dict)
def generate_xavier_audio(payload: XavierAudioGenerateRequest) -> dict:
    XAVIER_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{sanitize_audio_filename(payload.job_id)}.mp3"
    audio_path = XAVIER_AUDIO_DIR / filename
    audio_url = f"/static/xavier-audio/{filename}"

    if payload.provider == "eventlabs":
        eventlabs_payload = build_eventlabs_payload(payload)
        return {
            "ready": False,
            "provider": "eventlabs",
            "audioPath": audio_url,
            "audioFile": str(audio_path),
            "eventLabsPayload": eventlabs_payload,
            "message": "EventLabs integration pending. Mock file not generated.",
        }

    write_mock_audio_file(audio_path, payload)
    return {
        "ready": True,
        "provider": "mock",
        "audioPath": audio_url,
        "audioFile": str(audio_path),
        "message": "Mock MP3 generated locally.",
    }


@app.post("/mapa", response_model=dict)
def receive_mapa(payload: XavierMapaRequest) -> dict:
    mapa = payload.mapa or ""
    eventos = [item.strip() for item in mapa.split(",") if item.strip()]
    resposta = []

    if "COM" in eventos:
        fala = gerar_fala("COM")
        print("Comercial detectado")
        print("LocutorIA:", fala)
        resposta.append({"tipo": "COM", "fala": fala})

    if "HC" in eventos:
        fala = gerar_fala("HC")
        print("Hora certa detectada")
        print("LocutorIA:", fala)
        resposta.append({"tipo": "HC", "fala": fala})

    return {"eventos": resposta}


async def execute_run(run_id: int) -> None:
    run = database.get_run(run_id)
    if not run:
        return

    agent = database.get_agent(run["agent_id"])
    if not agent:
        database.update_run(
            run_id,
            status="failed",
            error="Agent not found.",
            complete=True,
        )
        return

    tools = database.get_agent_tools(agent["id"])
    runner = CodexAgentRunner()
    start = time.perf_counter()
    database.update_run(run_id, status="running")
    database.add_message(
        run_id=run_id,
        role="log",
        content=f"Run started with {len(tools)} tool(s).",
        metadata={},
    )

    try:
        result = await runner.run(agent=agent, prompt=run["input"], tools=tools)
        latency_ms = int((time.perf_counter() - start) * 1000)
        input_tokens = estimate_tokens(run["input"] + "\n" + agent["system_prompt"])
        output_tokens = estimate_tokens(result.output)
        cost = estimate_cost(model=agent["model"], input_tokens=input_tokens, output_tokens=output_tokens)

        database.add_message(
            run_id=run_id,
            role="assistant",
            content=result.output,
            metadata={"model": agent["model"]},
        )
        if result.logs:
            database.add_message(run_id=run_id, role="log", content=result.logs.rstrip(), metadata={})
        database.update_run(
            run_id,
            status="completed",
            output=result.output,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
            latency_ms=latency_ms,
            complete=True,
        )
        database.create_usage_event(
            workspace_id=run["workspace_id"],
            user_email=run.get("user_email"),
            agent_id=agent["id"],
            run_id=run_id,
            model=agent["model"],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start) * 1000)
        database.add_message(run_id=run_id, role="log", content=f"Run failed: {exc}", metadata={})
        database.update_run(
            run_id,
            status="failed",
            error=str(exc),
            latency_ms=latency_ms,
            complete=True,
        )


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def estimate_cost(*, model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = {
        "gpt-4.1-mini": (0.40, 1.60),
        "gpt-4.1": (2.00, 8.00),
        "gpt-4o-mini": (0.15, 0.60),
    }
    input_per_million, output_per_million = pricing.get(model, (0.0, 0.0))
    return round((input_tokens / 1_000_000) * input_per_million + (output_tokens / 1_000_000) * output_per_million, 6)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": os.getenv("APP_NAME", "Fabrica de Agentes IA")}


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/dashboard", include_in_schema=False)
def dashboard_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "simple.html")


@app.get("/admin", include_in_schema=False)
def admin_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "simple.html")


@app.get("/advanced", include_in_schema=False)
def advanced_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/create-agent", include_in_schema=False)
def create_agent_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/xavier", include_in_schema=False)
def xavier_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "xavier.html")


@app.get("/simple", include_in_schema=False)
def simple_admin_frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "simple.html")


@app.post("/workspaces", response_model=WorkspaceOut)
def create_workspace(payload: WorkspaceCreate) -> WorkspaceOut:
    return WorkspaceOut(**database.create_workspace(payload.name, payload.owner_email))


@app.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces() -> list[WorkspaceOut]:
    return [WorkspaceOut(**row) for row in database.list_workspaces()]


@app.post("/agents", response_model=AgentOut)
def create_agent(payload: AgentCreate) -> AgentOut:
    if not database.get_workspace(payload.workspace_id):
        raise HTTPException(status_code=404, detail="Workspace not found")

    model = payload.model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    row = database.create_agent(
        workspace_id=payload.workspace_id,
        name=payload.name,
        description=payload.description,
        system_prompt=payload.system_prompt,
        model=model,
        temperature=payload.temperature,
        status=payload.status,
        tool_ids=payload.tool_ids,
        company_id=payload.company_id,
        segment=payload.segment,
        objective=payload.objective,
        tone=payload.tone,
        products=payload.products,
        faq=payload.faq,
        service_rules=payload.service_rules,
        whatsapp_link=payload.whatsapp_link,
        initial_message=payload.initial_message,
        business_hours=payload.business_hours,
        can_do=payload.can_do,
        cannot_do=payload.cannot_do,
        instance_name=payload.instance_name,
        evolution_api_url=payload.evolution_api_url,
        evolution_api_key=payload.evolution_api_key,
    )
    return agent_out(row)


@app.get("/agents", response_model=list[AgentOut])
def list_agents(workspace_id: int | None = Query(default=None)) -> list[AgentOut]:
    return [agent_out(row) for row in database.list_agents(workspace_id)]


@app.patch("/agents/{agent_id}", response_model=AgentOut)
def update_agent(agent_id: int, payload: AdminItem) -> AgentOut:
    row = database.update_agent(agent_id, payload.data)
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_out(row)


@app.post("/agents/smart", response_model=dict)
def create_smart_agent(payload: SmartAgentCreate) -> dict:
    return database.create_smart_agent(payload.model_dump())


@app.post("/agents/generate", response_model=dict)
def generate_agent(payload: AdminItem) -> dict:
    return database.generate_agent_assets(payload.data)


@app.patch("/agents/{agent_id}/evolution", response_model=AgentOut)
def update_evolution_config(agent_id: int, payload: EvolutionConfigUpdate) -> AgentOut:
    row = database.set_agent_evolution_config(
        agent_id,
        api_url=payload.evolution_api_url,
        api_key=payload.evolution_api_key,
        instance_name=payload.instance_name,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_out(row)


def _agent_instance(agent: dict) -> str:
    instance_name = agent.get("instance_name")
    if instance_name:
        return instance_name
    return database.default_instance_name(agent["id"], agent["name"])


def _evolution_client_for_agent(agent: dict) -> EvolutionApiClient:
    return EvolutionApiClient(
        base_url=agent.get("evolution_api_url"),
        api_key=agent.get("evolution_api_key"),
    )


@app.post("/agents/{agent_id}/whatsapp/instance", response_model=dict)
async def create_whatsapp_instance(agent_id: int, payload: WhatsAppInstanceCreate) -> dict:
    agent = database.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    instance_name = payload.instance_name or _agent_instance(agent)
    client = _evolution_client_for_agent(agent)
    try:
        result = await client.create_instance(instance_name)
    except Exception as exc:
        database.set_agent_whatsapp(agent_id, instance_name=instance_name, status="error")
        raise HTTPException(status_code=502, detail=f"Evolution API error: {exc}") from exc
    qr = result.get("qrcode") or result.get("base64") or result.get("code")
    row = database.set_agent_whatsapp(
        agent_id,
        instance_name=instance_name,
        status="created",
        qr=qr if isinstance(qr, str) else None,
    )
    return {"agent": row, "evolution": result}


@app.post("/agents/{agent_id}/whatsapp/connect", response_model=dict)
async def connect_whatsapp_instance(agent_id: int) -> dict:
    agent = database.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    instance_name = _agent_instance(agent)
    client = _evolution_client_for_agent(agent)
    try:
        result = await client.connect_instance(instance_name)
    except Exception as exc:
        database.set_agent_whatsapp(agent_id, instance_name=instance_name, status="error")
        raise HTTPException(status_code=502, detail=f"Evolution API error: {exc}") from exc
    qr = result.get("base64") or result.get("qrcode") or result.get("code")
    row = database.set_agent_whatsapp(
        agent_id,
        instance_name=instance_name,
        status="pairing",
        qr=qr if isinstance(qr, str) else None,
    )
    return {"agent": row, "evolution": result}


@app.get("/agents/{agent_id}/whatsapp/status", response_model=dict)
async def whatsapp_status(agent_id: int) -> dict:
    agent = database.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    instance_name = _agent_instance(agent)
    client = _evolution_client_for_agent(agent)
    try:
        result = await client.connection_state(instance_name)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Evolution API error: {exc}") from exc
    state = (
        result.get("instance", {}).get("state")
        or result.get("state")
        or result.get("status")
        or "unknown"
    )
    row = database.set_agent_whatsapp(agent_id, instance_name=instance_name, status=str(state))
    return {"agent": row, "evolution": result}


@app.post("/agents/{agent_id}/whatsapp/send", response_model=dict)
async def send_whatsapp_message(agent_id: int, payload: WhatsAppSendCreate) -> dict:
    agent = database.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    instance_name = _agent_instance(agent)
    client = _evolution_client_for_agent(agent)
    try:
        result = await client.send_text(instance_name, payload.number, payload.text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Evolution API error: {exc}") from exc
    return {"ok": True, "instance_name": instance_name, "evolution": result}


@app.get("/admin/overview", response_model=dict)
def admin_overview() -> dict:
    agents = database.list_agents()
    runs = database.list_runs()
    companies = database.list_admin("companies", 1)
    conversations = database.list_admin("conversations", 1)
    customers = database.list_admin("customers", 1)
    integrations = database.list_admin("integrations", 1)
    plans = database.list_admin("plans")
    completed = [run for run in runs if run["status"] == "completed"]
    active_agents = [agent for agent in agents if agent["status"] == "active"]
    return {
        "counts": {
            "companies": len(companies),
            "agents": len(agents),
            "active_agents": len(active_agents),
            "runs": len(runs),
            "completed_runs": len(completed),
            "conversations": len(conversations),
            "customers": len(customers),
            "integrations": len(integrations),
            "estimated_revenue": sum(float(plan.get("price") or 0) for plan in plans[: max(1, len(companies))]),
        },
        "recent_runs": runs[:8],
        "recent_companies": companies[:8],
        "recent_conversations": conversations[:8],
    }


@app.post("/admin/seed", response_model=dict)
def seed_admin() -> dict:
    database.seed_demo_data()
    return {"ok": True}


@app.get("/admin/{table}", response_model=list[dict])
def list_admin_table(table: str, workspace_id: int | None = Query(default=1)) -> list[dict]:
    try:
        return database.list_admin(table, workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/admin/{table}", response_model=dict)
def create_admin_item(table: str, payload: AdminItem) -> dict:
    try:
        return database.create_admin(table, payload.data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/admin/{table}/{item_id}", response_model=dict)
def update_admin_item(table: str, item_id: int, payload: AdminItem) -> dict:
    try:
        row = database.update_admin(table, item_id, payload.data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


@app.delete("/admin/{table}/{item_id}", response_model=dict)
def delete_admin_item(table: str, item_id: int) -> dict:
    try:
        deleted = database.delete_admin(table, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@app.post("/tools", response_model=ToolOut)
def create_tool(payload: ToolCreate) -> ToolOut:
    if not database.get_workspace(payload.workspace_id):
        raise HTTPException(status_code=404, detail="Workspace not found")

    row = database.create_tool(
        workspace_id=payload.workspace_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        schema_json=payload.schema_json,
        config_json=payload.config_json,
        enabled=payload.enabled,
    )
    return tool_out(row)


@app.get("/tools", response_model=list[ToolOut])
def list_tools(workspace_id: int | None = Query(default=None)) -> list[ToolOut]:
    return [tool_out(row) for row in database.list_tools(workspace_id)]


@app.post("/runs", response_model=RunOut)
def create_run(payload: RunCreate, background_tasks: BackgroundTasks) -> RunOut:
    agent = database.get_agent(payload.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    row = database.create_run(agent=agent, user_email=payload.user_email, input=payload.input)
    background_tasks.add_task(execute_run, row["id"])
    return run_out(row)


@app.get("/runs", response_model=list[RunOut])
def list_runs(workspace_id: int | None = Query(default=None)) -> list[RunOut]:
    return [run_out(row) for row in database.list_runs(workspace_id)]


@app.get("/runs/{run_id}", response_model=RunDetailOut)
def get_run(run_id: int) -> RunDetailOut:
    row = database.get_run_detail(run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    return run_detail_out(row)


@app.post("/agents/{agent_id}/run", response_model=RunOut)
def run_agent(agent_id: int, payload: RunCreate, background_tasks: BackgroundTasks) -> RunOut:
    if payload.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="Payload agent_id must match path agent_id")
    return create_run(payload, background_tasks)


@app.post("/tasks", response_model=TaskOut)
def create_task(payload: TaskCreate, background_tasks: BackgroundTasks) -> TaskOut:
    agent = database.get_agent(payload.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    row = database.create_run(agent=agent, user_email=None, input=payload.prompt)
    background_tasks.add_task(execute_run, row["id"])
    return task_out(database.run_to_task(row, logs="Task queued.\n"))


@app.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int) -> TaskOut:
    row = database.get_task(task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_out(row)
