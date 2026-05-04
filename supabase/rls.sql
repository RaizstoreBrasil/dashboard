alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table agents enable row level security;
alter table tools enable row level security;
alter table agent_tools enable row level security;
alter table agent_runs enable row level security;
alter table messages enable row level security;
alter table tool_calls enable row level security;
alter table memories enable row level security;
alter table files enable row level security;
alter table usage_events enable row level security;

create or replace function is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create policy "members can read workspaces"
on workspaces for select
using (owner_id = auth.uid() or is_workspace_member(id));

create policy "users can create workspaces"
on workspaces for insert
with check (owner_id = auth.uid());

create policy "owners can update workspaces"
on workspaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners can delete workspaces"
on workspaces for delete
using (owner_id = auth.uid());

create policy "members can read workspace members"
on workspace_members for select
using (is_workspace_member(workspace_id));

create policy "owners can manage workspace members"
on workspace_members for all
using (
  exists (
    select 1 from workspaces w
    where w.id = workspace_members.workspace_id
      and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from workspaces w
    where w.id = workspace_members.workspace_id
      and w.owner_id = auth.uid()
  )
);

create policy "members can manage agents"
on agents for all
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy "members can manage tools"
on tools for all
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy "members can manage agent tools"
on agent_tools for all
using (
  exists (
    select 1 from agents a
    where a.id = agent_tools.agent_id
      and is_workspace_member(a.workspace_id)
  )
)
with check (
  exists (
    select 1 from agents a
    where a.id = agent_tools.agent_id
      and is_workspace_member(a.workspace_id)
  )
);

create policy "members can manage runs"
on agent_runs for all
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy "members can manage messages"
on messages for all
using (
  exists (
    select 1 from agent_runs r
    where r.id = messages.run_id
      and is_workspace_member(r.workspace_id)
  )
)
with check (
  exists (
    select 1 from agent_runs r
    where r.id = messages.run_id
      and is_workspace_member(r.workspace_id)
  )
);

create policy "members can manage tool calls"
on tool_calls for all
using (
  exists (
    select 1 from agent_runs r
    where r.id = tool_calls.run_id
      and is_workspace_member(r.workspace_id)
  )
)
with check (
  exists (
    select 1 from agent_runs r
    where r.id = tool_calls.run_id
      and is_workspace_member(r.workspace_id)
  )
);

create policy "members can manage memories"
on memories for all
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy "members can manage files"
on files for all
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy "members can read usage events"
on usage_events for select
using (is_workspace_member(workspace_id));

create policy "members can create usage events"
on usage_events for insert
with check (is_workspace_member(workspace_id));

create or replace function add_workspace_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  return new;
end;
$$;

create trigger on_workspace_created_add_owner
after insert on workspaces
for each row
execute function add_workspace_owner_as_member();
