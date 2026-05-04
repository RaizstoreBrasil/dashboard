const $ = (selector) => document.querySelector(selector);

const OBJECTIVES = [
  {
    id: "sales",
    title: "Vender pelo WhatsApp",
    subtitle: "Conduzir leads ate a compra.",
    hint: "Qualifica, apresenta ofertas e chama para a acao.",
  },
  {
    id: "support",
    title: "Atender clientes",
    subtitle: "Responder duvidas com clareza.",
    hint: "Resolve, explica e encaminha quando necessario.",
  },
  {
    id: "schedule",
    title: "Agendar horarios",
    subtitle: "Fechar horario de forma simples.",
    hint: "Coleta nome, horario e confirma disponibilidade.",
  },
  {
    id: "billing",
    title: "Cobrar clientes",
    subtitle: "Lembrar pagamentos sem atrito.",
    hint: "Mantem tom cordial e objetivo.",
  },
  {
    id: "faq",
    title: "Tirar duvidas",
    subtitle: "Responder perguntas frequentes.",
    hint: "Traz respostas padronizadas e consistentes.",
  },
  {
    id: "orders",
    title: "Fazer pedidos",
    subtitle: "Montar e confirmar pedidos.",
    hint: "Percorre itens, quantidades e endereco.",
  },
  {
    id: "tech",
    title: "Suporte tecnico",
    subtitle: "Diagnosticar e orientar.",
    hint: "Faz perguntas simples antes de escalar.",
  },
  {
    id: "aftercare",
    title: "Pos-venda",
    subtitle: "Acompanhar a satisfacao.",
    hint: "Verifica entrega, uso e proximos passos.",
  },
];

const TONES = [
  { id: "professional", title: "Profissional", hint: "Clareza, estrutura e seguranca." },
  { id: "friendly", title: "Simpatico", hint: "Leve, acolhedor e humano." },
  { id: "seller", title: "Vendedor", hint: "Persuasivo e focado em conversao." },
  { id: "fun", title: "Divertido", hint: "Leve e mais descontraido." },
  { id: "formal", title: "Formal", hint: "Mais serio e corporativo." },
  { id: "popular", title: "Raiz / Popular", hint: "Popular, direto e sem enrolacao." },
  { id: "premium", title: "Luxo / Premium", hint: "Elegante, sofisticado e refinado." },
  { id: "direct", title: "Rapido e direto", hint: "Objetivo, curto e pratico." },
];

const RULES = [
  "Sempre pedir nome do cliente",
  "Sempre pedir WhatsApp",
  "Nunca inventar preco",
  "Encaminhar para humano quando nao souber",
  "Confirmar pedido antes de finalizar",
  "Mostrar opcoes em botoes",
  "Enviar resumo no final",
  "Salvar conversa no painel",
];

