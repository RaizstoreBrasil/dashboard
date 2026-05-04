from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


AgentStatus = Literal["draft", "active", "archived"]
RunStatus = Literal["queued", "running", "completed", "failed"]
ToolType = Literal["http", "database", "file_search", "webhook", "internal"]


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    owner_email: Optional[str] = None


class WorkspaceOut(BaseModel):
    id: int
    name: str
    owner_email: Optional[str] = None
    created_at: datetime


class AgentCreate(BaseModel):
    workspace_id: int = 1
    company_id: Optional[int] = None
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    system_prompt: str = Field(min_length=1)
    model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    status: AgentStatus = "active"
    tool_ids: list[int] = Field(default_factory=list)
    segment: Optional[str] = None
    objective: Optional[str] = None
    tone: Optional[str] = None
    products: Optional[str] = None
    faq: Optional[str] = None
    service_rules: Optional[str] = None
    whatsapp_link: Optional[str] = None
    instance_name: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    whatsapp_status: Optional[str] = None
    whatsapp_qr: Optional[str] = None
    initial_message: Optional[str] = None
    business_hours: Optional[str] = None
    can_do: Optional[str] = None
    cannot_do: Optional[str] = None


class AgentOut(BaseModel):
    id: int
    workspace_id: int
    company_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    system_prompt: str
    model: str
    temperature: float
    status: AgentStatus
    segment: Optional[str] = None
    objective: Optional[str] = None
    tone: Optional[str] = None
    products: Optional[str] = None
    faq: Optional[str] = None
    service_rules: Optional[str] = None
    whatsapp_link: Optional[str] = None
    instance_name: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_configured: bool = False
    whatsapp_status: Optional[str] = None
    whatsapp_qr: Optional[str] = None
    initial_message: Optional[str] = None
    business_hours: Optional[str] = None
    can_do: Optional[str] = None
    cannot_do: Optional[str] = None
    quick_replies: Optional[str] = None
    sales_copy: Optional[str] = None
    client_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ToolCreate(BaseModel):
    workspace_id: int = 1
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    type: ToolType = "http"
    schema_json: dict[str, Any] = Field(default_factory=dict)
    config_json: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class ToolOut(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str] = None
    type: ToolType
    schema_json: dict[str, Any]
    config_json: dict[str, Any]
    enabled: bool
    created_at: datetime


class RunCreate(BaseModel):
    agent_id: int
    user_email: Optional[str] = None
    input: str = Field(min_length=1)


class RunOut(BaseModel):
    id: int
    workspace_id: int
    agent_id: int
    user_email: Optional[str] = None
    input: str
    output: Optional[str] = None
    status: RunStatus
    model: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class MessageOut(BaseModel):
    id: int
    run_id: int
    role: str
    content: Optional[str] = None
    metadata: dict[str, Any]
    created_at: datetime


class ToolCallOut(BaseModel):
    id: int
    run_id: int
    tool_id: Optional[int] = None
    name: str
    input_json: dict[str, Any]
    output_json: Optional[dict[str, Any]] = None
    status: str
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    created_at: datetime


class RunDetailOut(RunOut):
    messages: list[MessageOut] = Field(default_factory=list)
    tool_calls: list[ToolCallOut] = Field(default_factory=list)


class TaskCreate(BaseModel):
    agent_id: int
    prompt: str = Field(min_length=1)


class TaskOut(BaseModel):
    id: int
    agent_id: int
    prompt: str
    status: RunStatus
    logs: str
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminItem(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class SmartAgentCreate(BaseModel):
    workspace_id: int = 1
    company_id: Optional[int] = None
    company_name: str = Field(min_length=1, max_length=160)
    name: str = Field(min_length=1, max_length=120)
    segment: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    tone: str = Field(min_length=1)
    products: str = Field(min_length=1)
    faq: str = Field(min_length=1)
    service_rules: str = Field(min_length=1)
    whatsapp_link: Optional[str] = None
    instance_name: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    initial_message: Optional[str] = None
    business_hours: str = Field(min_length=1)
    can_do: str = Field(min_length=1)
    cannot_do: str = Field(min_length=1)
    model: Optional[str] = None
    temperature: float = Field(default=0.4, ge=0, le=2)


class WhatsAppSendCreate(BaseModel):
    number: str = Field(min_length=8)
    text: str = Field(min_length=1)


class WhatsAppInstanceCreate(BaseModel):
    instance_name: Optional[str] = None


class EvolutionConfigUpdate(BaseModel):
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    instance_name: Optional[str] = None
