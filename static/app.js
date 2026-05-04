const state = {
  overview: null,
  agents: [],
  runs: [],
  companies: [],
  conversations: [],
  customers: [],
  plans: [],
  integrations: [],
  settings: [],
};

const $ = (selector) => document.querySelector(selector);
const els = {
  healthText: $("#healthText"),
  seedButton: $("#seedButton"),
  refreshButton: $("#refreshButton"),
  themeButton: $("#themeButton"),
  themeButtonTop: $("#themeButtonTop"),
  notifyButton: $("#notifyButton"),
  fillExampleButton: $("#fillExampleButton"),
  addSourceButton: $("#addSourceButton"),
  companyForm: $("#companyForm"),
  smartAgentForm: $("#smartAgentForm"),
  taskForm: $("#taskForm"),
  whatsappSendForm: $("#whatsappSendForm"),
  agentSelect: $("#agentSelect"),
  outputBox: $("#outputBox"),
  selectedRun: $("#selectedRun"),
  toast: $("#toast"),
};

const sourceCopy = {
  website: {
    title: "Fonte: Website",
    help: "Cole o site do cliente. O sistema usa esse link como base para montar o agente.",
    placeholder: "https://site-do-cliente.com.br",
    label: "Website",
  },
  qa: {
    title: "Fonte: Perguntas e respostas",
    help: "Adicione perguntas frequentes com respostas prontas.",
    placeholder: "Pergunta: Qual o preco?\nResposta: O valor depende do servico escolhido...",
    label: "Q&A",
  },
  text: {
    title: "Fonte: Texto livre",
    help: "Cole regras, servicos, politicas, links e qualquer informacao importante.",
    placeholder: "Cole aqui as informacoes do atendimento...",
    label: "Texto",
  },
  pdf: {
    title: "Fonte: PDF",
    help: "Por enquanto, informe o nome/link do PDF. Depois conectamos upload real.",
    placeholder: "Tabela-de-precos.pdf ou link do arquivo",
    label: "PDF",
  },
  video: {
    title: "Fonte: Videos",
    help: "Cole links de videos ou aulas que explicam o produto/servico.",
    placeholder: "https://youtube.com/...",
    label: "Video",
  },
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

function notify(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function item(title, meta = "", body = "", badge = "") {
  return `
    <article class="item">
      <div class="itemTop">
        <h3>${escapeHtml(title)}</h3>
        ${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}
      </div>
      ${meta ? `<p>${escapeHtml(meta)}</p>` : ""}
      ${body ? `<p>${escapeHtml(body)}</p>` : ""}
    </article>
  `;
}

function renderList(selector, rows, empty, mapper) {
  const el = $(selector);
  el.innerHTML = rows.length ? rows.map(mapper).join("") : `<p class="empty">${empty}</p>`;
}

function render() {
  const counts = state.overview?.counts || {};
  $("#companyCount").textContent = counts.companies || state.companies.length;
  $("#agentCount").textContent = counts.agents || state.agents.length;
  $("#conversationCount").textContent = counts.conversations || state.conversations.length;
  $("#customerCount").textContent = counts.customers || state.customers.length;
  $("#activeAgentCount").textContent = counts.active_agents || state.agents.filter((agent) => agent.status === "active").length;
  $("#estimatedRevenue").textContent = `R$ ${Number(counts.estimated_revenue || 0).toFixed(0)}`;
  renderConversationChart();

  els.agentSelect.innerHTML = state.agents
    .map((agent) => `<option value="${agent.id}">${escapeHtml(agent.name)} #${agent.id}</option>`)
    .join("");

  renderList("#companyList", state.companies, "Nenhuma empresa cadastrada.", (company) =>
    item(company.name, `${company.segment || "Sem segmento"} | ${company.status}`, company.whatsapp_link || company.notes || "", "empresa")
  );

  renderList("#agentList", state.agents, "Nenhum agente cadastrado. Use o formulario acima para gerar o primeiro.", (agent) => `
    <article class="item">
      <div class="itemTop">
        <h3>${escapeHtml(agent.name)}</h3>
        <span class="badge status-${escapeHtml(agent.status)}">${escapeHtml(agent.status)}</span>
      </div>
      <p>${escapeHtml(agent.segment || "sem segmento")} | ${escapeHtml(agent.tone || "tom padrao")}</p>
      <p>Instancia: ${escapeHtml(agent.instance_name || "nao criada")} | WhatsApp: ${escapeHtml(agent.whatsapp_status || "disconnected")}</p>
      <p>Evolution API: ${agent.evolution_api_configured ? "chave configurada" : "sem chave do agente"}</p>
      <p>${escapeHtml(agent.objective || agent.description || "Sem objetivo cadastrado.")}</p>
      <div class="itemActions">
        <button type="button" data-select-agent="${agent.id}">Testar agente</button>
        <button type="button" data-wa-connect="${agent.id}">Conectar WhatsApp</button>
        <button type="button" data-copy="${escapeHtml(agent.client_summary || agent.objective || "")}">Copiar resumo</button>
      </div>
      <details class="advancedBox">
        <summary>Avancado</summary>
        <div class="itemActions">
          <button type="button" data-copy="${escapeHtml(agent.system_prompt)}">Copiar prompt tecnico</button>
          <button type="button" data-wa-create="${agent.id}">Criar instancia</button>
          <button type="button" data-wa-status="${agent.id}">Ver status tecnico</button>
        </div>
      </details>
    </article>
  `);

  renderList("#conversationList", state.conversations, "Nenhuma conversa registrada.", (row) =>
    item(row.customer_name || "Cliente", `${row.channel} | ${row.status} | ${row.sentiment || "neutro"}`, row.last_message || "", "conversa")
  );

  renderList("#customerList", state.customers, "Nenhum cliente registrado.", (row) =>
    item(row.name, `${row.phone || ""} | ${row.status}`, row.tags || row.notes || "", "cliente")
  );

  renderList("#planList", state.plans, "Nenhum plano cadastrado.", (row) =>
    item(row.name, `R$ ${Number(row.price || 0).toFixed(2)} | ${row.agent_limit} agentes`, (row.features || []).join(", "), "plano")
  );

  renderList("#integrationList", state.integrations, "Nenhuma integracao cadastrada.", (row) =>
    item(row.name, `${row.type} | ${row.status}`, JSON.stringify(row.config_json || {}), "integracao")
  );

  renderList("#integrationStatusList", state.integrations, "Nenhuma integracao cadastrada.", (row) =>
    item(row.name, `${row.type} | ${row.status}`, row.last_sync_at || "Aguardando sincronizacao", row.status)
  );

  renderList("#settingList", state.settings, "Nenhuma configuracao cadastrada.", (row) =>
    item(row.key, "configuracao global", JSON.stringify(row.value_json || {}), "setting")
  );

  renderList("#runList", state.runs, "Nenhuma execucao criada.", (run) => `
    <button class="item runItem" type="button" data-run-id="${run.id}">
      <div class="itemTop">
        <h3>Execucao #${run.id}</h3>
        <span class="badge status-${escapeHtml(run.status)}">${escapeHtml(run.status)}</span>
      </div>
      <p>Agente #${run.agent_id} | custo estimado $${Number(run.cost || 0).toFixed(6)}</p>
      <p>${escapeHtml(run.input)}</p>
    </button>
  `);

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      navigator.clipboard?.writeText(button.dataset.copy || "");
      notify("Copiado.");
    });
  });

  document.querySelectorAll(".runItem").forEach((button) => {
    button.addEventListener("click", () => loadRunDetail(button.dataset.runId));
  });

  document.querySelectorAll("[data-wa-create]").forEach((button) => {
    button.addEventListener("click", () => createWhatsAppInstance(button.dataset.waCreate));
  });

  document.querySelectorAll("[data-wa-connect]").forEach((button) => {
    button.addEventListener("click", () => connectWhatsAppInstance(button.dataset.waConnect));
  });

  document.querySelectorAll("[data-wa-status]").forEach((button) => {
    button.addEventListener("click", () => refreshWhatsAppStatus(button.dataset.waStatus));
  });

  document.querySelectorAll("[data-select-agent]").forEach((button) => {
    button.addEventListener("click", () => {
      els.agentSelect.value = button.dataset.selectAgent;
      document.querySelector("#whatsapp").scrollIntoView({ behavior: "smooth" });
      notify("Agente selecionado para teste.");
    });
  });
}