const TEMPLATES = [
  {
    id: "ropa",
    title: "Loja de roupas",
    segment: "Moda",
    objective: "Vender pelo WhatsApp",
    tone: "premium",
    message: "Ola! Seja bem-vindo(a) a nossa loja. Posso te ajudar com tamanho, modelo ou preco?",
    faq: ["Tem troca?", "Quais tamanhos?", "Tem pronta entrega?"],
    rules: ["Sempre pedir nome do cliente", "Sempre pedir WhatsApp", "Nunca inventar preco"],
    canDo: "Apresentar colecoes, ajudar na escolha e fechar pedido.",
    cannotDo: "Prometer desconto sem autorizacao ou informar estoque sem checar.",
  },
  {
    id: "burger",
    title: "Hamburgueria",
    segment: "Alimentacao",
    objective: "Fazer pedidos",
    tone: "friendly",
    message: "Oi! Bora escolher seu combo? Me diga o que voce quer que eu monto o pedido.",
    faq: ["Tem entrega?", "Quais combos?", "Qual o valor da taxa?"],
    rules: ["Sempre pedir nome do cliente", "Confirmar pedido antes de finalizar", "Mostrar opcoes em botoes"],
    canDo: "Montar pedidos, sugerir combos e registrar endereco.",
    cannotDo: "Prometer tempo de entrega exato sem consultar a operacao.",
  },
  {
    id: "clinic",
    title: "Clinica",
    segment: "Saude",
    objective: "Agendar horarios",
    tone: "professional",
    message: "Ola! Vou te ajudar com o melhor horario disponivel para seu atendimento.",
    faq: ["Atende hoje?", "Quais especialidades?", "Aceita convenio?"],
    rules: ["Sempre pedir nome do cliente", "Sempre pedir WhatsApp", "Encaminhar para humano quando nao souber"],
    canDo: "Agendar, orientar e organizar atendimento.",
    cannotDo: "Passar diagnostico ou prometer resultado clinico.",
  },
  {
    id: "barbershop",
    title: "Barbearia",
    segment: "Beleza",
    objective: "Agendar horarios",
    tone: "popular",
    message: "Fala, meu caro! Quer garantir seu horario hoje?",
    faq: ["Tem barbeiro agora?", "Corta cabelo e barba?", "Qual o valor?"],
    rules: ["Sempre pedir nome do cliente", "Sempre pedir WhatsApp", "Confirmar pedido antes de finalizar"],
    canDo: "Reservar horario, informar servicos e mostrar opcoes.",
    cannotDo: "Confirmar vaga sem verificar agenda.",
  },
  {
    id: "delivery",
    title: "Delivery",
    segment: "Entrega",
    objective: "Fazer pedidos",
    tone: "direct",
    message: "Oi! Me chama com seu pedido e eu organizo tudo rapidinho.",
    faq: ["Tem taxa?", "Quais sabores?", "Entrega agora?"],
    rules: ["Sempre pedir nome do cliente", "Sempre pedir WhatsApp", "Confirmar pedido antes de finalizar"],
    canDo: "Receber pedidos e orientar o fechamento.",
    cannotDo: "Inventar prazo ou taxa de entrega.",
  },
  {
    id: "market",
    title: "Mercado",
    segment: "Varejo",
    objective: "Tirar duvidas",
    tone: "professional",
    message: "Ola! Posso te ajudar com pedidos, disponibilidade e horarios.",
    faq: ["Tem entrega?", "Tem atacado?", "Como faço pedido?"],
    rules: ["Sempre pedir nome do cliente", "Enviar resumo no final", "Salvar conversa no painel"],
    canDo: "Ajudar com disponibilidade, pedidos e orientacoes.",
    cannotDo: "Prometer estoque sem confirmar.",
  },
];

const state = {
  step: 1,
  objectiveId: "sales",
  toneId: "professional",
  selectedRules: new Set(["Sempre pedir nome do cliente", "Encaminhar para humano quando nao souber"]),
  selectedTemplateId: null,
  currentAgentId: null,
  currentCompanyId: null,
  generatedDraft: null,
  factoryPrompt: "",
  thread: "lead",
  chatMessages: [],
};

let agents = [];
let companies = [];
let overview = { counts: {} };
let runs = [];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 2600);
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateMetrics() {
  $("#statCompanies").textContent = overview.counts?.companies ?? companies.length ?? 0;
  $("#statAgents").textContent = overview.counts?.agents ?? agents.length ?? 0;
  $("#statConnected").textContent = agents.filter((agent) => ["connected", "open", "pairing"].includes(agent.whatsapp_status)).length;
  $("#statRuns").textContent = overview.counts?.runs ?? runs.length ?? 0;
}

function getObjective() {
  return OBJECTIVES.find((item) => item.id === state.objectiveId) || OBJECTIVES[0];
}

function getTone() {
  return TONES.find((item) => item.id === state.toneId) || TONES[0];
}

