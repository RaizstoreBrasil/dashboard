create extension if not exists vector;

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  system_prompt text not null,
  model text not null default 'gpt-4.1-mini',
  temperature numeric not null default 0.7,
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tools (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  type text not null,
  schema_json jsonb not null default '{}'::jsonb,
  config_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table agent_tools (
  agent_id uuid not null references agents(id) on delete cascade,
  tool_id uuid not null references tools(id) on delete cascade,
  primary key (agent_id, tool_id)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid references auth.users(id),
  input text not null,
  output text,
  status text not null default 'queued',
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost numeric not null default 0,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  role text not null,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  tool_id uuid references tools(id) on delete set null,
  name text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb,
  status text not null default 'pending',
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create table memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  agent_id uuid references agents(id) on delete set null,
  run_id uuid references agent_runs(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index idx_agents_workspace_id on agents(workspace_id);
create index idx_tools_workspace_id on tools(workspace_id);
create index idx_runs_workspace_id on agent_runs(workspace_id);
create index idx_runs_agent_id on agent_runs(agent_id);
create index idx_messages_run_id on messages(run_id);
create index idx_tool_calls_run_id on tool_calls(run_id);
create index idx_memories_agent_user on memories(agent_id, user_id);
create index idx_usage_workspace_created on usage_events(workspace_id, created_at);

create index idx_memories_embedding
on memories using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