async function loadAll() {
  const [health, overview, agents, runs, companies, conversations, customers, plans, integrations, settings] =
    await Promise.all([
      api("/health"),
      api("/admin/overview"),
      api("/agents"),
      api("/runs"),
      api("/admin/companies"),
      api("/admin/conversations"),
      api("/admin/customers"),
      api("/admin/plans"),
      api("/admin/integrations"),
      api("/admin/settings"),
    ]);

  els.healthText.textContent = `${health.service} online`;
  Object.assign(state, { overview, agents, runs, companies, conversations, customers, plans, integrations, settings });
  render();
}

async function loadRunDetail(runId) {
  const run = await api(`/runs/${runId}`);
  els.selectedRun.textContent = `Execucao #${run.id} - ${run.status}`;
  const messages = (run.messages || []).map((message) => `[${message.role}] ${message.content || ""}`).join("\n\n");
  els.outputBox.textContent = [
    `Status: ${run.status}`,
    `Modelo: ${run.model || ""}`,
    `Custo estimado: $${Number(run.cost || 0).toFixed(6)}`,
    "",
    "Resultado:",
    run.output || run.error || "Ainda sem resultado.",
    "",
    "Logs:",
    messages || "Sem logs.",
  ].join("\n");
}

async function createWhatsAppInstance(agentId) {
  const result = await api(`/agents/${agentId}/whatsapp/instance`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  notify("Instancia criada para o agente.");
  await loadAll();
  showEvolutionResult(result);
}

async function connectWhatsAppInstance(agentId) {
  const result = await api(`/agents/${agentId}/whatsapp/connect`, { method: "POST" });
  notify("QR/conexao solicitada.");
  await loadAll();
  showEvolutionResult(result);
}

async function refreshWhatsAppStatus(agentId) {
  const result = await api(`/agents/${agentId}/whatsapp/status`);
  notify("Status atualizado.");
  await loadAll();
  showEvolutionResult(result);
}

function showEvolutionResult(result) {
  const qr = result.agent?.whatsapp_qr;
  els.selectedRun.textContent = `WhatsApp - ${result.agent?.instance_name || "instancia"}`;
  els.outputBox.textContent = [
    `Agente: ${result.agent?.name || ""}`,
    `Instancia: ${result.agent?.instance_name || ""}`,
    `Status: ${result.agent?.whatsapp_status || ""}`,
    "",
    "QR/base64 retornado:",
    qr || "Nenhum QR retornado.",
    "",
    "Resposta Evolution:",
    JSON.stringify(result.evolution || {}, null, 2),
  ].join("\n");
}

els.companyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/admin/companies", {
    method: "POST",
    body: JSON.stringify({
      data: {
        workspace_id: 1,
        name: $("#companyName").value.trim(),
        segment: $("#companySegment").value.trim(),
        contact_name: $("#companyContact").value.trim(),
        whatsapp_link: $("#companyWhatsapp").value.trim(),
        notes: $("#companyPlan").value.trim() ? `Plano: ${$("#companyPlan").value.trim()}` : "",
        status: "active",
      },
    }),
  });
  event.target.reset();
  notify("Empresa salva.");
  await loadAll();
});