function collectFormData() {
  return {
    companyName: $("#companyName").value.trim(),
    companySegment: $("#companySegment").value.trim(),
    companyCity: $("#companyCity").value.trim(),
    companyWhatsapp: $("#companyWhatsapp").value.trim(),
    businessHours: $("#businessHours").value.trim(),
    products: $("#products").value.trim(),
  };
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function setDefaultExample() {
  setFieldValue("companyName", "Le Doces");
  setFieldValue("companySegment", "Doceria");
  setFieldValue("companyCity", "Sao Jose do Rio Preto");
  setFieldValue("companyWhatsapp", "https://wa.me/5517999999999");
  setFieldValue("businessHours", "Segunda a sexta, 08h as 18h");
  setFieldValue("products", "Bolos, doces, kits festas, sobremesas e encomendas sob medida.");
  state.objectiveId = "sales";
  state.toneId = "premium";
  state.selectedRules = new Set([
    "Sempre pedir nome do cliente",
    "Sempre pedir WhatsApp",
    "Nunca inventar preco",
    "Mostrar opcoes em botoes",
  ]);
  renderAll();
  toast("Exemplo carregado.");
}

function buildWizardDraft() {
  const form = collectFormData();
  const objective = getObjective();
  const tone = getTone();
  const rules = RULES.filter((rule) => state.selectedRules.has(rule));
  const agentName = form.companyName ? `${form.companyName} IA` : "Agente IA";
  const companyName = form.companyName || "Empresa";
  const segment = form.companySegment || objective.title;
  const city = form.companyCity ? `Cidade: ${form.companyCity}` : null;
  const initialMessage =
    templateById(state.selectedTemplateId)?.message ||
    (objective.id === "sales"
      ? `Ola! Eu sou o assistente da ${companyName}. Posso te ajudar com valores, opcoes e pedidos.`
      : `Ola! Eu sou o assistente da ${companyName}. Como posso te ajudar hoje?`);
  const quickReplies = [
    "Quero saber valores",
    "Quero falar com um humano",
    "Quero ver as opcoes",
    "Tenho uma duvida",
  ];
  const flow = [
    "1. Cumprimente de forma curta.",
    "2. Identifique a necessidade principal.",
    "3. Faça uma pergunta de qualificacao por vez.",
    "4. Mostre a melhor opcao com clareza.",
    "5. Confirme o proximo passo e registre o resumo.",
  ];
  const prompt = [
    `Voce e ${agentName}, agente virtual da empresa ${companyName}.`,
    `Segmento: ${segment}.`,
    city ? city : null,
    `Objetivo: ${objective.title.toLowerCase()}.`,
    `Tom de voz: ${tone.title}.`,
    `Horario de atendimento: ${form.businessHours || "nao informado"}.`,
    `Produtos e servicos: ${form.products || "nao informado"}.`,
    `Mensagem inicial: ${initialMessage}`,
    `Fluxo de atendimento: ${flow.join(" ")}`,
    `Regras: ${rules.length ? rules.join("; ") : "seguir boas praticas e nao inventar informacoes"}.`,
    `Perguntas frequentes: ${templateById(state.selectedTemplateId)?.faq?.join(" | ") || "perguntas comuns do negocio"}.`,
    `O que pode fazer: orientar, tirar duvidas, qualificar e encaminhar.`,
    `O que nao pode fazer: inventar preco, prometer sem autorizacao ou finalizar sem confirmar dados.`,
    `Responda em portugues do Brasil, com frases curtas e orientacao pratica.`,
  ]
    .filter(Boolean)
    .join("\n");

  const salesCopy = `${companyName} usa atendimento por WhatsApp para responder mais rapido, vender melhor e organizar cada conversa sem perder oportunidade.`;
  const clientSummary = [
    `Empresa: ${companyName}`,
    `Segmento: ${segment}`,
    `Objetivo: ${objective.title}`,
    `Tom: ${tone.title}`,
    `Canal: WhatsApp`,
  ].join(" | ");

  return {
    companyName,
    companySegment: form.companySegment,
    companyCity: form.companyCity,
    companyWhatsapp: form.companyWhatsapp,
    businessHours: form.businessHours,
    products: form.products,
    objective: objective.title,
    tone: tone.title,
    prompt,
    initialMessage,
    flow: flow.join("\n"),
    quickReplies: quickReplies.join("\n"),
    rules: rules.join("\n"),
    faq: templateById(state.selectedTemplateId)?.faq?.join("\n") || "Perguntas frequentes do negocio.",
    salesCopy,
    clientSummary,
    buttons: [
      "Quero saber valores",
      "Quero falar com um humano",
      "Quero ver as opcoes",
    ],
  };
}

function templateById(id) {
  return TEMPLATES.find((item) => item.id === id) || null;
}

function applyTemplate(template) {
  state.selectedTemplateId = template.id;
  state.objectiveId = template.objective ? OBJECTIVES.find((item) => item.title === template.objective)?.id || state.objectiveId : state.objectiveId;
  state.toneId = template.tone || state.toneId;
  state.selectedRules = new Set(template.rules || []);
  setFieldValue("companySegment", template.segment);
  setFieldValue("products", `Base do nicho: ${template.title}. ${template.canDo} ${template.cannotDo}`);
  setFieldValue("businessHours", "Segunda a sexta, 08h as 18h");
  state.generatedDraft = null;
  state.factoryPrompt = "";
  renderAll();
  generateWizardPrompt(true);
  toast(`Modelo ${template.title} aplicado.`);
}

function renderObjectiveCards() {
  const container = $("#objectiveCards");
  container.innerHTML = OBJECTIVES.map((item) => {
    const active = item.id === state.objectiveId ? "active" : "";
    return `
      <button class="choiceCard ${active}" type="button" data-objective="${item.id}">
        <strong>${item.title}</strong>
        <span>${item.subtitle}</span>
        <small>${item.hint}</small>
      </button>
    `;
  }).join("");
  container.querySelectorAll("[data-objective]").forEach((button) => {
    button.addEventListener("click", () => {
      state.objectiveId = button.dataset.objective;
      renderObjectiveCards();
      renderChatQuickReplies();
    });
  });
}

function renderToneCards() {
  const container = $("#toneCards");
  container.innerHTML = TONES.map((item) => {
    const active = item.id === state.toneId ? "active" : "";
    return `
      <button class="choiceCard ${active}" type="button" data-tone="${item.id}">
        <strong>${item.title}</strong>
        <span>${item.hint}</span>
      </button>
    `;
  }).join("");
  container.querySelectorAll("[data-tone]").forEach((button) => {
    button.addEventListener("click", () => {
      state.toneId = button.dataset.tone;
      renderToneCards();
      renderChatQuickReplies();
    });
  });
}

function renderRuleChecks() {
  const container = $("#ruleChecks");
  container.innerHTML = RULES.map((rule) => {
    const checked = state.selectedRules.has(rule) ? "checked" : "";
    return `
      <label class="checkCard">
        <input type="checkbox" ${checked} data-rule="${rule}" />
        <span>${rule}</span>
      </label>
    `;
  }).join("");
  container.querySelectorAll("[data-rule]").forEach((input) => {
    input.addEventListener("change", () => {
      const rule = input.dataset.rule;
      if (input.checked) state.selectedRules.add(rule);
      else state.selectedRules.delete(rule);
      updatePromptPreview();
    });
  });
}

function renderTemplates() {
  const container = $("#templateGrid");
  container.innerHTML = TEMPLATES.map((template) => {
    const active = template.id === state.selectedTemplateId ? "active" : "";
    return `
      <button class="templateCard ${active}" type="button" data-template="${template.id}">
        <strong>${template.title}</strong>
        <span>${template.segment}</span>
        <small>Objetivo: ${template.objective}</small>
      </button>
    `;
  }).join("");
  container.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = templateById(button.dataset.template);
      if (template) applyTemplate(template);
    });
  });
}

