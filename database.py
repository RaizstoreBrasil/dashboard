import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Optional


DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/app.db")


def _db_path() -> Path:
    path = Path(os.getenv("DATABASE_PATH", DATABASE_PATH))
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                owner_email TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                company_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                system_prompt TEXT,
                instructions TEXT,
                model TEXT NOT NULL,
                temperature REAL NOT NULL DEFAULT 0.7,
                status TEXT NOT NULL DEFAULT 'active',
                segment TEXT,
                objective TEXT,
                tone TEXT,
                products TEXT,
                faq TEXT,
                service_rules TEXT,
                whatsapp_link TEXT,
                instance_name TEXT,
                evolution_api_url TEXT,
                evolution_api_key TEXT,
                whatsapp_status TEXT NOT NULL DEFAULT 'disconnected',
                whatsapp_qr TEXT,
                initial_message TEXT,
                business_hours TEXT,
                can_do TEXT,
                cannot_do TEXT,
                quick_replies TEXT,
                sales_copy TEXT,
                client_summary TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                segment TEXT,
                contact_name TEXT,
                email TEXT,
                phone TEXT,
                whatsapp_link TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                plan_id INTEGER,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                agent_id INTEGER,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tone TEXT,
                objective TEXT,
                version INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                company_id INTEGER,
                agent_id INTEGER,
                customer_name TEXT,
                customer_phone TEXT,
                channel TEXT NOT NULL DEFAULT 'whatsapp',
                status TEXT NOT NULL DEFAULT 'open',
                last_message TEXT,
                sentiment TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                company_id INTEGER,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                status TEXT NOT NULL DEFAULT 'lead',
                tags TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                agent_limit INTEGER NOT NULL DEFAULT 1,
                message_limit INTEGER NOT NULL DEFAULT 500,
                features TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                company_id INTEGER,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'disconnected',
                config_json TEXT NOT NULL DEFAULT '{}',
                last_sync_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL DEFAULT 1,
                key TEXT NOT NULL,
                value_json TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(workspace_id, key),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                schema_json TEXT NOT NULL DEFAULT '{}',
                config_json TEXT NOT NULL DEFAULT '{}',
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agent_tools (
                agent_id INTEGER NOT NULL,
                tool_id INTEGER NOT NULL,
                PRIMARY KEY(agent_id, tool_id),
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                agent_id INTEGER NOT NULL,
                user_email TEXT,
                input TEXT NOT NULL,
                output TEXT,
                status TEXT NOT NULL DEFAULT 'queued',
                model TEXT,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0,
                latency_ms INTEGER,
                error TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tool_calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                tool_id INTEGER,
                name TEXT NOT NULL,
                input_json TEXT NOT NULL DEFAULT '{}',
                output_json TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                latency_ms INTEGER,
                error TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
                FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                agent_id INTEGER,
                user_email TEXT,
                content TEXT NOT NULL,
                embedding_json TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                user_email TEXT,
                agent_id INTEGER,
                run_id INTEGER,
                model TEXT NOT NULL,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL,
                FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE SET NULL
            );
            """
        )
        _ensure_column(conn, "agents", "workspace_id", "INTEGER NOT NULL DEFAULT 1")
        _ensure_column(conn, "agents", "company_id", "INTEGER")
        _ensure_column(conn, "agents", "description", "TEXT")
        _ensure_column(conn, "agents", "system_prompt", "TEXT")
        _ensure_column(conn, "agents", "temperature", "REAL NOT NULL DEFAULT 0.7")
        _ensure_column(conn, "agents", "status", "TEXT NOT NULL DEFAULT 'active'")
        _ensure_column(conn, "agents", "updated_at", "TEXT")
        for column in (
            "segment",
            "objective",
            "tone",
            "products",
            "faq",
            "service_rules",
            "whatsapp_link",
            "instance_name",
            "evolution_api_url",
            "evolution_api_key",
            "whatsapp_status",
            "whatsapp_qr",
            "initial_message",
            "business_hours",
            "can_do",
            "cannot_do",
            "quick_replies",
            "sales_copy",
            "client_summary",
        ):
            _ensure_column(conn, "agents", column, "TEXT")
        conn.execute(
            "INSERT OR IGNORE INTO workspaces (id, name, owner_email) VALUES (1, ?, ?)",
            ("Default Workspace", None),
        )
        conn.execute(
            """
            UPDATE agents
            SET system_prompt = COALESCE(system_prompt, instructions, 'You are a helpful agent.'),
                workspace_id = COALESCE(workspace_id, 1),
                updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
            """
        )


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = [row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _loads(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def row_to_dict(row: sqlite3.Row) -> dict:
    data = dict(row)
    for key in (
        "schema_json",
        "config_json",
        "metadata",
        "input_json",
        "output_json",
        "features",
        "value_json",
    ):
        if key in data:
            fallback = [] if key == "features" else (None if key == "output_json" else {})
            data[key] = _loads(data[key], fallback)
    if "enabled" in data:
        data["enabled"] = bool(data["enabled"])
    if "system_prompt" in data and data["system_prompt"] is None:
        data["system_prompt"] = data.get("instructions") or ""
    if "evolution_api_key" in data:
        data["evolution_api_configured"] = bool(data["evolution_api_key"])
    return data


ADMIN_TABLES: dict[str, tuple[str, ...]] = {
    "users": ("workspace_id", "name", "email", "role", "status"),
    "companies": (
        "workspace_id",
        "name",
        "segment",
        "contact_name",
        "email",
        "phone",
        "whatsapp_link",
        "status",
        "plan_id",
        "notes",
    ),
    "prompts": ("workspace_id", "agent_id", "title", "content", "tone", "objective", "version", "status"),
    "conversations": (
        "workspace_id",
        "company_id",
        "agent_id",
        "customer_name",
        "customer_phone",
        "channel",
        "status",
        "last_message",
        "sentiment",
    ),
    "customers": ("workspace_id", "company_id", "name", "email", "phone", "status", "tags", "notes"),
    "plans": ("name", "price", "agent_limit", "message_limit", "features", "status"),
    "integrations": ("workspace_id", "company_id", "name", "type", "status", "config_json", "last_sync_at"),
    "settings": ("workspace_id", "key", "value_json"),
}


def _json_dump_columns(table: str) -> set[str]:
    return {"features"} if table == "plans" else {"config_json", "value_json"}


def list_admin(table: str, workspace_id: Optional[int] = None) -> list[dict]:
    _validate_admin_table(table)
    with connect() as conn:
        if workspace_id and "workspace_id" in ADMIN_TABLES[table]:
            rows = conn.execute(
                f"SELECT * FROM {table} WHERE workspace_id = ? ORDER BY id DESC",
                (workspace_id,),
            ).fetchall()
        else:
            rows = conn.execute(f"SELECT * FROM {table} ORDER BY id DESC").fetchall()
        return [row_to_dict(row) for row in rows]


def get_admin(table: str, item_id: int) -> Optional[dict]:
    _validate_admin_table(table)
    with connect() as conn:
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
        return row_to_dict(row) if row else None


def create_admin(table: str, payload: dict) -> dict:
    _validate_admin_table(table)
    allowed = ADMIN_TABLES[table]
    data = {key: payload[key] for key in allowed if key in payload}
    if not data:
        raise ValueError("No valid fields provided")
    for key in _json_dump_columns(table):
        if key in data and not isinstance(data[key], str):
            data[key] = json.dumps(data[key])
    columns = ", ".join(data.keys())
    placeholders = ", ".join("?" for _ in data)
    with connect() as conn:
        cursor = conn.execute(
            f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
            tuple(data.values()),
        )
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_dict(row)


def update_admin(table: str, item_id: int, payload: dict) -> Optional[dict]:
    _validate_admin_table(table)
    allowed = ADMIN_TABLES[table]
    data = {key: payload[key] for key in allowed if key in payload}
    if not data:
        return get_admin(table, item_id)
    for key in _json_dump_columns(table):
        if key in data and not isinstance(data[key], str):
            data[key] = json.dumps(data[key])
    assignments = ", ".join(f"{key} = ?" for key in data)
    if "updated_at" in _table_columns(table):
        assignments += ", updated_at = CURRENT_TIMESTAMP"
    with connect() as conn:
        conn.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*data.values(), item_id))
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
        return row_to_dict(row) if row else None


def delete_admin(table: str, item_id: int) -> bool:
    _validate_admin_table(table)
    with connect() as conn:
        cursor = conn.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
        return cursor.rowcount > 0


def _table_columns(table: str) -> list[str]:
    with connect() as conn:
        return [row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def _validate_admin_table(table: str) -> None:
    if table not in ADMIN_TABLES:
        raise ValueError(f"Unsupported admin table: {table}")


def create_workspace(name: str, owner_email: Optional[str]) -> dict:
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO workspaces (name, owner_email) VALUES (?, ?)",
            (name, owner_email),
        )
        row = conn.execute("SELECT * FROM workspaces WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_dict(row)


def list_workspaces() -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM workspaces ORDER BY id DESC").fetchall()
        return [row_to_dict(row) for row in rows]


def get_workspace(workspace_id: int) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,)).fetchone()
        return row_to_dict(row) if row else None


def create_agent(
    *,
    workspace_id: int,
    name: str,
    description: Optional[str],
    system_prompt: str,
    model: str,
    temperature: float,
    status: str,
    tool_ids: list[int],
    company_id: Optional[int] = None,
    segment: Optional[str] = None,
    objective: Optional[str] = None,
    tone: Optional[str] = None,
    products: Optional[str] = None,
    faq: Optional[str] = None,
    service_rules: Optional[str] = None,
    whatsapp_link: Optional[str] = None,
    instance_name: Optional[str] = None,
    evolution_api_url: Optional[str] = None,
    evolution_api_key: Optional[str] = None,
    whatsapp_status: Optional[str] = None,
    whatsapp_qr: Optional[str] = None,
    initial_message: Optional[str] = None,
    business_hours: Optional[str] = None,
    can_do: Optional[str] = None,
    cannot_do: Optional[str] = None,
    quick_replies: Optional[str] = None,
    sales_copy: Optional[str] = None,
    client_summary: Optional[str] = None,
) -> dict:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO agents
                (
                    workspace_id, company_id, name, description, system_prompt, instructions,
                    model, temperature, status, segment, objective, tone, products, faq,
                    service_rules, whatsapp_link, instance_name, evolution_api_url,
                    evolution_api_key, whatsapp_status, whatsapp_qr, initial_message, business_hours,
                    can_do, cannot_do, quick_replies, sales_copy, client_summary
                )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workspace_id,
                company_id,
                name,
                description,
                system_prompt,
                system_prompt,
                model,
                temperature,
                status,
                segment,
                objective,
                tone,
                products,
                faq,
                service_rules,
                whatsapp_link,
                instance_name,
                evolution_api_url,
                evolution_api_key,
                whatsapp_status or "disconnected",
                whatsapp_qr,
                initial_message,
                business_hours,
                can_do,
                cannot_do,
                quick_replies,
                sales_copy,
                client_summary,
            ),
        )
        agent_id = cursor.lastrowid
        replace_agent_tools(agent_id, tool_ids, conn=conn)
        row = conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
        return row_to_dict(row)


def list_agents(workspace_id: Optional[int] = None) -> list[dict]:
    with connect() as conn:
        if workspace_id:
            rows = conn.execute(
                "SELECT * FROM agents WHERE workspace_id = ? ORDER BY id DESC",
                (workspace_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM agents ORDER BY id DESC").fetchall()
        return [row_to_dict(row) for row in rows]


def get_agent(agent_id: int) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
        return row_to_dict(row) if row else None


def update_agent(agent_id: int, payload: dict) -> Optional[dict]:
    fields = (
        "company_id",
        "name",
        "description",
        "system_prompt",
        "model",
        "temperature",
        "status",
        "segment",
        "objective",
        "tone",
        "products",
        "faq",
        "service_rules",
        "whatsapp_link",
        "instance_name",
        "evolution_api_url",
        "evolution_api_key",
        "whatsapp_status",
        "whatsapp_qr",
        "initial_message",
        "business_hours",
        "can_do",
        "cannot_do",
        "quick_replies",
        "sales_copy",
        "client_summary",
    )
    data = {key: payload[key] for key in fields if key in payload}
    if "system_prompt" in data:
        data["instructions"] = data["system_prompt"]
    if not data:
        return get_agent(agent_id)
    assignments = ", ".join(f"{key} = ?" for key in data)
    with connect() as conn:
        conn.execute(
            f"UPDATE agents SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (*data.values(), agent_id),
        )
        row = conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
        return row_to_dict(row) if row else None


def generate_agent_assets(payload: dict) -> dict:
    company_name = payload.get("company_name") or payload.get("company") or "Empresa"
    agent_name = payload.get("name") or "Agente de Atendimento"
    segment = payload.get("segment") or "negocio local"
    objective = payload.get("objective") or "atender clientes, qualificar interessados e vender"
    tone = payload.get("tone") or "profissional, claro e acolhedor"
    products = payload.get("products") or "servicos e produtos da empresa"
    faq = payload.get("faq") or "perguntas frequentes ainda nao cadastradas"
    rules = payload.get("service_rules") or "confirmar dados importantes antes de finalizar qualquer atendimento"
    hours = payload.get("business_hours") or "horario comercial"
    can_do = payload.get("can_do") or "explicar ofertas, tirar duvidas, qualificar leads e direcionar atendimento"
    cannot_do = payload.get("cannot_do") or "prometer prazos, descontos ou condicoes que nao estejam autorizadas"
    whatsapp = payload.get("whatsapp_link") or "WhatsApp ainda nao conectado"

    initial_message = (
        payload.get("initial_message")
        or f"Ola! Eu sou {agent_name}, assistente virtual da {company_name}. Como posso te ajudar hoje?"
    )
    quick_replies = "\n".join(
        [
            "1. Quero saber valores",
            "2. Quero falar com atendimento",
            "3. Quero conhecer os servicos",
            "4. Ja sou cliente",
        ]
    )
    flow = "\n".join(
        [
            "1. Cumprimente e entenda a necessidade.",
            "2. Faca ate 3 perguntas de qualificacao.",
            "3. Apresente a melhor opcao de forma objetiva.",
            "4. Confirme interesse e colete dados.",
            "5. Direcione para pagamento, agenda ou atendimento humano quando necessario.",
        ]
    )
    sales_copy = (
        f"A {company_name} ajuda clientes de {segment} com uma experiencia rapida pelo WhatsApp. "
        f"Fale com a gente e receba uma orientacao objetiva agora."
    )
    client_summary = (
        f"Agente {agent_name} configurado para {company_name}. Objetivo: {objective}. "
        f"Tom: {tone}. Canal: {whatsapp}."
    )
    system_prompt = f"""