els.smartAgentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    workspace_id: 1,
    name: $("#smartName").value.trim(),
    company_name: $("#smartCompany").value.trim(),
    segment: $("#smartSegment").value.trim(),
    tone: $("#smartTone").value.trim(),
    objective: $("#smartObjective").value.trim(),
    products: $("#smartProducts").value.trim(),
    faq: $("#smartFaq").value.trim(),
    service_rules: $("#smartRules").value.trim(),
    whatsapp_link: $("#smartWhatsapp").value.trim(),
    instance_name: $("#smartInstance").value.trim(),
    evolution_api_url: $("#smartEvolutionUrl").value.trim(),
    evolution_api_key: $("#smartEvolutionKey").value.trim(),
    business_hours: $("#smartHours").value.trim(),
    can_do: $("#smartCan").value.trim(),
    cannot_do: $("#smartCannot").value.trim(),
    notes: $("#smartNotes").value.trim(),
  };
  const agent = await api("/agents/smart", { method: "POST", body: JSON.stringify(payload) });
  notify("Agente gerado com prompt completo.");
  await loadAll();
  els.outputBox.textContent = [
    "Agente criado com sucesso.",
    "Proximo passo: selecione esse agente na area de teste e envie uma pergunta.",
    "",
    "Prompt gerado:",
    agent.system_prompt,
    "",
    "Mensagem inicial:",
    agent.initial_message,
    "",
    "Respostas rapidas:",
    agent.quick_replies,
    "",
    "Copy de vendas:",
    agent.sales_copy,
    "",
    "Resumo para cliente:",
    agent.client_summary,
  ].join("\n");
  document.querySelector("#whatsapp").scrollIntoView({ behavior: "smooth" });
});