function setStep(step) {
  state.step = Math.max(1, Math.min(5, step));
  document.querySelectorAll(".wizardStep").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.step) === state.step);
  });
  document.querySelectorAll(".stepPanel").forEach((panel) => {
    panel.classList.toggle("active", Number(panel.dataset.panel) === state.step);
  });
  const help = {
    1: "Etapa 1 de 5: cadastre a empresa.",
    2: "Etapa 2 de 5: escolha o objetivo do agente.",
    3: "Etapa 3 de 5: defina a personalidade.",
    4: "Etapa 4 de 5: marque as regras do atendimento.",
    5: "Etapa 5 de 5: gere, salve e teste.",
  };
  $("#stepHelp").textContent = help[state.step];
  $("#progressFill").style.width = `${(state.step / 5) * 100}%`;
  $("#prevStepButton").disabled = state.step === 1;
  $("#nextStepButton").textContent = state.step === 5 ? "Finalizar" : "Continuar";
  if (state.step === 5) updatePromptPreview();
}

function updatePromptPreview() {
  state.generatedDraft = buildWizardDraft();
  const draft = state.generatedDraft;
  $("#promptPreview").textContent = [
    "PROMPT PRINCIPAL",
    draft.prompt,
    "",
    "MENSAGEM INICIAL",
    draft.initialMessage,
    "",
    "FLUXO DE ATENDIMENTO",
    draft.flow,
    "",
    "RESPOSTAS RAPIDAS",
    draft.quickReplies,
    "",
    "REGRAS",
    draft.rules || "Nenhuma regra selecionada.",
    "",
    "COPY DE VENDAS",
    draft.salesCopy,
    "",
    "RESUMO INTERNO",
    draft.clientSummary,
  ].join("\n");
  $("#draftStatus").textContent = "Prompt pronto";
  renderChatQuickReplies();
  if (!state.chatMessages.length) {
    resetChat(false);
  }
}