Voce e {agent_name}, agente virtual da empresa {company_name}.

Contexto da empresa:
- Segmento: {segment}
- Produtos/servicos: {products}
- Horario de atendimento: {hours}
- Link do WhatsApp: {whatsapp}

Objetivo principal:
{objective}

Tom de voz:
{tone}

Mensagem inicial:
{initial_message}

Fluxo de atendimento:
{flow}

Perguntas frequentes:
{faq}

Regras de atendimento:
{rules}

O que voce pode fazer:
{can_do}

O que voce nao pode fazer:
{cannot_do}

Regras de comportamento:
- Responda em portugues do Brasil.
- Seja direto, humano e profissional.
- Nao invente informacoes.
- Quando faltar informacao, pergunte de forma simples.
- Sempre conduza para uma proxima acao clara.
- Para vendas, use urgencia com responsabilidade e sem promessas falsas.
""".strip()

    return {
        "system_prompt": system_prompt,
        "initial_message": initial_message,
        "flow": flow,
        "quick_replies": quick_replies,
        "service_rules": rules,
        "sales_copy": sales_copy,
        "client_summary": client_summary,
    }


def default_instance_name(agent_id: int, agent_name: str) -> str:
    safe = "".join(char.lower() if char.isalnum() else "-" for char in agent_name).strip("-")
    while "--" in safe:
        safe = safe.replace("--", "-")
    return f"agent-{agent_id}-{safe or 'ia'}"[:60]


def set_agent_whatsapp(
    agent_id: int,
    *,
    instance_name: Optional[str] = None,
    status: Optional[str] = None,
    qr: Optional[str] = None,
) -> Optional[dict]:
    payload: dict[str, Any] = {}
    if instance_name is not None:
        payload["instance_name"] = instance_name
    if status is not None:
        payload["whatsapp_status"] = status
    if qr is not None:
        payload["whatsapp_qr"] = qr
    return update_agent(agent_id, payload)


def set_agent_evolution_config(
    agent_id: int,
    *,
    api_url: Optional[str] = None,
    api_key: Optional[str] = None,
    instance_name: Optional[str] = None,
) -> Optional[dict]:
    payload: dict[str, Any] = {}
    if api_url is not None:
        payload["evolution_api_url"] = api_url
    if api_key is not None:
        payload["evolution_api_key"] = api_key
    if instance_name is not None:
        payload["instance_name"] = instance_name
    return update_agent(agent_id, payload)


def create_smart_agent(payload: dict) -> dict:
    assets = generate_agent_assets(payload)
    company_name = payload.get("company_name") or payload.get("company") or "Empresa Demo"
    company_id = payload.get("company_id")
    if not company_id:
        company = create_admin(
            "companies",
            {
                "workspace_id": payload.get("workspace_id", 1),
                "name": company_name,
                "segment": payload.get("segment"),
                "whatsapp_link": payload.get("whatsapp_link"),
                "status": "active",
            },
        )
        company_id = company["id"]

    agent = create_agent(
        workspace_id=payload.get("workspace_id", 1),
        company_id=company_id,
        name=payload.get("name") or "Agente Inteligente",
        description=payload.get("objective"),
        system_prompt=assets["system_prompt"],
        model=payload.get("model") or os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        temperature=float(payload.get("temperature", 0.4)),
        status=payload.get("status", "active"),
        tool_ids=[],
        segment=payload.get("segment"),
        objective=payload.get("objective"),
        tone=payload.get("tone"),
        products=payload.get("products"),
        faq=payload.get("faq"),
        service_rules=assets["service_rules"],
        whatsapp_link=payload.get("whatsapp_link"),
        instance_name=payload.get("instance_name"),
        evolution_api_url=payload.get("evolution_api_url"),
        evolution_api_key=payload.get("evolution_api_key"),
        initial_message=assets["initial_message"],
        business_hours=payload.get("business_hours"),
        can_do=payload.get("can_do"),
        cannot_do=payload.get("cannot_do"),
        quick_replies=assets["quick_replies"],
        sales_copy=assets["sales_copy"],
        client_summary=assets["client_summary"],
    )
    prompt = create_admin(
        "prompts",
        {
            "workspace_id": payload.get("workspace_id", 1),
            "agent_id": agent["id"],
            "title": f"Prompt principal - {agent['name']}",
            "content": assets["system_prompt"],
            "tone": payload.get("tone"),
            "objective": payload.get("objective"),
            "status": "active",
        },
    )
    agent["generated_assets"] = {**assets, "prompt_id": prompt["id"], "company_id": company_id}
    return agent


def create_tool(
    *,
    workspace_id: int,
    name: str,
    description: Optional[str],
    type: str,
    schema_json: dict,
    config_json: dict,
    enabled: bool,
) -> dict:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tools
                (workspace_id, name, description, type, schema_json, config_json, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workspace_id,
                name,
                description,
                type,
                json.dumps(schema_json),
                json.dumps(config_json),
                1 if enabled else 0,
            ),
        )
        row = conn.execute("SELECT * FROM tools WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_dict(row)


def list_tools(workspace_id: Optional[int] = None) -> list[dict]:
    with connect() as conn:
        if workspace_id:
            rows = conn.execute(
                "SELECT * FROM tools WHERE workspace_id = ? ORDER BY id DESC",
                (workspace_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM tools ORDER BY id DESC").fetchall()
        return [row_to_dict(row) for row in rows]


def get_agent_tools(agent_id: int) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT t.*
            FROM tools t
            JOIN agent_tools at ON at.tool_id = t.id
            WHERE at.agent_id = ? AND t.enabled = 1
            ORDER BY t.id
            """,
            (agent_id,),
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def replace_agent_tools(
    agent_id: int,
    tool_ids: list[int],
    *,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    owns_conn = conn is None
    if conn is None:
        conn = sqlite3.connect(_db_path())
    try:
        conn.execute("DELETE FROM agent_tools WHERE agent_id = ?", (agent_id,))
        conn.executemany(
            "INSERT OR IGNORE INTO agent_tools (agent_id, tool_id) VALUES (?, ?)",
            [(agent_id, tool_id) for tool_id in tool_ids],
        )
        if owns_conn:
            conn.commit()
    finally:
        if owns_conn:
            conn.close()


def create_run(*, agent: dict, user_email: Optional[str], input: str) -> dict:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO agent_runs
                (workspace_id, agent_id, user_email, input, status, model)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (agent["workspace_id"], agent["id"], user_email, input, "queued", agent["model"]),
        )
        run_id = cursor.lastrowid
        add_message(run_id=run_id, role="user", content=input, metadata={}, conn=conn)
        row = conn.execute("SELECT * FROM agent_runs WHERE id = ?", (run_id,)).fetchone()
        return row_to_dict(row)