els.fillExampleButton.addEventListener("click", () => {
  $("#smartName").value = "Atendente Virtual";
  $("#smartCompany").value = "Loja Modelo";
  $("#smartSegment").value = "Comercio local";
  $("#smartTone").value = "simpatico, objetivo e vendedor";
  $("#smartObjective").value = "Responder interessados, explicar ofertas, qualificar leads e encaminhar para compra pelo WhatsApp.";
  $("#smartProducts").value = "Produtos em promocao, atendimento via WhatsApp, entrega local e pagamento via Pix.";
  $("#smartFaq").value = "Preco, prazo de entrega, formas de pagamento, disponibilidade e garantia.";
  $("#smartRules").value = "Confirmar produto, quantidade, endereco e forma de pagamento antes de finalizar.";
  $("#smartHours").value = "Segunda a sabado, 08h as 19h";
  $("#smartCan").value = "Tirar duvidas, apresentar ofertas, coletar dados e chamar atendimento humano quando necessario.";
  $("#smartCannot").value = "Prometer desconto sem autorizacao, inventar estoque ou confirmar pagamento sem comprovante.";
  $("#smartNotes").value = "Cliente quer um agente simples para vender mais pelo WhatsApp.";
  notify("Exemplo preenchido. Revise e clique em Gerar agente com IA.");
});

els.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const agentId = Number(els.agentSelect.value);
  if (!agentId) {
    notify("Crie um agente primeiro.");
    return;
  }
  const task = await api("/tasks", {
    method: "POST",
    body: JSON.stringify({ agent_id: agentId, prompt: $("#taskPrompt").value.trim() }),
  });
  notify("Tarefa enviada.");
  await loadAll();
  await loadRunDetail(task.id);
});

els.whatsappSendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const agentId = Number(els.agentSelect.value);
  if (!agentId) {
    notify("Selecione um agente.");
    return;
  }
  const result = await api(`/agents/${agentId}/whatsapp/send`, {
    method: "POST",
    body: JSON.stringify({
      number: $("#waNumber").value.trim(),
      text: $("#waText").value.trim(),
    }),
  });
  notify("Mensagem enviada pela Evolution API.");
  els.outputBox.textContent = JSON.stringify(result, null, 2);
});

els.seedButton.addEventListener("click", async () => {
  await api("/admin/seed", { method: "POST" });
  notify("Dados demo criados.");
  await loadAll();
});

els.refreshButton.addEventListener("click", async () => {
  await loadAll();
  notify("Painel atualizado.");
});

function toggleTheme() {
  document.body.classList.toggle("darkMode");
  localStorage.setItem("theme", document.body.classList.contains("darkMode") ? "dark" : "light");
}

els.themeButton.addEventListener("click", toggleTheme);
els.themeButtonTop.addEventListener("click", toggleTheme);
els.notifyButton.addEventListener("click", () => notify("Nenhuma notificacao pendente."));

document.querySelectorAll(".sourceTab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".sourceTab").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    const source = sourceCopy[button.dataset.source];
    $("#sourceTitle").textContent = source.title;
    $("#sourceHelp").textContent = source.help;
    $("#sourceInput").placeholder = source.placeholder;
    $("#sourceInput").value = "";
    $("#sourceInput").focus();
  });
});

els.addSourceButton.addEventListener("click", () => {
  const active = document.querySelector(".sourceTab.active")?.dataset.source || "text";
  const source = sourceCopy[active];
  const value = $("#sourceInput").value.trim();
  if (!value) {
    notify("Digite ou cole uma fonte primeiro.");
    return;
  }
  const current = $("#smartProducts").value.trim();
  $("#smartProducts").value = `${current}\n\n[${source.label}]\n${value}`.trim();
  $("#sourceInput").value = "";
  notify("Fonte adicionada ao agente.");
});

$("#globalSearch").addEventListener("input", (event) => {
  const term = event.target.value.toLowerCase();
  document.querySelectorAll(".item").forEach((node) => {
    node.style.display = node.textContent.toLowerCase().includes(term) ? "" : "none";
  });
});

function renderConversationChart() {
  const chart = $("#conversationChart");
  const base = Math.max(1, state.conversations.length);
  const values = [base, base + 2, Math.max(1, base - 1), base + 4, base + 1, base + 3, base + 5];
  chart.innerHTML = values
    .map((value) => `<span style="height:${Math.min(100, 20 + value * 9)}%" title="${value} conversas"></span>`)
    .join("");
}

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("darkMode");
}

if (window.location.pathname === "/create-agent") {
  window.addEventListener("load", () => {
    document.querySelector("#agents").scrollIntoView({ behavior: "instant", block: "start" });
  });
}

loadAll().catch((error) => {
  els.healthText.textContent = "API indisponivel";
  notify(error.message);
});