function renderWizard() {
  renderObjectiveCards();
  renderToneCards();
  renderRuleChecks();
  updatePromptPreview();
}

function renderChatQuickReplies() {
  const container = $("#chatQuickReplies");
  const draft = state.generatedDraft || buildWizardDraft();
  const replies = draft.quickReplies.split("\n").filter(Boolean);
  container.innerHTML = replies
    .map((reply) => `<button type="button" class="quickReply">${reply}</button>`)
    .join("");
  container.querySelectorAll(".quickReply").forEach((button) => {
    button.addEventListener("click", () => sendChatMessage(button.textContent.trim(), true));
  });
}

function chatThreadIntro(thread) {
  const draft = state.generatedDraft || buildWizardDraft();
  const objective = getObjective().title.toLowerCase();
  if (thread === "support") {
    return "Tenho uma duvida e preciso de ajuda.";
  }
  if (thread === "schedule") {
    return "Quero agendar um horario.";
  }
  if (objective.includes("vender")) {
    return "Quero saber valores e como comprar.";
  }
  return draft.initialMessage || "Oi, tudo bem?";
}

function simulateReply(userText) {
  const tone = getTone();
  const objective = state.objectiveId;
  const text = userText.toLowerCase();
  const draft = state.generatedDraft || buildWizardDraft();

  if (text.includes("oi") || text.includes("ola") || text.includes("olá")) {
    return draft.initialMessage;
  }
  if (text.includes("valor") || text.includes("preco") || text.includes("preço")) {
    return objective === "billing"
      ? "Claro. Posso verificar o valor em aberto e te passar o resumo do pagamento."
      : `Tenho opcoes disponiveis. Posso te mostrar o melhor caminho com ${tone.title.toLowerCase()} e objetividade.`;
  }
  if (text.includes("humano") || text.includes("atendente")) {
    return "Perfeito. Vou encaminhar para um humano e salvar o resumo da conversa.";
  }
  if (text.includes("agendar") || text.includes("horario") || text.includes("horário")) {
    return "Me diga seu nome e o melhor dia/horario para eu organizar o agendamento.";
  }
  if (text.includes("pedido") || text.includes("comprar")) {
    return "Fechado. Me manda os itens desejados que eu organizo o pedido e confirmo com voce.";
  }
  if (text.includes("taxa") || text.includes("entrega")) {
    return "Vou conferir a melhor opcao disponivel e te passo o resumo certo antes de finalizar.";
  }
  if (text.includes("duvida") || text.includes("dúvida")) {
    return "Pode me explicar um pouco mais? Assim eu te respondo com mais precisao.";
  }
  return `Entendi. Vou seguir o fluxo com tom ${tone.title.toLowerCase()} e registrar o proximo passo.`;
}

function renderChat() {
  const container = $("#chatMessages");
  if (!state.chatMessages.length) {
    container.innerHTML = `
      <div class="emptyChat">
        <strong>Digite uma mensagem para testar</strong>
        <span>Use os botoes rapidos ou escreva como um cliente real faria.</span>
      </div>
    `;
    $("#chatAgentName").textContent = state.currentAgentId ? `Agente #${state.currentAgentId}` : "Agente em teste";
    $("#chatAgentStatus").textContent = "Pronto para conversar";
    return;
  }
  container.innerHTML = state.chatMessages
    .map((message) => `
      <div class="bubble ${message.role}">
        <span>${message.role === "assistant" ? "Agente" : "Cliente"}</span>
        <p>${message.text}</p>
      </div>
    `)
    .join("");
  container.scrollTop = container.scrollHeight;
  const currentAgent = agents.find((agent) => agent.id === state.currentAgentId);
  $("#chatAgentName").textContent = currentAgent ? currentAgent.name : "Agente em teste";
  $("#chatAgentStatus").textContent = currentAgent?.whatsapp_status || "Pronto para conversar";
}