def list_runs(workspace_id: Optional[int] = None) -> list[dict]:
    with connect() as conn:
        if workspace_id:
            rows = conn.execute(
                "SELECT * FROM agent_runs WHERE workspace_id = ? ORDER BY id DESC",
                (workspace_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM agent_runs ORDER BY id DESC").fetchall()
        return [row_to_dict(row) for row in rows]


def get_run(run_id: int) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM agent_runs WHERE id = ?", (run_id,)).fetchone()
        return row_to_dict(row) if row else None


def get_run_detail(run_id: int) -> Optional[dict]:
    run = get_run(run_id)
    if not run:
        return None
    run["messages"] = list_messages(run_id)
    run["tool_calls"] = list_tool_calls(run_id)
    return run


def update_run(
    run_id: int,
    *,
    status: Optional[str] = None,
    output: Optional[str] = None,
    error: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    cost: Optional[float] = None,
    latency_ms: Optional[int] = None,
    complete: bool = False,
) -> None:
    fields: list[str] = []
    values: list[Any] = []
    for column, value in {
        "status": status,
        "output": output,
        "error": error,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost": cost,
        "latency_ms": latency_ms,
    }.items():
        if value is not None:
            fields.append(f"{column} = ?")
            values.append(value)
    if complete:
        fields.append("completed_at = CURRENT_TIMESTAMP")
    if not fields:
        return
    values.append(run_id)
    with connect() as conn:
        conn.execute(f"UPDATE agent_runs SET {', '.join(fields)} WHERE id = ?", values)


def add_message(
    *,
    run_id: int,
    role: str,
    content: Optional[str],
    metadata: dict,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    owns_conn = conn is None
    if conn is None:
        conn = sqlite3.connect(_db_path())
    try:
        conn.execute(
            "INSERT INTO messages (run_id, role, content, metadata) VALUES (?, ?, ?, ?)",
            (run_id, role, content, json.dumps(metadata)),
        )
        if owns_conn:
            conn.commit()
    finally:
        if owns_conn:
            conn.close()


def list_messages(run_id: int) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE run_id = ? ORDER BY id",
            (run_id,),
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def create_tool_call(
    *,
    run_id: int,
    tool_id: Optional[int],
    name: str,
    input_json: dict,
    output_json: Optional[dict],
    status: str,
    latency_ms: Optional[int] = None,
    error: Optional[str] = None,
) -> dict:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tool_calls
                (run_id, tool_id, name, input_json, output_json, status, latency_ms, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                tool_id,
                name,
                json.dumps(input_json),
                json.dumps(output_json) if output_json is not None else None,
                status,
                latency_ms,
                error,
            ),
        )
        row = conn.execute("SELECT * FROM tool_calls WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_dict(row)


def list_tool_calls(run_id: int) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM tool_calls WHERE run_id = ? ORDER BY id",
            (run_id,),
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def create_usage_event(
    *,
    workspace_id: int,
    user_email: Optional[str],
    agent_id: int,
    run_id: int,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cost: float,
) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO usage_events
                (workspace_id, user_email, agent_id, run_id, model, input_tokens, output_tokens, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (workspace_id, user_email, agent_id, run_id, model, input_tokens, output_tokens, cost),
        )


def create_task(agent_id: int, prompt: str) -> dict:
    agent = get_agent(agent_id)
    if not agent:
        raise ValueError("Agent not found")
    run = create_run(agent=agent, user_email=None, input=prompt)
    return run_to_task(run, logs="Task queued.\n")


def get_task(task_id: int) -> Optional[dict]:
    run = get_run(task_id)
    if not run:
        return None
    messages = list_messages(task_id)
    logs = "\n".join(
        message["content"] or "" for message in messages if message["role"] in {"system", "log"}
    )
    if logs:
        logs += "\n"
    return run_to_task(run, logs=logs)


def run_to_task(run: dict, *, logs: str = "") -> dict:
    return {
        "id": run["id"],
        "agent_id": run["agent_id"],
        "prompt": run["input"],
        "status": run["status"],
        "logs": logs,
        "result": run.get("output"),
        "error": run.get("error"),
        "created_at": run["created_at"],
        "updated_at": run.get("completed_at") or run["created_at"],
    }


def update_task(
    task_id: int,
    *,
    status: Optional[str] = None,
    logs_append: Optional[str] = None,
    result: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    if logs_append:
        add_message(run_id=task_id, role="log", content=logs_append.rstrip(), metadata={})
    update_run(
        task_id,
        status=status,
        output=result,
        error=error,
        complete=status in {"completed", "failed"} if status else False,
    )


def seed_demo_data() -> None:
    init_db()
    with connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO workspaces (id, name, owner_email) VALUES (1, ?, ?)",
            ("Workspace Principal", "admin@local"),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO users (id, workspace_id, name, email, role, status)
            VALUES (1, 1, 'Admin Plataforma', 'admin@local', 'owner', 'active')
            """
        )

    if not list_admin("plans"):
        create_admin(
            "plans",
            {
                "name": "Starter",
                "price": 197,
                "agent_limit": 2,
                "message_limit": 1500,
                "features": ["2 agentes", "WhatsApp manual", "Dashboard basico"],
                "status": "active",
            },
        )
        create_admin(
            "plans",
            {
                "name": "Pro",
                "price": 497,
                "agent_limit": 10,
                "message_limit": 10000,
                "features": ["10 agentes", "Automacao WhatsApp", "Relatorios", "Prompts por nicho"],
                "status": "active",
            },
        )

    if not list_admin("companies", 1):
        company = create_admin(
            "companies",
            {
                "workspace_id": 1,
                "name": "Clinica Modelo",
                "segment": "Saude e estetica",
                "contact_name": "Dono da Clinica",
                "email": "cliente@exemplo.com",
                "phone": "5517999999999",
                "whatsapp_link": "https://wa.me/5517999999999",
                "status": "active",
                "notes": "Cliente demo para apresentacao.",
            },
        )
        agent = create_smart_agent(
            {
                "workspace_id": 1,
                "company_id": company["id"],
                "company_name": company["name"],
                "name": "Raiz Atendimento",
                "segment": "Saude e estetica",
                "objective": "qualificar pacientes, explicar servicos e direcionar agendamentos",
                "tone": "acolhedor, seguro e objetivo",
                "products": "avaliacao estetica, procedimentos faciais, retorno e agendamento",
                "faq": "precos, horarios, formas de pagamento, preparo antes do procedimento",
                "service_rules": "nunca dar diagnostico medico; encaminhar duvidas clinicas para atendimento humano",
                "whatsapp_link": company["whatsapp_link"],
                "business_hours": "segunda a sexta, 08h as 18h",
                "can_do": "tirar duvidas comerciais e coletar dados para agendamento",
                "cannot_do": "dar diagnosticos, prometer resultados ou prescrever tratamentos",
            }
        )
        create_admin(
            "customers",
            {
                "workspace_id": 1,
                "company_id": company["id"],
                "name": "Maria Cliente",
                "phone": "5517988888888",
                "status": "lead",
                "tags": "whatsapp,interessada",
                "notes": "Perguntou sobre avaliacao.",
            },
        )
        create_admin(
            "conversations",
            {
                "workspace_id": 1,
                "company_id": company["id"],
                "agent_id": agent["id"],
                "customer_name": "Maria Cliente",
                "customer_phone": "5517988888888",
                "channel": "whatsapp",
                "status": "open",
                "last_message": "Gostaria de saber valores e horarios.",
                "sentiment": "interessada",
            },
        )
        create_admin(
            "integrations",
            {
                "workspace_id": 1,
                "company_id": company["id"],
                "name": "WhatsApp Evolution API",
                "type": "whatsapp",
                "status": "ready_to_connect",
                "config_json": {"instance": "clinica-modelo", "webhook": "/webhooks/whatsapp"},
            },
        )

    if not list_admin("settings", 1):
        create_admin(
            "settings",
            {
                "workspace_id": 1,
                "key": "platform",
                "value_json": {
                    "brand": "Fabrica de Agentes IA",
                    "support_whatsapp": "",
                    "default_model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                },
            },
        )