function resetChat(announce = true) {
  const intro = chatThreadIntro(state.thread);
  state.chatMessages = [
    { role: "assistant", text: intro },
  ];
  renderChat();
  if (announce) toast("Teste limpo.");
}

async function sendChatMessage(text, fromQuick = false) {
  const message = text.trim();
  if (!message) return;
  if (!fromQuick) $("#chatInput").value = "";
  state.chatMessages.push({ role: "user", text: message });
  renderChat();
  $("#chatAgentStatus").textContent = "Digitando...";
  setTimeout(() => {
    state.chatMessages.push({ role: "assistant", text: simulateReply(message) });
    renderChat();
    $("#chatAgentStatus").textContent = "Respondido";
  }, 500);
}

function renderAgents() {
  const select = $("#agentSelect");
  const options = agents
    .map((agent) => `<option value="${agent.id}">${agent.name} #${agent.id}</option>`)
    .join("");
  select.innerHTML = options || "<option value=\"\">Nenhum agente</option>";
  if (state.currentAgentId && agents.some((agent) => agent.id === state.currentAgentId)) {
    select.value = String(state.currentAgentId);
  } else if (agents[0]) {
    select.value = String(agents[0].id);
    state.currentAgentId = agents[0].id;
  }

  const list = $("#agentList");
  list.innerHTML = agents.length
    ? agents
        .map((agent) => {
          const status = agent.whatsapp_status || "desconectado";
          return `
            <article class="agentCard">
              <div class="agentTop">
                <div>
                  <strong>${agent.name}</strong>
                  <span>${agent.segment || "sem segmento"} | ${status}</span>
                </div>
                <span class="statusBadge">${agent.status || "draft"}</span>
              </div>
              <p>${agent.objective || "Agente sem objetivo definido."}</p>
              <div class="cardActions">
                <button type="button" data-select-agent="${agent.id}">Testar</button>
                <button type="button" data-connect-agent="${agent.id}" class="ghostButton">Conectar WhatsApp</button>
                <button type="button" data-copy-agent="${agent.id}" class="ghostButton">Copiar resumo</button>
              </div>
            </article>
          `;
        })
        .join("")
    : "<p class=\"emptyState\">Nenhum agente criado ainda.</p>";

  list.querySelectorAll("[data-select-agent]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.selectAgent);
      state.currentAgentId = id;
      select.value = String(id);
      const agent = agents.find((item) => item.id === id);
      if (agent?.client_summary) {
        $("#promptPreview").textContent = agent.system_prompt || agent.client_summary;
      }
      scrollToSection("chatTester");
      resetChat(false);
      toast(`Agente ${id} pronto para teste.`);
    });
  });

  list.querySelectorAll("[data-connect-agent]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.connectAgent);
      state.currentAgentId = id;
      select.value = String(id);
      scrollToSection("connectBox");
      toast("Selecione a instancia e conecte o WhatsApp.");
    });
  });

  list.querySelectorAll("[data-copy-agent]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.copyAgent);
      const agent = agents.find((item) => item.id === id);
      if (!agent) return;
      const text = agent.client_summary || agent.system_prompt || agent.description || agent.name;
      await navigator.clipboard.writeText(text);
      toast("Resumo copiado.");
    });
  });

  updateMetrics();
}

function renderAll() {
  renderWizard();
  renderTemplates();
  renderChatQuickReplies();
  renderChat();
  updateMetrics();
}

async function loadData() {
  const [agentList, companyList, runList, overviewData] = await Promise.all([
    api("/agents"),
    api("/admin/companies"),
    api("/runs"),
    api("/admin/overview"),
  ]);
  agents = agentList;
  companies = companyList;
  runs = runList;
  overview = overviewData;
  renderAgents();
  renderAll();
}

function buildFactoryPrompt() {
  const type = $("#promptType").value;
  const niche = $("#promptNiche").value.trim() || "negocio";
  const objective = $("#promptObjective").value.trim() || "atender clientes";
  const tone = $("#promptTone").value;
  const channel = $("#promptChannel").value;
  const level = $("#promptLevel").value;
  return [
    `Tipo de prompt: ${type}.`,
    `Nicho: ${niche}.`,
    `Objetivo: ${objective}.`,
    `Tom de voz: ${tone}.`,
    `Canal: ${channel}.`,
    `Nivel: ${level}.`,
    `Instrucoes: responda em portugues, seja claro, evite enrolacao e conduza para a proxima acao.`,
    `Estrutura: contextualizacao, resposta curta, proximo passo e resumo final.`,
  ].join("\n");
}

function polishFactoryPrompt(mode) {
  const base = state.factoryPrompt || buildFactoryPrompt();
  const toneByMode = {
    better: `${base}\n\nRefine a estrutura, organize as instrucoes e elimine redundancias.`,
    seller: `${base}\n\nDeixe mais vendedor, com chamada clara para a acao e foco em conversao.`,
    short: `${base}\n\nEncurte o texto mantendo o essencial e removendo exageros.`,
    human: `${base}\n\nTorne mais humano, acolhedor e natural, sem perder objetividade.`,
    pro: `${base}\n\nAjuste para ficar mais profissional, confiante e consistente.`,
  };
  return toneByMode[mode] || base;
}

function updateFactoryOutput(text) {
  state.factoryPrompt = text;
  $("#factoryPromptOutput").textContent = text;
  $("#factoryStatus").textContent = "Prompt pronto";
}

async function submitWizard(activate = false) {
  const draft = state.generatedDraft || buildWizardDraft();
  const payload = {
    workspace_id: 1,
    company_id: state.currentCompanyId || null,
    company_name: draft.companyName,
    name: draft.companyName ? `${draft.companyName} IA` : "Agente IA",
    segment: draft.companySegment || getObjective().title,
    objective: draft.objective,
    tone: draft.tone,
    products: draft.products,
    faq: draft.faq,
    service_rules: draft.rules || "Seguir boas praticas e nao inventar informacoes.",
    whatsapp_link: draft.companyWhatsapp,
    initial_message: draft.initialMessage,
    business_hours: draft.businessHours,
    can_do: "Atender, vender, tirar duvidas, qualificar e encaminhar.",
    cannot_do: "Inventar preco, prometer sem autorizacao ou finalizar sem confirmar.",
    model: $("#promptLevel").value === "avancado" ? "gpt-4.1" : "gpt-4.1-mini",
    status: activate ? "active" : "draft",
    temperature: 0.4,
    evolution_api_url: $("#evolutionUrl").value.trim() || null,
    evolution_api_key: $("#evolutionKey").value.trim() || null,
    instance_name: $("#instanceName").value.trim() || null,
  };
  const result = await api("/agents/smart", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.currentAgentId = result.id;
  state.currentCompanyId = result.generated_assets?.company_id || payload.company_id || null;
  await loadData();
  $("#agentSelect").value = String(result.id);
  $("#chatAgentName").textContent = result.name;
  $("#chatAgentStatus").textContent = result.whatsapp_status || "draft";
  toast(activate ? "Agente criado e ativado." : "Agente salvo.");
  return result;
}

async function savePromptAsModel() {
  const text = state.factoryPrompt || buildFactoryPrompt();
  const body = {
    data: {
      workspace_id: 1,
      agent_id: state.currentAgentId || null,
      title: `Prompt - ${$("#promptNiche").value.trim() || "Modelo"}`,
      content: text,
      tone: $("#promptTone").value,
      objective: $("#promptObjective").value.trim() || $("#promptType").value,
      status: "active",
    },
  };
  await api("/admin/prompts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  toast("Prompt salvo como modelo.");
}

function bindEvents() {
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => scrollToSection(button.dataset.jump));
  });

  document.querySelectorAll(".wizardStep").forEach((button) => {
    button.addEventListener("click", () => setStep(Number(button.dataset.step)));
  });

  $("#prevStepButton").addEventListener("click", () => setStep(state.step - 1));
  $("#nextStepButton").addEventListener("click", () => {
    if (state.step < 5) setStep(state.step + 1);
    else scrollToSection("chatTester");
  });

  $("#fillExampleButton").addEventListener("click", setDefaultExample);

  $("#generatePromptButton").addEventListener("click", () => {
    updatePromptPreview();
    setStep(5);
    toast("Prompt gerado.");
  });

  $("#copyPromptButton").addEventListener("click", async () => {
    const text = $("#promptPreview").textContent;
    await navigator.clipboard.writeText(text);
    toast("Prompt copiado.");
  });

  $("#createAgentButton").addEventListener("click", () => submitWizard(true).catch((error) => toast(error.message)));
  $("#saveAgentButton").addEventListener("click", () => submitWizard(false).catch((error) => toast(error.message)));
  $("#activateAgentButton").addEventListener("click", () => submitWizard(true).catch((error) => toast(error.message)));

  $("#factoryGenerateButton").addEventListener("click", () => {
    updateFactoryOutput(buildFactoryPrompt());
    toast("Prompt gerado na fabrica.");
  });

  document.querySelectorAll("[data-polish]").forEach((button) => {
    button.addEventListener("click", () => {
      updateFactoryOutput(polishFactoryPrompt(button.dataset.polish));
      toast("Prompt refinado.");
    });
  });

  $("#factoryCopyButton").addEventListener("click", async () => {
    const text = state.factoryPrompt || buildFactoryPrompt();
    await navigator.clipboard.writeText(text);
    toast("Prompt copiado.");
  });

  $("#factorySaveButton").addEventListener("click", () => savePromptAsModel().catch((error) => toast(error.message)));
  $("#factoryToAgentButton").addEventListener("click", () => {
    $("#promptNiche").value = $("#promptNiche").value || "Empresa";
    $("#promptObjective").value = $("#promptObjective").value || "atender clientes";
    $("#companySegment").value = $("#promptNiche").value || $("#companySegment").value;
    $("#products").value = state.factoryPrompt || buildFactoryPrompt();
    setStep(1);
    scrollToSection("wizard");
    toast("Prompt convertido em base de agente.");
  });

  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage($("#chatInput").value).catch((error) => toast(error.message));
  });

  $("#clearChatButton").addEventListener("click", () => resetChat());

  $("#approveAgentButton").addEventListener("click", async () => {
    if (!state.currentAgentId) {
      toast("Crie ou selecione um agente primeiro.");
      return;
    }
    await api(`/agents/${state.currentAgentId}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { status: "active" } }),
    });
    await loadData();
    toast("Agente aprovado.");
  });

  $("#backEditButton").addEventListener("click", () => {
    setStep(1);
    scrollToSection("wizard");
    toast("Volte e edite o agente.");
  });

  $("#connectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const agentId = Number($("#agentSelect").value);
    if (!agentId) {
      toast("Selecione um agente.");
      return;
    }
    await api(`/agents/${agentId}/evolution`, {
      method: "PATCH",
      body: JSON.stringify({
        instance_name: $("#instanceName").value.trim(),
        evolution_api_url: $("#evolutionUrl").value.trim(),
        evolution_api_key: $("#evolutionKey").value.trim(),
      }),
    });
    const instance = await api(`/agents/${agentId}/whatsapp/instance`, {
      method: "POST",
      body: JSON.stringify({ instance_name: $("#instanceName").value.trim() }),
    });
    $("#connectResult").textContent = JSON.stringify(instance, null, 2);
    toast("Instancia criada. Agora conecte o QR.");
    try {
      const connected = await api(`/agents/${agentId}/whatsapp/connect`, { method: "POST" });
      $("#connectResult").textContent = JSON.stringify(connected, null, 2);
      toast("WhatsApp solicitado.");
    } catch (error) {
      $("#connectResult").textContent = error.message;
      toast("Salvo, mas a Evolution precisa da chave correta.");
    }
    await loadData();
  });

  $("#themeToggle").addEventListener("click", () => {
    const current = document.body.dataset.theme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    localStorage.setItem("panel-theme", next);
  });

  $("#agentSelect").addEventListener("change", () => {
    state.currentAgentId = Number($("#agentSelect").value) || null;
  });

  $("#chatModeButton").addEventListener("click", () => scrollToSection("chatTester"));

  $("#threadList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-thread]");
    if (!button) return;
    state.thread = button.dataset.thread;
    document.querySelectorAll(".threadCard").forEach((card) => card.classList.toggle("active", card === button));
    resetChat(false);
    toast("Modo de teste alterado.");
  });
}

function initTheme() {
  const saved = localStorage.getItem("panel-theme");
  if (saved) document.body.dataset.theme = saved;
}

function init() {
  initTheme();
  bindEvents();
  renderAll();
  updateFactoryOutput(buildFactoryPrompt());
  setDefaultExample();
  setStep(1);
  loadData().catch((error) => toast(error.message));
}

init();
