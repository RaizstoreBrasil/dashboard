const neuronTemplates = {
  hora_certa: [
    "Agora sao [hora] em [cidade]! Voce esta na [nome da radio], [slogan]!",
    "[nome da radio] informa: sao [hora]. Seguimos com o melhor do [estilo] pra voce!",
    "Hora certa na [frequencia]: [hora]. [nome da radio], [slogan]!",
  ],
  chamada: [
    "Voce esta ouvindo [nome da radio], [slogan], direto de [cidade].",
    "[nome da radio], na [frequencia], tocando o melhor do [estilo].",
    "Essa e a [nome da radio], a radio que conecta [cidade] com muita musica e informacao.",
  ],
  comercial: [
    "Espaco comercial na [nome da radio]. Sua marca tambem pode aparecer aqui.",
    "Anuncie na [nome da radio] e fale direto com o publico de [cidade].",
    "Comercial na [frequencia]. Divulgue sua empresa com quem entende de radio.",
  ],
  campanha: [
    "Campanha especial da [nome da radio]: participe e fique ligado na nossa programacao.",
    "[cidade] ligada na [nome da radio]. Uma campanha feita pra voce.",
    "A [nome da radio] apoia essa ideia. Participe dessa campanha!",
  ],
  aviso: [
    "Atencao, [cidade]: aviso importante na programacao da [nome da radio].",
    "[nome da radio] informa: fique atento aos comunicados da nossa programacao.",
    "Aviso da [nome da radio], [slogan]. Informacao rapida pra voce.",
  ],
};

const contentTypeToNeuron = {
  "Hora certa": "hora_certa",
  "Chamada da radio": "chamada",
  Comercial: "comercial",
  Campanha: "campanha",
  Aviso: "aviso",
};

const xavierNeurons = [
  { id: "hora_certa", title: "Hora certa", description: "Retorna 3 textos com a hora atual da radio." },
  { id: "chamada", title: "Chamada", description: "Retorna 3 chamadas institucionais da radio." },
  { id: "comercial", title: "Comercial", description: "Retorna 3 textos comerciais fixos." },
  { id: "campanha", title: "Campanha", description: "Retorna 3 textos para campanhas da programacao." },
  { id: "aviso", title: "Aviso", description: "Retorna 3 avisos rapidos para a radio." },
];

const programEvents = [];
const audioQueue = [];
const runnerState = {
  items: [],
  eventQueue: [],
  alerts: [],
  locutorIaCues: [],
  locutorIaPlayback: null,
  audioQueue,
  currentIndex: 0,
  timer: null,
  running: false,
  realtime: false,
  loopAnchorSeconds: null,
  queueCycleSeconds: 0,
};

const locutorIaMemory = {
  lastSpeechByContext: {},
  lastOpenerByContext: {},
};

const defaultCodeMap = {
  INTRO: "Introducao",
  HC: "Hora certa",
  CH: "Chamada da radio",
  CAMP: "Campanha",
  COM: "Comercial",
  MUS: "Musica",
  VIN: "Vinheta",
  ID: "Identificacao",
  LOC: "Locucao",
};

const allowedGradeCodes = new Set(["INTRO", "MUS", "HC", "CH", "CAMP", "COM", "VIN", "ID", "LOC"]);

const $ = (selector) => document.querySelector(selector);

function getCurrentTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function applyTemplate(template, data) {
  const replacements = {
    "[hora]": getCurrentTime(),
    "[cidade]": data.city.trim(),
    "[nome da radio]": data.radioName.trim(),
    "[frequencia]": data.frequency.trim(),
    "[slogan]": data.slogan.trim(),
    "[estilo]": data.style.trim(),
  };

  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    template
  );
}

function runNeuron(neuronId, data) {
  return (neuronTemplates[neuronId] || []).map((template) => applyTemplate(template, data));
}

function hora_certa(data) {
  return runNeuron("hora_certa", data);
}

function chamada(data) {
  return runNeuron("chamada", data);
}

function comercial(data) {
  return runNeuron("comercial", data);
}

function campanha(data) {
  return runNeuron("campanha", data);
}

function aviso(data) {
  return runNeuron("aviso", data);
}

function eventTypeName(item) {
  if (!item) {
    return "programacao";
  }
  if (hasCode(item, ["COM"])) {
    return "retorno_comercial";
  }
  if (hasCode(item, ["MUS"])) {
    return "musica";
  }
  if (hasCode(item, ["CH"])) {
    return "chamada";
  }
  if (hasCode(item, ["HC"])) {
    return "hora_certa";
  }
  if (hasCode(item, ["CAMP"])) {
    return "campanha";
  }
  if (hasCode(item, ["VIN"])) {
    return "vinheta";
  }
  if (hasCode(item, ["ID"])) {
    return "identificacao";
  }
  if (hasCode(item, ["LOC"])) {
    return "locucao";
  }
  return "programacao";
}

function locutorIaTemplatesByContext(data, contextKey) {
  const personality = data.locutorIaPersonality || "popular";
  const templatesByPersonality = {
    formal: {
      retorno_comercial: [
        `Encerrado o intervalo comercial, retomamos a programacao da ${data.radioName}.`,
        `A pausa comercial chegou ao fim. Seguimos na ${data.frequency}.`,
        `Concluido o bloco comercial, prosseguimos com a ${data.radioName}.`,
      ],
      hora_certa: [
        `Hora certa informada. A programacao da ${data.radioName} prossegue.`,
        `Conferida a hora certa, seguimos na ${data.frequency}.`,
        `A hora certa foi ao ar e a sequencia continua.`,
      ],
      chamada: [
        `A chamada da ${data.radioName} foi apresentada. Prosseguimos com a grade.`,
        `Depois da chamada, seguimos com a programacao da ${data.radioName}.`,
        `A marca da emissora segue no ar, agora com a proxima parte da sequencia.`,
      ],
      aviso: [
        `Aviso registrado. A programacao da ${data.radioName} prossegue com atencao.`,
        `Depois do aviso, seguimos na ${data.frequency}.`,
        `A comunicacao foi ao ar e a sequencia continua.`,
      ],
      campanha: [
        `Campanha em destaque. A ${data.radioName} segue com a mensagem no ar.`,
        `A campanha foi apresentada e seguimos com a programacao.`,
        `Depois da campanha, retomamos a sequencia da emissora.`,
      ],
      vinheta: [
        `A vinheta foi executada. A programacao continua na ${data.radioName}.`,
        `Depois da vinheta, damos sequencia a transmissao.`,
        `Identidade da emissora apresentada. Seguimos adiante.`,
      ],
      identificacao: [
        `A identificacao da ${data.radioName} foi concluida. Seguimos com a programacao.`,
        `Voce permanece sintonizado na ${data.radioName}. A sequencia continua.`,
        `Depois da identificacao, retomamos o fluxo normal da grade.`,
      ],
      locucao: [
        `A locucao foi entregue e a programacao prossegue na ${data.radioName}.`,
        `Recado apresentado. Seguimos com a sequencia planejada.`,
        `Com a locucao concluida, continuamos a transmissao.`,
      ],
      programacao: [
        `A programacao da ${data.radioName} continua.`,
        `Seguimos com a transmissao da ${data.frequency}.`,
        `A sequencia segue normalmente na ${data.radioName}.`,
      ],
    },
    popular: {
      retorno_comercial: [
        `Fechou o comercial, agora seguimos na ${data.radioName}.`,
        `Volta com a gente: a programacao ja retomou na ${data.frequency}.`,
        `Terminou o intervalo e a ${data.radioName} continua no ar.`,
      ],
      hora_certa: [
        `Hora certa na area. Bora seguir com a ${data.radioName}.`,
        `Marcou a hora certa e ja seguimos na ${data.frequency}.`,
        `A hora certa passou e a programacao continua.`,
      ],
      chamada: [
        `Chamada dada, agora a ${data.radioName} segue com voce.`,
        `A marca da casa foi ao ar e a programacao continua.`,
        `Seguimos na ${data.radioName} com a proxima parte da grade.`,
      ],
      aviso: [
        `Aviso na area e a programacao segue com voce.`,
        `Depois do aviso, continuamos juntinho na ${data.frequency}.`,
        `A comunicacao entrou e a sequencia continua.`,
      ],
      campanha: [
        `Campanha no ar e a ${data.radioName} segue com a mensagem.`,
        `A campanha foi ao ar e a programacao continua.`,
        `Depois da campanha, seguimos com o que vem agora.`,
      ],
      vinheta: [
        `Vinheta no ar e a ${data.radioName} segue firme.`,
        `Passou a vinheta, bora continuar a sequencia.`,
        `Identidade dada. Agora a programacao continua.`,
      ],
      identificacao: [
        `Identificacao feita. Segue a ${data.radioName}.`,
        `Voce ta com a gente na ${data.frequency}. Agora continua.`,
        `A identidade da radio entrou e a sequencia segue.`,
      ],
      locucao: [
        `Locucao entregue e a programacao segue.`,
        `Recado na tela, agora volta a sequencia.`,
        `Depois da locucao, seguimos com o que vem agora.`,
      ],
      programacao: [
        `A programacao continua na ${data.radioName}.`,
        `Seguimos juntos na ${data.frequency}.`,
        `Bora seguir com a sequencia da ${data.radioName}.`,
      ],
    },
    energetico: {
      retorno_comercial: [
        `Voltou com tudo! Acabou o comercial e a ${data.radioName} ja segue acelerando.`,
        `Intervalo encerrado, e a energia da ${data.radioName} continua no alto!`,
        `Agora sim, de volta com forca total na ${data.frequency}.`,
      ],
      hora_certa: [
        `Hora certa cravada, e a ${data.radioName} nao desacelera!`,
        `Marcamos o horario e ja seguimos com tudo na programacao.`,
        `Depois da hora certa, a energia continua la em cima.`,
      ],
      chamada: [
        `Chamou, chamou e a ${data.radioName} respondeu com energia!`,
        `A marca entrou no ar e a sequencia segue pra frente.`,
        `Segue o jogo na ${data.radioName}, porque agora vem mais.`,
      ],
      aviso: [
        `Aviso dado, e a programacao segue no ritmo certo!`,
        `Atencao redobrada e a ${data.radioName} continua no ar.`,
        `Depois do aviso, seguimos com a energia la em cima.`,
      ],
      campanha: [
        `Campanha no ar e a ${data.radioName} acelera junto!`,
        `A mensagem entrou e a sequencia continua forte.`,
        `Depois da campanha, seguimos em alta no ar.`,
      ],
      vinheta: [
        `Vinheta no ar, energia renovada e a ${data.radioName} segue forte!`,
        `Passou a identidade e agora a sequencia acelera de novo.`,
        `A vinheta entrou e a programacao ganhou ritmo outra vez.`,
      ],
      identificacao: [
        `Identificacao feita, e a ${data.radioName} continua com pegada total!`,
        `Voce esta na ${data.radioName} e a energia segue alta.`,
        `Depois da identificacao, a sequencia continua sem freio.`,
      ],
      locucao: [
        `Locucao entregue, bora pra frente com a ${data.radioName}!`,
        `Recado dado e a sequencia segue forte no ar.`,
        `A fala entrou e a programacao acelera de novo.`,
      ],
      programacao: [
        `A programacao segue em alta na ${data.radioName}!`,
        `Seguimos com energia total na ${data.frequency}.`,
        `Bora continuar a sequencia sem perder o ritmo.`,
      ],
    },
    jovem: {
      retorno_comercial: [
        `Fechou o comercial e ja voltamos no clima da ${data.radioName}.`,
        `Pausa rapidinha, agora a vibe segue na ${data.frequency}.`,
        `Terminou o intervalo e a programacao ja ta de volta.`,
      ],
      hora_certa: [
        `Hora certa na area e a vibe continua na ${data.radioName}.`,
        `Marcou o horario e a programacao segue de boa.`,
        `Depois da hora certa, seguimos com o fluxo.`,
      ],
      chamada: [
        `Chamou a radio, chamou a vibe. Bora seguir.`,
        `A chamada entrou e agora vem mais da ${data.radioName}.`,
        `Seguimos no ar com a proxima parte da sequencia.`,
      ],
      aviso: [
        `Aviso rapido e a vibe segue tranquila.`,
        `A comunicacao entrou e a sequencia continua.`,
        `Depois do aviso, bora pra proxima parte.`,
      ],
      campanha: [
        `Campanha na area e a vibe continua legal demais.`,
        `A mensagem entrou e a programacao segue suave.`,
        `Depois da campanha, seguimos com tudo no ar.`,
      ],
      vinheta: [
        `Vinheta no ar e a vibe segue em frente.`,
        `Passou a identidade e a sequencia continua.`,
        `Depois da vinheta, bora continuar a programacao.`,
      ],
      identificacao: [
        `Identificacao feita e voce segue com a ${data.radioName}.`,
        `Ta na sintonia certa, agora continua a sequencia.`,
        `A identidade entrou e a programacao segue firme.`,
      ],
      locucao: [
        `Locucao entregue e a vibe segue agora.`,
        `Recado dado, bora pra sequencia seguinte.`,
        `A fala entrou e seguimos com tudo no ar.`,
      ],
      programacao: [
        `A programacao continua na ${data.radioName}.`,
        `Seguimos juntos na ${data.frequency}.`,
        `Bora continuar a sequencia da ${data.radioName}.`,
      ],
    },
  };

  const templates = templatesByPersonality[personality] || templatesByPersonality.popular;
  return templates[contextKey] || templates.programacao;
}

function locutorIaPersonalityLabel(personality) {
  const labels = {
    formal: "Formal",
    popular: "Popular",
    energetico: "Energetico",
    jovem: "Jovem",
  };
  return labels[personality] || labels.popular;
}

function locutorIaOpenersByContext(data, contextKey) {
  const personality = data.locutorIaPersonality || "popular";
  const openerBank = {
    formal: {
      retorno_comercial: ["Voltamos ao vivo:", "De volta com a programacao:", "Retomamos a transmissao:"],
      hora_certa: ["Agora, a hora certa:", "Neste momento:", "Atualizando o horario:"],
      chamada: ["Na sequencia da emissora:", "A chamada continua:", "Seguimos com a radio:"],
      aviso: ["Atenção:", "Comunicado importante:", "Informacao rapida:"],
      campanha: ["Em destaque:", "Campanha no ar:", "Seguimos com a campanha:"],
      programacao: ["Seguimos em frente:", "A programacao continua:", "Na sequencia:"],
    },
    popular: {
      retorno_comercial: ["Voltamos agora:", "De volta com voce:", "Seguimos juntos:"],
      hora_certa: ["Hora certa na area:", "Agora sao:", "Bora conferir o horario:"],
      chamada: ["Na sintonia da casa:", "Seguimos com a chamada:", "A radio chama:"],
      aviso: ["Olha so:", "Aviso rapidinho:", "Fica ligado:"],
      campanha: ["Campanha na area:", "Olha a campanha:", "Na sequencia da campanha:"],
      programacao: ["Seguimos agora:", "A programacao continua:", "Bora pra frente:"],
    },
    energetico: {
      retorno_comercial: ["Voltamos com tudo:", "De volta no ar:", "Agora sim, seguimos forte:"],
      hora_certa: ["Hora certa cravada:", "Agora sao:", "Marca o relogio:"],
      chamada: ["Bora seguir:", "Na batida da radio:", "Chamada no ar:"],
      aviso: ["Atencao total:", "Recado rapido:", "Fica esperto:"],
      campanha: ["Campanha em alta:", "Olha a campanha:", "Seguimos acelerando:"],
      programacao: ["Seguimos forte:", "A programacao acelera:", "Bora continuar:"],
    },
    jovem: {
      retorno_comercial: ["Voltamos rapidinho:", "De volta na vibe:", "Seguimos no fluxo:"],
      hora_certa: ["Agora sao:", "Hora certa na pista:", "Bora ver o horario:"],
      chamada: ["Na sintonia certa:", "A chamada segue:", "Seguimos no clima:"],
      aviso: ["Ei, olha isso:", "Aviso na tela:", "Fica de olho:"],
      campanha: ["Campanha rolando:", "Olha a campanha:", "Na vibe da campanha:"],
      programacao: ["Seguimos agora:", "Bora continuar:", "A sequencia segue:"],
    },
  };

  const openerSet = openerBank[personality] || openerBank.popular;
  return openerSet[contextKey] || openerSet.programacao;
}

function randomSpeechWithoutImmediateRepeat(options, lastSpeech) {
  if (!options.length) {
    return "";
  }

  const normalizedLastSpeech = String(lastSpeech || "").trim();
  const available = options.length > 1 ? options.filter((option) => String(option || "").trim() !== normalizedLastSpeech) : options;
  const pool = available.length ? available : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function locutorIaContextForItem(item, previousItem = null) {
  if (hasCode(item, ["HC"])) {
    return "hora_certa";
  }
  if (hasCode(item, ["CH"])) {
    return "chamada";
  }
  if (hasCode(item, ["CAMP"])) {
    return "campanha";
  }
  if (hasCode(item, ["LOC"])) {
    return "aviso";
  }
  if (item?.type === "campanha") {
    return "campanha";
  }
  if (previousItem && hasCode(previousItem, ["COM"])) {
    return "retorno_comercial";
  }
  return "programacao";
}

function generateLocutorIaSpeech(data, previousItem, contextKey = null) {
  const resolvedContext = contextKey || locutorIaContextForItem(null, previousItem);
  const openers = locutorIaOpenersByContext(data, resolvedContext);
  const bodies = locutorIaTemplatesByContext(data, resolvedContext);
  const lastSpeech = locutorIaMemory.lastSpeechByContext[resolvedContext] || "";
  const lastOpener = locutorIaMemory.lastOpenerByContext[resolvedContext] || "";
  const opener = randomSpeechWithoutImmediateRepeat(openers, lastOpener);
  const speechBodies = randomSpeechWithoutImmediateRepeat(bodies, lastSpeech);
  const speech = `${opener} ${speechBodies}`.trim();
  locutorIaMemory.lastOpenerByContext[resolvedContext] = opener;
  locutorIaMemory.lastSpeechByContext[resolvedContext] = speech;
  return speech;
}

const neuronFunctions = {
  hora_certa,
  chamada,
  comercial,
  campanha,
  aviso,
};

function generateXavierTexts(data) {
  const neuronId = contentTypeToNeuron[data.contentType] || "hora_certa";
  return neuronFunctions[neuronId](data);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getFormData() {
  const form = new FormData($("#xavierForm"));
  return {
    radioName: form.get("radioName") || "",
    city: form.get("city") || "",
    frequency: form.get("frequency") || "",
    slogan: form.get("slogan") || "",
    style: form.get("style") || "",
    locutorIaPersonality: form.get("locutorIaPersonality") || "popular",
    contentType: form.get("contentType") || "Hora certa",
  };
}

function getRadioContext() {
  const data = getFormData();
  return {
    radioName: data.radioName.trim() || "sua radio",
    city: data.city.trim() || "sua cidade",
    frequency: data.frequency.trim() || "sua frequencia",
    slogan: data.slogan.trim() || "a sua melhor companhia",
    style: data.style.trim() || "estilo da programacao",
    locutorIaPersonality: data.locutorIaPersonality,
    contentType: data.contentType,
  };
}

function validateRadioData(data) {
  if (!data.radioName || !data.city || !data.frequency || !data.slogan || !data.style || !data.locutorIaPersonality) {
    $("#xavierForm").reportValidity();
    notify("Preencha os dados da radio antes de testar.");
    return false;
  }
  return true;
}

function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function renderNeurons() {
  $("#xavierNeurons").innerHTML = xavierNeurons
    .map(
      (neuron) => `
        <article class="neuronCard">
          <div>
            <span>${escapeHtml(neuron.id)}</span>
            <h3>${escapeHtml(neuron.title)}</h3>
            <p>${escapeHtml(neuron.description)}</p>
          </div>
          <button type="button" data-test-neuron="${escapeHtml(neuron.id)}">Testar</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-test-neuron]").forEach((button) => {
    button.addEventListener("click", () => {
      const data = getFormData();
      if (!validateRadioData(data)) {
        return;
      }

      const neuronId = button.dataset.testNeuron;
      renderResults(neuronFunctions[neuronId](data));
      notify(`Neuronio ${neuronId} testado.`);
    });
  });
}

function renderResults(texts) {
  const results = $("#xavierResults");
  results.innerHTML = texts
    .map(
      (text, index) => `
        <article class="resultCard">
          <div class="cardTop">
            <span>Versao ${index + 1}</span>
          </div>
          <p>${escapeHtml(text)}</p>
          <button type="button" data-copy-text="${escapeHtml(text)}">Copiar texto</button>
        </article>
      `
    )
    .join("");

  results.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyText || "");
      notify("Texto copiado com sucesso.");
    });
  });
}

function eventSeverity(event) {
  if (event.status === "ausente" || event.type === "falha") {
    return "alta";
  }
  if (event.status === "atrasado") {
    return "media";
  }
  return "normal";
}

function addProgramEvent(event) {
  programEvents.push({ ...event, id: crypto.randomUUID?.() || String(Date.now()) });
  programEvents.sort((a, b) => a.time.localeCompare(b.time));
  renderProgramEvents();
}

function renderProgramEvents() {
  const list = $("#programEventList");
  if (!programEvents.length) {
    list.innerHTML = '<p class="emptyState">Nenhum evento recebido ainda.</p>';
    return;
  }

  list.innerHTML = programEvents
    .map(
      (event) => `
        <article class="eventCard severity-${eventSeverity(event)}">
          <div>
            <strong>${escapeHtml(event.time)} - ${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(event.type)} | ${escapeHtml(event.status)}</span>
          </div>
          ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function recommendation(type, priority, title, text) {
  return { type, priority, title, text };
}

function analyzeScheduleEvents(events, radio) {
  if (!events.length) {
    return [
      recommendation(
        "alerta",
        "media",
        "Grade vazia",
        "Nenhum evento foi recebido da programacao. Confirme se a automacao Playlist Digital esta enviando a grade antes de iniciar a analise operacional."
      ),
    ];
  }

  const recommendations = [];
  const commercials = events.filter((event) => event.type === "comercial");
  const campaigns = events.filter((event) => event.type === "campanha");
  const failures = events.filter((event) => event.type === "falha" || event.status === "ausente");
  const delayed = events.filter((event) => event.status === "atrasado");
  const musicBlocks = events.filter((event) => event.type === "musica");
  const hasSpeechBridge = events.some((event) => ["vinheta", "noticia", "campanha"].includes(event.type));

  failures.forEach((event) => {
    recommendations.push(
      recommendation(
        "alerta",
        "alta",
        `Verificar ${event.title}`,
        `Alerta operacional: o evento "${event.title}" esta marcado como ${event.status}. Confira a automacao antes do proximo bloco e prepare uma fala curta de contingencia na ${radio.radioName}.`
      )
    );
  });

  delayed.forEach((event) => {
    recommendations.push(
      recommendation(
        "melhoria",
        "media",
        `Ajustar atraso em ${event.time}`,
        `O evento "${event.title}" esta atrasado. Sugestao: compensar com uma chamada curta e reposicionar o proximo bloco sem interromper o fluxo do ${radio.style}.`
      )
    );
  });

  if (commercials.length >= 2) {
    recommendations.push(
      recommendation(
        "comercial",
        "normal",
        "Reforcar bloco comercial",
        `Ha ${commercials.length} eventos comerciais na grade. Sugestao de fala: "Intervalo comercial na ${radio.radioName}, na ${radio.frequency}. A programacao volta ja com o melhor do ${radio.style}."`
      )
    );
  }

  if (campaigns.length > 0) {
    recommendations.push(
      recommendation(
        "campanha",
        "normal",
        "Criar chamada de campanha",
        `Existe campanha programada. Sugestao: "A ${radio.radioName} convida ${radio.city} para participar dessa campanha. Fique ligado na nossa programacao e acompanhe os proximos detalhes."`
      )
    );
  }

  if (musicBlocks.length >= 3 && !hasSpeechBridge) {
    recommendations.push(
      recommendation(
        "melhoria",
        "media",
        "Inserir respiro de locucao",
        `A grade tem varios blocos musicais seguidos. Sugestao: inserir uma chamada curta da ${radio.radioName} para reforcar marca, cidade e slogan sem tocar audio automaticamente.`
      )
    );
  }

  recommendations.push(
    recommendation(
      "fala",
      "normal",
      "Fala pronta para operador",
      `Voce esta na ${radio.radioName}, ${radio.slogan}. Direto de ${radio.city}, seguimos na ${radio.frequency} com uma programacao pensada para quem curte ${radio.style}.`
    )
  );

  return recommendations;
}

function renderRecommendations(recommendations) {
  const panel = $("#xavierRecommendations");
  $("#recommendationCount").textContent = `${recommendations.length} ${recommendations.length === 1 ? "item" : "itens"}`;

  panel.innerHTML = recommendations
    .map(
      (item) => `
        <article class="recommendationCard priority-${escapeHtml(item.priority)}">
          <div class="cardTop">
            <span>${escapeHtml(item.type)} | ${escapeHtml(item.priority)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
          <button type="button" data-copy-text="${escapeHtml(item.text)}">Copiar recomendacao</button>
        </article>
      `
    )
    .join("");

  panel.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyText || "");
      notify("Recomendacao copiada.");
    });
  });
}

function loadDemoEvents() {
  programEvents.splice(0, programEvents.length);
  [
    { time: "08:00", type: "musica", title: "Sequencia musical manha", status: "executado", note: "Bloco abriu no horario." },
    { time: "08:15", type: "comercial", title: "Comercial mercado local", status: "programado", note: "Anunciante pediu destaque." },
    { time: "08:18", type: "comercial", title: "Comercial farmacia", status: "programado", note: "" },
    { time: "08:30", type: "campanha", title: "Campanha do agasalho", status: "programado", note: "Reforcar participacao da cidade." },
    { time: "08:45", type: "vinheta", title: "Vinheta institucional", status: "ausente", note: "Arquivo nao localizado na automacao." },
  ].forEach(addProgramEvent);
  notify("Eventos de exemplo carregados.");
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo."));
    reader.readAsText(file);
  });
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
}

function parseMapa(text) {
  const map = { ...defaultCodeMap };
  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const equalsMatch = line.match(/^([a-zA-Z0-9_]+)\s*[=;:,]\s*(.+)$/);
      const spaceMatch = line.match(/^([a-zA-Z0-9_]+)\s+(.+)$/);
      const match = equalsMatch || spaceMatch;
      if (!match) {
        return;
      }

      const code = normalizeCode(match[1]);
      const description = match[2].trim();
      if (allowedGradeCodes.has(code) && description) {
        map[code] = description;
      }
    });
  return map;
}

function parseGradeLine(line, index, codeMap) {
  const cleanLine = line.trim();
  const timeMatch = cleanLine.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
  const time = timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : "";
  const withoutTime = timeMatch ? cleanLine.replace(timeMatch[0], "").trim() : cleanLine;
  const parts = withoutTime.split(/[;,\t ]+/).filter(Boolean);
  const code = normalizeCode(parts[0] || cleanLine);
  const title = withoutTime.replace(parts[0] || "", "").trim();
  const validCode = allowedGradeCodes.has(code);
  const description = validCode ? codeMap[code] || "Codigo sem descricao no MAPA" : "Codigo invalido";

  return {
    id: index + 1,
    raw: cleanLine,
    time,
    code,
    title,
    artist: extractArtist(title),
    song: extractSong(title),
    description,
    mapped: validCode && Boolean(codeMap[code]),
    validCode,
  };
}

function parseGrade(text, codeMap) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, index) => parseGradeLine(line, index, codeMap));
}

function summarizeTimelineItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    time: item.time || "",
    code: item.code || "",
    description: item.description || "",
    title: item.title || "",
    raw: item.raw || "",
  };
}

function summarizeQueueItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    kind: item.kind || "programacao",
    time: item.time || "",
    code: item.code || "",
    title: item.title || "",
    description: item.description || "",
    raw: item.raw || "",
    durationSeconds: item.durationSeconds || 0,
  };
}

function estimateLocutorIaAudioDurationMs(text, contextKey) {
  const content = String(text || "").trim();
  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const baseDuration = 900;
  const textFactor = content.length * 28;
  const wordFactor = wordCount * 95;
  const contextFactor = contextKey === "retorno_comercial" ? 1.05 : 1;
  const estimated = Math.round((baseDuration + textFactor + wordFactor) * contextFactor);
  return Math.max(1200, Math.min(9000, estimated));
}

function getAudioQueueJob(cueId) {
  return audioQueue.find((job) => job.cueId === cueId || job.id === cueId) || null;
}

function updateLocutorIaArtifacts(cueId, updates) {
  const job = getAudioQueueJob(cueId);
  if (job) {
    Object.assign(job, updates);
  }

  const queueEvent = runnerState.eventQueue.find((entry) => entry?.id === cueId) || null;
  if (queueEvent) {
    Object.assign(queueEvent, updates);
  }

  if (runnerState.locutorIaPlayback?.cueId === cueId) {
    Object.assign(runnerState.locutorIaPlayback, updates);
  }
}

function clearAudioQueueTimers() {
  audioQueue.forEach((job) => {
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }
  });
}

function resetAudioQueueProcessing() {
  audioQueue.forEach((job) => {
    if (job.status === "processing") {
      job.generationRevision = (job.generationRevision || 0) + 1;
      job.status = "pending";
      job.ready = false;
      job.progress = 0;
      job.startedAt = null;
      job.completedAt = null;
      job.audioPath = null;
      job.audioUrl = null;
      job.provider = null;
      job.result = null;
      if (job.timer) {
        clearTimeout(job.timer);
        job.timer = null;
      }
    }
  });
}

function createLocutorIaCue(lastCommercial, nextItem, radio) {
  const delaySeconds = 1;
  const commercialEnd = typeof lastCommercial.endSeconds === "number" ? lastCommercial.endSeconds : timeToSeconds(nextItem.time);
  const nextStart = typeof nextItem.startSeconds === "number" ? nextItem.startSeconds : timeToSeconds(nextItem.time);
  const cueStart = commercialEnd === null ? null : commercialEnd + delaySeconds;
  const safeToInsert = true;
  const contextKey = "retorno_comercial";
  const speech = generateLocutorIaSpeech(radio, lastCommercial, contextKey);
  const generatedAt = new Date().toISOString();
  const previousEvent = summarizeTimelineItem(lastCommercial);
  const nextEvent = summarizeTimelineItem(nextItem);
  const processingMs = estimateLocutorIaAudioDurationMs(speech, contextKey);
  const processingSeconds = Math.max(1, Math.ceil(processingMs / 1000));

  return {
    id: `LOCUTORIA-${lastCommercial.id}`,
    afterItemId: lastCommercial.id,
    beforeItemId: nextItem.id,
    time: nextItem.time,
    contextKey,
    personality: radio.locutorIaPersonality || "popular",
    cueStart,
    delaySeconds,
    processingMs,
    durationSeconds: processingSeconds,
    safeToInsert,
    speech,
    source: "xavier",
    generatedAt,
    previousEvent,
    nextEvent,
    audioPath: null,
    audioUrl: null,
  };
}

function createLocutorIaCues(items, radio) {
  const cues = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!hasCode(item, ["COM"])) {
      continue;
    }

    let lastCommercial = item;
    let cursor = index + 1;
    while (cursor < items.length && hasCode(items[cursor], ["COM"])) {
      lastCommercial = items[cursor];
      cursor += 1;
    }

    const next = items[cursor];
    if (next && !hasCode(next, ["COM"])) {
      const cue = createLocutorIaCue(lastCommercial, next, radio);
      cues.push(cue);
      const audioJob = {
        id: cue.id,
        cueId: cue.id,
        type: "locutorIa",
        status: "pending",
        source: "xavier",
        generatedAt: cue.generatedAt,
        texto: cue.speech,
        contexto: cue.contextKey,
        estilo: cue.personality,
        horario: cue.time,
        eventoAnterior: cue.previousEvent,
        proximoEvento: cue.nextEvent,
        ready: false,
        progress: 0,
        estimatedProcessingMs: cue.processingMs,
        startedAt: null,
        completedAt: null,
        timer: null,
        result: null,
        audioPath: null,
        audioUrl: null,
        provider: null,
        generationRevision: 0,
      };
      audioQueue.push(audioJob);
    }

    index = cursor - 1;
  }

  return cues;
}

function buildEventQueue(items, locutorIaCues, radio) {
  const queue = [];
  const cueByAfterItemId = new Map(locutorIaCues.map((cue) => [cue.afterItemId, cue]));

  let cursor = 0;
  items.forEach((item, index) => {
    const nextItem = items[index + 1] || null;
    const durationSeconds = item.durationSeconds || getEventDurationByCode(item);
    const baseEvent = {
      ...item,
      kind: "programacao",
      startSeconds: cursor,
      endSeconds: cursor + durationSeconds,
      durationSeconds,
      nextEventId: nextItem?.id || null,
    };
    queue.push(baseEvent);
    cursor = baseEvent.endSeconds;

    const cue = cueByAfterItemId.get(item.id);
    if (cue) {
      const locutorStart = cursor + Number(cue.delaySeconds || 1);
      const locutorEnd = locutorStart + Number(cue.durationSeconds || 6);
      const locutorIaEvent = {
        id: cue.id,
        kind: "locutorIa",
        code: "LOCUTORIA",
        time: cue.time,
        title: "LocutorIA",
        description: "Retorno do locutor",
        raw: cue.speech,
        startSeconds: locutorStart,
        endSeconds: locutorEnd,
        durationSeconds: cue.durationSeconds,
        sourceItemId: item.id,
        nextEventId: nextItem?.id || null,
        contextKey: cue.contextKey,
        personality: cue.personality,
        speech: cue.speech,
        generatedAt: cue.generatedAt,
        previousEvent: cue.previousEvent,
        nextEvent: cue.nextEvent,
        safeToInsert: cue.safeToInsert,
        ready: false,
        audioPath: null,
        audioUrl: null,
      };
      queue.push(locutorIaEvent);
      cursor = locutorEnd;
    }
  });

  const cycleSeconds = cursor;
  return { queue, cycleSeconds };
}

function getEventDurationByCode(item) {
  if (!item) {
    return 60;
  }
  if (hasCode(item, ["MUS"])) {
    return 180;
  }
  if (hasCode(item, ["COM"])) {
    return 30;
  }
  if (hasCode(item, ["CH"])) {
    return 12;
  }
  if (hasCode(item, ["HC"])) {
    return 8;
  }
  if (hasCode(item, ["CAMP"])) {
    return 20;
  }
  if (hasCode(item, ["VIN"])) {
    return 5;
  }
  if (hasCode(item, ["ID"])) {
    return 6;
  }
  if (hasCode(item, ["LOC"])) {
    return 10;
  }
  return 60;
}

function prepareRuntimeTimeline(items) {
  let cursor = 0;
  return items.map((item, index) => {
    const explicitStart = timeToSeconds(item.time);
    const startSeconds = explicitStart !== null ? Math.max(explicitStart, cursor) : cursor;
    const durationSeconds = item.durationSeconds || getEventDurationByCode(item);
    const runtimeItem = {
      ...item,
      startSeconds,
      endSeconds: startSeconds + durationSeconds,
      durationSeconds,
    };
    cursor = runtimeItem.endSeconds;
    return runtimeItem;
  });
}

function extractArtist(title) {
  const parts = String(title || "").split(/\s+-\s+/);
  return parts.length >= 2 ? parts[0].trim() : "";
}

function extractSong(title) {
  const parts = String(title || "").split(/\s+-\s+/);
  return parts.length >= 2 ? parts.slice(1).join(" - ").trim() : String(title || "").trim();
}

function timeToMinutes(time) {
  const match = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function currentClockMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function currentClockSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function timeToSeconds(time) {
  const minutes = timeToMinutes(time);
  return minutes === null ? null : minutes * 60;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isCodeType(item, names) {
  const haystack = `${item.code} ${item.description}`.toLowerCase();
  return names.some((name) => haystack.includes(name));
}

function hasCode(item, codes) {
  return codes.includes(item.code);
}

function validatorAlert(severity, category, title, problem, suggestion, itemIds = []) {
  return { severity, category, title, problem, suggestion, itemIds };
}

function rangeIds(start, end) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function findRecentMatch(items, index, predicate, windowSize) {
  const start = Math.max(0, index - windowSize);
  for (let cursor = start; cursor < index; cursor += 1) {
    if (predicate(items[cursor])) {
      return items[cursor];
    }
  }
  return null;
}

function validateGradeSchedule(items) {
  const alerts = [];
  if (!items.length) {
    return [
      validatorAlert(
        "critico",
        "grade",
        "GRADE sem itens validos",
        "O Validador nao encontrou linhas interpretaveis na GRADE.",
        "Revise o arquivo, confirme se esta em texto puro e se cada linha contem horario ou codigo."
      ),
    ];
  }

  items
    .filter((item) => !item.validCode)
    .forEach((item) => {
      alerts.push(
        validatorAlert(
          "critico",
          "codigo",
          "Codigo invalido",
          `O codigo "${item.code || "SEM CODIGO"}" no item ${item.id} esta fora do padrao aceito.`,
          "Use apenas INTRO, MUS, HC, CH, COM, VIN, ID ou LOC. Este item foi ignorado na interpretacao operacional.",
          [item.id]
        )
      );
    });

  items.forEach((item, index) => {
    const isMusic = hasCode(item, ["MUS"]);
    if (!isMusic) {
      return;
    }

    const sameSong = item.song
      ? findRecentMatch(
          items,
          index,
          (candidate) => hasCode(candidate, ["MUS"]) && candidate.song.toLowerCase() === item.song.toLowerCase(),
          8
        )
      : null;
    const sameArtist = item.artist
      ? findRecentMatch(
          items,
          index,
          (candidate) => hasCode(candidate, ["MUS"]) && candidate.artist.toLowerCase() === item.artist.toLowerCase(),
          6
        )
      : null;

    if (sameSong) {
      alerts.push(
        validatorAlert(
          "critico",
          "musica",
          "Musica repetida muito perto",
          `A musica "${item.song}" aparece novamente no item ${item.id}, depois do item ${sameSong.id}.`,
          "Troque uma das entradas ou aumente o intervalo entre execucoes da mesma musica.",
          [sameSong.id, item.id]
        )
      );
    }

    if (sameArtist) {
      alerts.push(
        validatorAlert(
          "aviso",
          "artista",
          "Artista repetido em sequencia curta",
          `O artista "${item.artist}" reaparece no item ${item.id}, depois do item ${sameArtist.id}.`,
          "Intercale outro artista ou uma vinheta para evitar sensacao de repeticao.",
          [sameArtist.id, item.id]
        )
      );
    }
  });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const next = items[index + 1];
    const isCommercial = hasCode(item, ["COM"]);

    if (isCommercial) {
      let length = 1;
      while (items[index + length] && hasCode(items[index + length], ["COM"])) {
        length += 1;
      }
      if (length >= 4) {
        alerts.push(
          validatorAlert(
            "critico",
            "comercial",
            "Excesso de comerciais seguidos",
            `Foram encontrados ${length} comerciais consecutivos a partir do item ${item.id}.`,
            "Divida o bloco comercial ou insira vinheta/chamada curta para reduzir queda de audiencia.",
            rangeIds(item.id, item.id + length - 1)
          )
        );
      } else if (length >= 3) {
        alerts.push(
          validatorAlert(
            "aviso",
            "comercial",
            "Bloco comercial longo",
            `Ha ${length} comerciais seguidos a partir do item ${item.id}.`,
            "Avalie inserir uma vinheta de transicao antes de retornar a programacao.",
            rangeIds(item.id, item.id + length - 1)
          )
        );
      }
      index += length - 1;
    }

    if (next) {
      const currentMinutes = timeToMinutes(item.time);
      const nextMinutes = timeToMinutes(next.time);
      if (currentMinutes !== null && nextMinutes !== null) {
        const gap = nextMinutes - currentMinutes;
        if (gap > 10) {
          alerts.push(
            validatorAlert(
              "critico",
              "horario",
              "Buraco de horario",
              `Existe um intervalo de ${gap} minutos entre ${item.time} e ${next.time}.`,
              "Confirme se falta item na grade ou ajuste os horarios para evitar silencio operacional.",
              [item.id, next.id]
            )
          );
        } else if (gap < 0) {
          alerts.push(
            validatorAlert(
              "critico",
              "horario",
              "Horario fora de ordem",
              `O item ${next.id} esta com horario anterior ao item ${item.id}.`,
              "Reordene a GRADE por horario antes de validar a programacao.",
              [item.id, next.id]
            )
          );
        }
      }
    }
  }

  items.forEach((item, index) => {
    const previous = items[index - 1];
    const next = items[index + 1];
    const isMusic = hasCode(item, ["MUS"]);
    const isCommercial = hasCode(item, ["COM"]);

    if (isCommercial && previous && next) {
      const hasNearbyVinheta = hasCode(previous, ["VIN"]) || hasCode(next, ["VIN"]);
      if (!hasNearbyVinheta) {
        alerts.push(
          validatorAlert(
            "aviso",
            "vinheta",
            "Comercial sem vinheta proxima",
            `O comercial no item ${item.id} nao tem vinheta antes ou depois.`,
            "Inclua uma vinheta de entrada ou saida para separar melhor o bloco comercial.",
            [item.id]
          )
        );
      }
    }

    if (isMusic && previous && hasCode(previous, ["COM"])) {
      alerts.push(
        validatorAlert(
          "aviso",
          "sequencia",
          "Musica entrou logo apos comercial",
          `O item ${item.id} retorna para musica sem vinheta de transicao apos comercial.`,
          "Insira vinheta, chamada da radio ou hora certa antes da musica.",
          [previous.id, item.id]
        )
      );
    }
  });

  for (let index = 0; index < items.length - 1; index += 1) {
    const item = items[index];
    const next = items[index + 1];
    const bothSpeech = hasCode(item, ["HC", "CH", "ID", "LOC"]) && hasCode(next, ["HC", "CH", "ID", "LOC"]);
    const commercialAfterCommercial = hasCode(item, ["COM"]) && hasCode(next, ["COM"]);

    if (bothSpeech) {
      alerts.push(
        validatorAlert(
          "aviso",
          "sequencia",
          "Sequencia falada muito colada",
          `Os itens ${item.id} e ${next.id} sao conteudos falados em sequencia.`,
          "Separe com vinheta, musica curta ou ajuste a ordem para deixar a programacao mais natural.",
          [item.id, next.id]
        )
      );
    }

    if (commercialAfterCommercial) {
      alerts.push(
        validatorAlert(
          "aviso",
          "sequencia",
          "Comercial logo apos comercial",
          `O item ${next.id} vem imediatamente apos outro comercial.`,
          "Considere inserir VIN, ID ou CH para separar melhor o bloco.",
          [item.id, next.id]
        )
      );
    }
  }

  if (!items.some((item) => hasCode(item, ["VIN"]))) {
    alerts.push(
      validatorAlert(
        "critico",
        "vinheta",
        "Grade sem vinhetas",
        "Nenhuma vinheta foi identificada na GRADE.",
        "Adicione vinhetas de marca entre blocos para melhorar identidade e transicoes.",
        items.map((item) => item.id)
      )
    );
  }

  if (!alerts.length) {
    alerts.push(
      validatorAlert(
        "ok",
        "validacao",
        "Programacao sem alertas graves",
        "O Xavier Validador nao encontrou repeticoes, buracos ou sequencias invalidas pelas regras atuais.",
        "Mesmo assim, faca uma revisao editorial antes da exibicao."
      )
    );
  }

  return alerts;
}

function describeGrade(items, radio) {
  if (!items.length) {
    return "Nenhum item encontrado na GRADE.";
  }

  const first = items[0];
  const last = items[items.length - 1];
  const counts = items.reduce((acc, item) => {
    acc[item.description] = (acc[item.description] || 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([description, count]) => `${description}: ${count}`)
    .join(", ");
  const range = first.time && last.time ? ` entre ${first.time} e ${last.time}` : "";

  return `A grade da ${radio.radioName} tem ${items.length} itens${range}. O Xavier identificou predominancia de: ${topTypes}. A leitura indica uma sequencia operacional que deve ser revisada pelo operador antes de ir ao ar, principalmente nos codigos nao mapeados e em blocos repetidos.`;
}

function findRepeatedRuns(items) {
  const runs = [];
  let start = 0;

  for (let index = 1; index <= items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    if (current && current.code === previous.code) {
      continue;
    }

    const length = index - start;
    if (length >= 3) {
      runs.push({ code: previous.code, description: previous.description, start: start + 1, end: index, length });
    }
    start = index;
  }

  return runs;
}

function findAlternatingPattern(items) {
  if (items.length < 6) {
    return null;
  }

  for (let index = 0; index <= items.length - 6; index += 1) {
    const slice = items.slice(index, index + 6);
    if (slice[0].code === slice[2].code && slice[2].code === slice[4].code && slice[1].code === slice[3].code && slice[3].code === slice[5].code) {
      return {
        start: index + 1,
        end: index + 6,
        first: slice[0].description,
        second: slice[1].description,
      };
    }
  }

  return null;
}

function analyzeGradeItems(items, radio) {
  if (!items.length) {
    return [
      recommendation(
        "grade",
        "media",
        "GRADE vazia",
        "O arquivo GRADE nao trouxe itens interpretaveis. Verifique se o arquivo selecionado esta em texto puro e se cada linha contem pelo menos um codigo."
      ),
    ];
  }

  const insights = [];
  const invalidCodes = items.filter((item) => !item.validCode);
  const unknown = items.filter((item) => item.validCode && !item.mapped);
  const repeatedRuns = findRepeatedRuns(items);
  const alternating = findAlternatingPattern(items);
  const countsByCode = items.reduce((acc, item) => {
    acc[item.code] = (acc[item.code] || 0) + 1;
    return acc;
  }, {});
  const dominant = Object.entries(countsByCode).sort((a, b) => b[1] - a[1])[0];

  if (invalidCodes.length) {
    insights.push(
      recommendation(
        "mapa",
        "alta",
        "Codigos invalidos ignorados",
        `${invalidCodes.length} codigo(s) fora do padrao foram ignorados: ${invalidCodes.map((item) => item.code).filter(Boolean).join(", ")}. Use apenas INTRO, MUS, HC, CH, COM, VIN, ID e LOC.`
      )
    );
  }

  if (unknown.length) {
    insights.push(
      recommendation(
        "mapa",
        "alta",
        "Codigos sem descricao",
        `${unknown.length} codigo(s) permitido(s) nao possuem descricao no MAPA: ${unknown.map((item) => item.code).filter(Boolean).join(", ")}. Complete o MAPA para o operador entender a programacao com seguranca.`
      )
    );
  }

  repeatedRuns.forEach((run) => {
    insights.push(
      recommendation(
        "repeticao",
        "media",
        `Repeticao de ${run.description}`,
        `Os itens ${run.start} a ${run.end} repetem o codigo ${run.code} por ${run.length} vezes. Sugestao: inserir uma chamada, vinheta ou respiro de locucao para quebrar a sequencia.`
      )
    );
  });

  if (alternating) {
    insights.push(
      recommendation(
        "padrao",
        "normal",
        "Padrao alternado detectado",
        `Entre os itens ${alternating.start} e ${alternating.end}, a grade alterna ${alternating.first} e ${alternating.second}. Isso pode ser intencional, mas vale confirmar se nao deixou a programacao previsivel demais.`
      )
    );
  }

  if (dominant && dominant[1] / items.length >= 0.45) {
    const description = items.find((item) => item.code === dominant[0])?.description || dominant[0];
    insights.push(
      recommendation(
        "melhoria",
        "media",
        "Concentracao alta de um codigo",
        `${description} representa ${dominant[1]} de ${items.length} itens da grade. Sugestao: equilibrar a sequencia com elementos de marca, informacao ou campanha da ${radio.radioName}.`
      )
    );
  }

  insights.push(
    recommendation(
      "descricao",
      "normal",
      "Resumo operacional",
      describeGrade(items, radio)
    )
  );

  return insights;
}

function groupAlertsByItem(alerts) {
  return alerts.reduce((acc, alert) => {
    (alert.itemIds || []).forEach((itemId) => {
      acc[itemId] = acc[itemId] || [];
      acc[itemId].push(alert);
    });
    return acc;
  }, {});
}

function timelineClass(alerts) {
  if (alerts.some((alert) => alert.severity === "critico")) {
    return "timeline-critical";
  }
  if (alerts.some((alert) => alert.severity === "aviso")) {
    return "timeline-warning";
  }
  return "";
}

function countItemsByType(items, names) {
  return items.filter((item) => isCodeType(item, names)).length;
}

function getProgramSummary(items, validatorAlerts = []) {
  return {
    musicas: items.filter((item) => hasCode(item, ["MUS"])).length,
    comerciais: items.filter((item) => hasCode(item, ["COM"])).length,
    vinhetas: items.filter((item) => hasCode(item, ["VIN"])).length,
    chamadas: items.filter((item) => hasCode(item, ["CH"])).length,
    horasCertas: items.filter((item) => hasCode(item, ["HC"])).length,
    alertas: validatorAlerts.filter((alert) => alert.severity !== "ok").length,
  };
}

function renderProgramSummary(items, validatorAlerts = []) {
  const summary = getProgramSummary(items, validatorAlerts);
  $("#programSummaryPanel").innerHTML = `
    <article class="summaryMetric"><span>Musicas</span><strong>${summary.musicas}</strong></article>
    <article class="summaryMetric"><span>Comerciais</span><strong>${summary.comerciais}</strong></article>
    <article class="summaryMetric"><span>Vinhetas</span><strong>${summary.vinhetas}</strong></article>
    <article class="summaryMetric"><span>Chamadas</span><strong>${summary.chamadas}</strong></article>
    <article class="summaryMetric"><span>Horas certas</span><strong>${summary.horasCertas}</strong></article>
    <article class="summaryMetric alertMetric"><span>Alertas</span><strong>${summary.alertas}</strong></article>
  `;
}

function setRunnerStatus(status) {
  $("#runnerStatus").textContent = status;
}

function renderCurrentProgramEvent() {
  const box = $("#currentProgramEvent");
  const item = runnerState.eventQueue[runnerState.currentIndex] || runnerState.items[runnerState.currentIndex];
  if (!item) {
    box.innerHTML = '<p class="emptyState">Analise a GRADE e clique em Iniciar para simular a programacao.</p>';
    setRunnerStatus("parado");
    return;
  }

  const sourceId = item.kind === "locutorIa" ? item.sourceItemId : item.id;
  const alerts = sourceId ? groupAlertsByItem(runnerState.alerts)[sourceId] || [] : [];
  const currentLabel = item.kind === "locutorIa"
    ? "LocutorIA ativo"
    : hasCode(item, ["COM"])
      ? "Comercial tocando"
      : "Agora tocando";
  const duration = eventDurationSeconds(runnerState.currentIndex);
  const remaining = remainingSecondsForCurrent();
  box.innerHTML = `
    <article class="currentEventCard ${timelineClass(alerts)}">
      <div>
        <span>${escapeHtml(currentLabel)}</span>
        <strong>${escapeHtml(item.time || `#${item.id}`)} - ${escapeHtml(item.description || item.title || "Evento")}</strong>
      </div>
      <p>${escapeHtml(item.title || item.raw || item.speech || "")}</p>
      <small>${escapeHtml(item.code || "SEM CODIGO")} | item ${item.id} de ${runnerState.items.length}</small>
      <small>Duracao: ${escapeHtml(formatDuration(duration))} | Restante: ${escapeHtml(formatDuration(remaining))}</small>
    </article>
  `;
  renderNextProgramEvent();
  renderRemainingTime();
  renderEventSpeech(item);
  refreshRunnerStatus();
}

function renderNextProgramEvent() {
  const box = $("#nextProgramEvent");
  const next = runnerState.eventQueue[runnerState.currentIndex + 1] || runnerState.items[runnerState.currentIndex + 1];
  if (!next) {
    box.innerHTML = '<p class="emptyState">Nao ha proximo evento na grade analisada.</p>';
    return;
  }

  box.innerHTML = `
    <article class="nextEventCard">
      <span>Proximo evento da fila</span>
      <strong>${escapeHtml(next.time || `#${next.id}`)} - ${escapeHtml(next.description || next.title || "Evento")}</strong>
      <p>${escapeHtml(next.title || next.raw || next.speech || "")}</p>
      <small>Duracao estimada: ${escapeHtml(formatDuration(eventDurationSeconds(runnerState.currentIndex + 1)))}</small>
    </article>
  `;
}

function eventDurationSeconds(index) {
  const item = runnerState.eventQueue[index] || runnerState.items[index];
  if (item?.durationSeconds) {
    return item.durationSeconds;
  }
  const next = runnerState.eventQueue[index + 1] || runnerState.items[index + 1];
  const itemSeconds = timeToSeconds(item?.time);
  const nextSeconds = timeToSeconds(next?.time);

  if (itemSeconds !== null && nextSeconds !== null && nextSeconds >= itemSeconds) {
    return nextSeconds - itemSeconds;
  }

  return 180;
}

function remainingSecondsForCurrent() {
  const item = runnerState.eventQueue[runnerState.currentIndex] || runnerState.items[runnerState.currentIndex];
  const playback = currentLocutorIaPlaybackForItem(item);

  if (playback?.endsAtSeconds) {
    return Math.max(0, playback.endsAtSeconds - currentClockSeconds());
  }

  if (runnerState.realtime && typeof item?.endSeconds === "number") {
    return Math.max(0, item.endSeconds - currentClockSeconds());
  }

  return eventDurationSeconds(runnerState.currentIndex);
}

function renderRemainingTime() {
  const box = $("#remainingTimeBox");
  const item = runnerState.eventQueue[runnerState.currentIndex] || runnerState.items[runnerState.currentIndex];
  if (!item) {
    box.innerHTML = '<p class="emptyState">O tempo restante aparece aqui durante a simulacao.</p>';
    return;
  }

  const duration = eventDurationSeconds(runnerState.currentIndex);
  const remaining = remainingSecondsForCurrent();
  const label = item.kind === "locutorIa" ? "Tempo restante do LocutorIA" : hasCode(item, ["COM"]) ? "Tempo restante do comercial" : "Tempo restante";
  box.innerHTML = `
    <article class="remainingTimeCard">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatDuration(remaining))}</strong>
      <p>Duracao estimada: ${escapeHtml(formatDuration(duration))}</p>
    </article>
  `;
}

function speechNeuronForItem(item) {
  if (hasCode(item, ["HC"])) {
    return "hora_certa";
  }
  if (hasCode(item, ["CH"])) {
    return "chamada";
  }
  if (hasCode(item, ["CAMP"])) {
    return "campanha";
  }
  if (hasCode(item, ["COM"])) {
    return "comercial";
  }
  if (hasCode(item, ["LOC"])) {
    return "aviso";
  }
  return "";
}

const locutorIaSpeechContexts = new Set(["hora_certa", "chamada", "aviso", "campanha"]);

function locutorIaCueForCurrentItem(item) {
  return runnerState.locutorIaCues.find((cue) => cue.afterItemId === item?.id) || null;
}

function clearLocutorIaPlayback() {
  if (runnerState.locutorIaPlayback?.waitTimer) {
    clearTimeout(runnerState.locutorIaPlayback.waitTimer);
  }
  if (runnerState.locutorIaPlayback?.speakTimer) {
    clearTimeout(runnerState.locutorIaPlayback.speakTimer);
  }
  if (runnerState.locutorIaPlayback?.endTimer) {
    clearTimeout(runnerState.locutorIaPlayback.endTimer);
  }
  runnerState.locutorIaPlayback = null;
}

function currentLocutorIaPlaybackForItem(item) {
  const cue = item?.kind === "locutorIa" ? item : locutorIaCueForCurrentItem(item);
  if (!cue || !runnerState.locutorIaPlayback || runnerState.locutorIaPlayback.cueId !== cue.id) {
    return null;
  }
  return runnerState.locutorIaPlayback;
}

function renderAudioQueueStatus() {
  const box = $("#audioQueueBox");
  if (!box) {
    return;
  }

  if (!audioQueue.length) {
    box.innerHTML = '<p class="emptyState">A fila de audio aparece aqui quando o LocutorIA preparar falas.</p>';
    return;
  }

  const counts = audioQueue.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    { pending: 0, processing: 0, done: 0 }
  );

  box.innerHTML = `
    <article class="audioQueueSummary">
      <span>audioQueue</span>
      <strong>${escapeHtml(String(audioQueue.length))} jobs</strong>
      <p>Pendente: ${escapeHtml(String(counts.pending || 0))} | Processando: ${escapeHtml(String(counts.processing || 0))} | Pronto: ${escapeHtml(String(counts.done || 0))}</p>
    </article>
    <div class="audioQueueList">
      ${audioQueue
        .slice(0, 8)
        .map((job) => {
          const jobLabel = job.status === "processing" ? "Processando" : job.status === "done" ? "Pronto" : "Pendente";
          const payload = job.texto || "";
          return `
            <article class="audioQueueItem queue-${escapeHtml(job.status)}">
              <div class="cardTop">
                <span>${escapeHtml(jobLabel)}</span>
                <span>${escapeHtml(job.contexto || "programacao")} | ${escapeHtml(job.estilo || "popular")}</span>
              </div>
              <p>${escapeHtml(payload)}</p>
              <small>${escapeHtml(job.horario || "")} | ${escapeHtml(job.eventoAnterior?.title || job.eventoAnterior?.description || "")} -> ${escapeHtml(job.proximoEvento?.title || job.proximoEvento?.description || "")}</small>
              <small>${escapeHtml(job.audioPath || "audio pendente")}</small>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

async function generateAudio(job, cue) {
  const payload = {
    job_id: job.id,
    texto: job.texto || cue?.speech || "",
    contexto: job.contexto || cue?.contextKey || "programacao",
    estilo: job.estilo || cue?.personality || "popular",
    horario: job.horario || cue?.time || "",
    evento_anterior: job.eventoAnterior || cue?.previousEvent || null,
    proximo_evento: job.proximoEvento || cue?.nextEvent || null,
    provider: "mock",
  };

  const response = await fetch("/xavier/audio/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao gerar audio: ${response.status} ${detail}`);
  }

  return response.json();
}

async function gerarAudio(job, cue) {
  return generateAudio(job, cue);
}

function refreshRunnerStatus() {
  const item = runnerState.eventQueue[runnerState.currentIndex] || runnerState.items[runnerState.currentIndex];
  const playback = currentLocutorIaPlaybackForItem(item);
  if (playback?.phase === "waiting") {
    setRunnerStatus("LocutorIA ativo");
    return;
  }
  if (playback?.phase === "processing") {
    setRunnerStatus("LocutorIA processando");
    return;
  }
  if (playback?.phase === "showing") {
    setRunnerStatus("LocutorIA no ar");
    return;
  }
  if (!runnerState.eventQueue.length) {
    setRunnerStatus("parado");
    return;
  }
  setRunnerStatus(runnerState.running ? "tempo real" : "parado");
}

function scheduleLocutorIaPlayback(cue, item) {
  if (!cue || !item) {
    return null;
  }

  const job = getAudioQueueJob(cue.id);
  if (job?.status === "done" && job.ready) {
    const donePlayback = runnerState.locutorIaPlayback?.cueId === cue.id
      ? runnerState.locutorIaPlayback
      : {
          cueId: cue.id,
          afterItemId: cue.afterItemId,
          phase: "done",
          speech: cue.speech,
          endsAtSeconds: currentClockSeconds(),
          waitTimer: null,
          speakTimer: null,
          endTimer: null,
          audioPath: job.audioPath || cue.audioPath || null,
          audioUrl: job.audioUrl || cue.audioUrl || null,
      };
    donePlayback.phase = "done";
    donePlayback.audioPath = job.audioPath || cue.audioPath || null;
    donePlayback.audioUrl = job.audioUrl || cue.audioUrl || null;
    runnerState.locutorIaPlayback = donePlayback;
    return donePlayback;
  }

  if (runnerState.locutorIaPlayback?.cueId === cue.id && job?.status === "processing") {
    runnerState.locutorIaPlayback.phase = "processing";
    return runnerState.locutorIaPlayback;
  }

  clearLocutorIaPlayback();

  const processingMs = job?.estimatedProcessingMs || cue.processingMs || estimateLocutorIaAudioDurationMs(cue.speech, cue.contextKey);
  const processingSeconds = Math.max(1, Math.ceil(processingMs / 1000));
  const generationRevision = (job?.generationRevision || 0) + 1;

  const playback = {
    cueId: cue.id,
    afterItemId: cue.afterItemId,
    phase: "processing",
    speech: cue.speech,
    endsAtSeconds: currentClockSeconds() + processingSeconds,
    waitTimer: null,
    speakTimer: null,
    endTimer: null,
    audioPath: job?.audioPath || cue.audioPath || null,
    audioUrl: job?.audioUrl || cue.audioUrl || null,
  };
  runnerState.locutorIaPlayback = playback;
  if (job) {
    job.status = "processing";
    job.ready = false;
    job.progress = 0;
    job.startedAt = new Date().toISOString();
    job.completedAt = null;
    job.estimatedProcessingMs = processingMs;
    job.generationRevision = generationRevision;
    if (job.timer) {
      clearTimeout(job.timer);
    }
    job.audioPath = null;
    job.audioUrl = null;
    job.result = null;
    job.provider = null;
    job.timer = setTimeout(() => {
      const expectedRevision = generationRevision;
      if (job.status !== "processing" || job.generationRevision !== expectedRevision) {
        return;
      }

      (async () => {
        try {
          const result = await gerarAudio(job, cue);
          if (job.generationRevision !== expectedRevision) {
            return;
          }
          updateLocutorIaArtifacts(cue.id, {
            status: "done",
            ready: Boolean(result.ready !== false),
            progress: 100,
            completedAt: new Date().toISOString(),
            timer: null,
            audioPath: result.audioPath || result.audioFile || null,
            audioUrl: result.audioPath || result.audioFile || null,
            provider: result.provider || "mock",
            result,
          });
          if (runnerState.locutorIaPlayback?.cueId === cue.id) {
            runnerState.locutorIaPlayback.phase = "done";
            runnerState.locutorIaPlayback.audioPath = result.audioPath || result.audioFile || null;
            runnerState.locutorIaPlayback.audioUrl = result.audioPath || result.audioFile || null;
            runnerState.locutorIaPlayback.endTimer = null;
          }
          refreshRunnerStatus();
          renderAudioQueueStatus();
          renderCurrentProgramEvent();
        } catch (error) {
          if (job.generationRevision !== expectedRevision) {
            return;
          }
          updateLocutorIaArtifacts(cue.id, {
            status: "pending",
            ready: false,
            progress: 0,
            completedAt: null,
            timer: null,
            result: { error: String(error) },
          });
          if (runnerState.locutorIaPlayback?.cueId === cue.id) {
            runnerState.locutorIaPlayback.phase = "processing";
          }
          refreshRunnerStatus();
          renderAudioQueueStatus();
        }
      })();
    }, processingMs);
    renderAudioQueueStatus();
  }

  return playback;
}

function getLoopElapsedSeconds() {
  const cycle = runnerState.queueCycleSeconds || 0;
  if (!cycle) {
    return currentClockSeconds();
  }
  if (runnerState.loopAnchorSeconds === null) {
    return currentClockSeconds() % cycle;
  }
  const elapsed = currentClockSeconds() - runnerState.loopAnchorSeconds;
  return ((elapsed % cycle) + cycle) % cycle;
}

function findCurrentQueueIndexByClock(queue) {
  if (!queue.length) {
    return 0;
  }

  const nowSeconds = getLoopElapsedSeconds();
  let currentIndex = 0;

  queue.forEach((item, index) => {
    const itemStart = typeof item.startSeconds === "number" ? item.startSeconds : 0;
    const itemEnd = typeof item.endSeconds === "number" ? item.endSeconds : null;
    if (itemStart <= nowSeconds) {
      currentIndex = index;
    }
    if (itemStart <= nowSeconds && itemEnd !== null && nowSeconds < itemEnd) {
      currentIndex = index;
    }
  });

  return currentIndex;
}

function renderEventSpeech(item) {
  const box = $("#eventSpeechBox");
  const radio = getRadioContext();
  const isLocutorIaEvent = item?.kind === "locutorIa";
  const locutorIaCue = isLocutorIaEvent ? item : locutorIaCueForCurrentItem(item);
  if (locutorIaCue) {
    const audioJob = audioQueue.find((entry) => entry.id === locutorIaCue.id) || null;
    if (!isLocutorIaEvent) {
      box.innerHTML = `
        <article class="speechCard">
          <span>LocutorIA preparado pelo Xavier</span>
          <p>Retorno planejado apos o comercial.</p>
          <small>Personalidade: ${escapeHtml(locutorIaPersonalityLabel(locutorIaCue.personality || radio.locutorIaPersonality))}</small>
          <small>Fila de audio: ${escapeHtml(audioJob ? audioJob.status : "pendente")}</small>
          <small>O processamento executa quando o evento LocutorIA entrar na fila.</small>
        </article>
      `;
      renderAudioQueueStatus();
      return;
    }

    const playback = currentLocutorIaPlaybackForItem(item) || scheduleLocutorIaPlayback(locutorIaCue, item);
    if (playback?.phase === "processing") {
      box.innerHTML = `
        <article class="speechCard">
          <span>LocutorIA processando audio</span>
          <p>Gerando MP3 e aguardando liberacao da fila...</p>
          <small>Personalidade: ${escapeHtml(locutorIaPersonalityLabel(locutorIaCue.personality || radio.locutorIaPersonality))}</small>
          <small>Fila de audio: ${escapeHtml(audioJob ? audioJob.status : "pendente")}</small>
          <small>Contexto: ${escapeHtml(locutorIaCue.contextKey || "programacao")} | Tempo de processamento simulado em andamento.</small>
          <small>${escapeHtml(audioJob?.audioPath || "audio ainda nao pronto")}</small>
        </article>
      `;
      renderAudioQueueStatus();
      return;
    }
    if (playback?.phase === "waiting") {
      box.innerHTML = `
        <article class="speechCard">
          <span>LocutorIA ativo</span>
          <p>Aguardando entrada do locutor...</p>
          <small>Personalidade: ${escapeHtml(locutorIaPersonalityLabel(locutorIaCue.personality || radio.locutorIaPersonality))}</small>
          <small>Fila de audio: ${escapeHtml(audioJob ? audioJob.status : "pendente")}</small>
          <small>Delay simulado de ${escapeHtml(String(locutorIaCue.delaySeconds))}s antes da fala. ${escapeHtml(locutorIaCue.safeToInsert ? "Janela segura detectada." : "Janela curta, mas a entrada continua sincronizada.")}</small>
        </article>
      `;
      return;
    }

    box.innerHTML = `
      <article class="speechCard">
        <span>LocutorIA ativo</span>
        <p>${escapeHtml(playback?.speech || locutorIaCue.speech)}</p>
        <small>Contexto: ${escapeHtml(locutorIaCue.contextKey || "programacao")} | Personalidade: ${escapeHtml(locutorIaPersonalityLabel(locutorIaCue.personality || radio.locutorIaPersonality))}</small>
        <small>Fila de audio: ${escapeHtml(audioJob ? audioJob.status : "pendente")}</small>
        <small>Delay simulado de ${escapeHtml(String(locutorIaCue.delaySeconds))}s antes da fala. ${escapeHtml(locutorIaCue.safeToInsert ? "Janela segura detectada." : "Janela curta, mas a entrada continua sincronizada.")}</small>
        <small>Audio: ${escapeHtml(audioJob?.audioPath || "aguardando arquivo")}</small>
        <button type="button" data-copy-text="${escapeHtml(playback?.speech || locutorIaCue.speech)}">Copiar fala</button>
      </article>
    `;
    box.querySelector("[data-copy-text]").addEventListener("click", async (event) => {
      await copyText(event.currentTarget.dataset.copyText || "");
      notify("Fala LocutorIA copiada.");
    });
    return;
  }

  const neuronId = speechNeuronForItem(item);
  if (!neuronId) {
    box.innerHTML = '<p class="emptyState">Este evento nao exige fala automatica nesta fase.</p>';
    return;
  }

  const previousItem = runnerState.items[runnerState.currentIndex - 1] || null;
  const speech = locutorIaSpeechContexts.has(neuronId)
    ? generateLocutorIaSpeech(radio, previousItem, locutorIaContextForItem(item, previousItem))
    : neuronFunctions[neuronId](radio)[0];
  box.innerHTML = `
    <article class="speechCard">
      <span>Fala sugerida</span>
      <p>${escapeHtml(speech)}</p>
      <button type="button" data-copy-text="${escapeHtml(speech)}">Copiar fala</button>
    </article>
  `;
  box.querySelector("[data-copy-text]").addEventListener("click", async (event) => {
    await copyText(event.currentTarget.dataset.copyText || "");
    notify("Fala copiada.");
  });
}

function findCurrentIndexByClock(items) {
  const nowSeconds = currentClockSeconds();
  let currentIndex = 0;

  items.forEach((item, index) => {
    const itemStart = typeof item.startSeconds === "number" ? item.startSeconds : timeToSeconds(item.time);
    const itemEnd = typeof item.endSeconds === "number" ? item.endSeconds : null;
    if (itemStart !== null && itemStart <= nowSeconds) {
      currentIndex = index;
    }
    if (itemStart !== null && itemStart <= nowSeconds && itemEnd !== null && nowSeconds < itemEnd) {
      currentIndex = index;
    }
  });

  return currentIndex;
}

function syncRealtimeNow() {
  if (!runnerState.eventQueue.length) {
    notify("Analise a GRADE e MAPA antes de sincronizar.");
    return;
  }

  runnerState.currentIndex = findCurrentQueueIndexByClock(runnerState.eventQueue);
  renderCurrentProgramEvent();
  renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
  refreshRunnerStatus();
}

function realtimeTick() {
  const previousIndex = runnerState.currentIndex;
  const nextIndex = findCurrentQueueIndexByClock(runnerState.eventQueue);
  const previousItem = runnerState.eventQueue[previousIndex] || runnerState.items[previousIndex];
  const currentPlayback = currentLocutorIaPlaybackForItem(previousItem);

  if (currentPlayback && currentPlayback.phase !== "done" && nextIndex !== previousIndex) {
    renderCurrentProgramEvent();
    renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
    refreshRunnerStatus();
    return;
  }

  runnerState.currentIndex = nextIndex;
  if (previousIndex !== runnerState.currentIndex) {
    renderCurrentProgramEvent();
    renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
  } else {
    renderRemainingTime();
  }
  refreshRunnerStatus();
}

function stopRunner() {
  clearInterval(runnerState.timer);
  runnerState.timer = null;
  runnerState.running = false;
  clearLocutorIaPlayback();
  clearAudioQueueTimers();
  resetAudioQueueProcessing();
  renderAudioQueueStatus();
}

function pauseRunner() {
  stopRunner();
  runnerState.realtime = false;
  setRunnerStatus("pausado");
}

function advanceRunner() {
  if (!runnerState.eventQueue.length) {
    pauseRunner();
    return;
  }

  const item = runnerState.eventQueue[runnerState.currentIndex] || runnerState.items[runnerState.currentIndex];
  const playback = currentLocutorIaPlaybackForItem(item);
  if (playback && playback.phase !== "done") {
    refreshRunnerStatus();
    return;
  }

  runnerState.currentIndex += 1;
  if (runnerState.currentIndex >= runnerState.eventQueue.length) {
    runnerState.currentIndex = 0;
  }
  renderCurrentProgramEvent();
  renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
}

function startRunner() {
  if (!runnerState.eventQueue.length) {
    notify("Analise a GRADE e MAPA antes de iniciar.");
    return;
  }

  stopRunner();
  runnerState.running = true;
  runnerState.realtime = true;
  runnerState.loopAnchorSeconds = currentClockSeconds();
  runnerState.currentIndex = findCurrentQueueIndexByClock(runnerState.eventQueue);
  syncRealtimeNow();
  renderCurrentProgramEvent();
  renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
  runnerState.timer = setInterval(realtimeTick, 1000);
}

function resetRunner() {
  stopRunner();
  runnerState.realtime = false;
  runnerState.currentIndex = 0;
  runnerState.loopAnchorSeconds = null;
  renderCurrentProgramEvent();
  if (runnerState.items.length) {
    renderGradeSummary(runnerState.items, describeGrade(runnerState.items, getRadioContext()), runnerState.alerts);
  }
  setRunnerStatus(runnerState.items.length ? "reiniciado" : "parado");
}

function renderGradeSummary(items, summary, validatorAlerts = []) {
  $("#gradeItemCount").textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
  renderProgramSummary(items, validatorAlerts);
  const alertsByItem = groupAlertsByItem(validatorAlerts);
  const activeQueueEvent = runnerState.eventQueue[runnerState.currentIndex] || null;
  const activeTimelineId = activeQueueEvent?.sourceItemId || activeQueueEvent?.id || runnerState.items[runnerState.currentIndex]?.id || null;
  $("#gradeSummary").innerHTML = `
    <article class="summaryCard">
      <p>${escapeHtml(summary)}</p>
    </article>
    <div class="timelineList">
      ${items
        .slice(0, 40)
        .map(
          (item) => {
            const itemAlerts = alertsByItem[item.id] || [];
              const badges = itemAlerts
              .map((alert) => `<span class="timelineAlert ${alert.severity === "critico" ? "alertCritical" : "alertWarning"}">${escapeHtml(alert.title)}</span>`)
              .join("");
            const activeClass = activeTimelineId === item.id ? "timeline-active" : "";
            return `
            <article class="timelineItem ${item.mapped ? "" : "unmapped"} ${timelineClass(itemAlerts)} ${activeClass}">
              <div class="timelineTime">
                <strong>${escapeHtml(item.time || `#${item.id}`)}</strong>
                <span>${escapeHtml(item.code || "SEM CODIGO")}</span>
              </div>
              <div class="timelineMarker" aria-hidden="true"></div>
              <div class="timelineContent">
                <div class="timelineTop">
                  <strong>${escapeHtml(item.description)}</strong>
                  <span>${escapeHtml(item.mapped ? "mapeado" : "sem mapa")}</span>
                </div>
                ${item.title ? `<p>${escapeHtml(item.title)}</p>` : ""}
                ${badges ? `<div class="timelineAlerts">${badges}</div>` : ""}
              </div>
            </article>
          `;
          }
        )
        .join("")}
    </div>
  `;
}

function renderGradeInsights(insights) {
  $("#gradeInsightCount").textContent = `${insights.length} ${insights.length === 1 ? "analise" : "analises"}`;
  const panel = $("#gradeInsights");
  panel.innerHTML = insights
    .map(
      (item) => `
        <article class="recommendationCard priority-${escapeHtml(item.priority)}">
          <div class="cardTop">
            <span>${escapeHtml(item.type)} | ${escapeHtml(item.priority)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
          <button type="button" data-copy-text="${escapeHtml(item.text)}">Copiar analise</button>
        </article>
      `
    )
    .join("");

  panel.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyText || "");
      notify("Analise copiada.");
    });
  });
}

function renderValidatorAlerts(alerts) {
  const critical = alerts.filter((alert) => alert.severity === "critico").length;
  const warnings = alerts.filter((alert) => alert.severity === "aviso").length;
  $("#validatorCriticalCount").textContent = `${critical} ${critical === 1 ? "critico" : "criticos"}`;
  $("#validatorWarningCount").textContent = `${warnings} ${warnings === 1 ? "aviso" : "avisos"}`;

  const panel = $("#xavierValidatorAlerts");
  panel.innerHTML = alerts
    .map(
      (alert) => `
        <article class="validatorCard validator-${escapeHtml(alert.severity)}">
          <div class="cardTop">
            <span>${escapeHtml(alert.category)} | ${escapeHtml(alert.severity)}</span>
          </div>
          <h3>${escapeHtml(alert.title)}</h3>
          <p>${escapeHtml(alert.problem)}</p>
          <strong>Correcao sugerida</strong>
          <p>${escapeHtml(alert.suggestion)}</p>
          <button type="button" data-copy-text="${escapeHtml(`${alert.title}: ${alert.problem} Sugestao: ${alert.suggestion}`)}">Copiar alerta</button>
        </article>
      `
    )
    .join("");

  panel.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyText || "");
      notify("Alerta copiado.");
    });
  });
}

function loadDemoFiles() {
  $("#gradeText").value = [
    "07:59 INTRO Abertura de hora",
    "08:00 HC",
    "08:01 MUS Artista A - Musica Um",
    "08:05 MUS Artista A - Musica Dois",
    "08:09 MUS Artista A - Musica Um",
    "08:15 CH Chamada institucional",
    "08:18 VIN Vinheta de passagem",
    "08:20 COM Mercado local",
    "08:22 COM Farmacia central",
    "08:24 COM Loja parceira",
    "08:26 COM Supermercado",
    "08:40 LOC Aviso operacional",
    "08:55 XYZ Codigo sem mapa",
    "08:45 HC",
  ].join("\n");

  $("#mapaText").value = [
    "INTRO=Introducao",
    "HC=Hora certa",
    "CH=Chamada da radio",
    "COM=Comercial",
    "MUS=Musica",
    "VIN=Vinheta",
    "ID=Identificacao",
    "LOC=Locucao",
  ].join("\n");
  notify("Exemplo de GRADE e MAPA carregado.");
}

async function testarMapa() {
  const mapa = $("#mapaText").value || "VEM, COM, VEM, HC";
  const box = $("#saida");
  box.innerHTML = '<p class="emptyState">Enviando MAPA para o Xavier...</p>';

  try {
    const response = await fetch("/mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapa }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const eventos = Array.isArray(data.eventos) ? data.eventos : [];

    box.innerHTML = "";
    if (!eventos.length) {
      box.innerHTML = '<p class="emptyState">Nenhum evento relevante foi retornado.</p>';
      return;
    }

    eventos.forEach((evento) => {
      const p = document.createElement("p");
      p.innerText = `${evento.tipo}  ${evento.fala}`;
      box.appendChild(p);
    });
  } catch (error) {
    box.innerHTML = `<p class="emptyState">Falha no teste do MAPA: ${escapeHtml(error.message || String(error))}</p>`;
  }
}

$("#xavierForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const texts = generateXavierTexts(getFormData());
  renderResults(texts);
  notify("Textos gerados.");
});

$("#programEventForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  addProgramEvent({
    time: form.get("eventTime") || "",
    type: form.get("eventType") || "musica",
    title: form.get("eventTitle") || "",
    status: form.get("eventStatus") || "programado",
    note: form.get("eventNote") || "",
  });
  event.currentTarget.reset();
  notify("Evento recebido pelo Xavier.");
});

$("#analyzeScheduleButton").addEventListener("click", () => {
  renderRecommendations(analyzeScheduleEvents(programEvents, getRadioContext()));
  notify("Analise da grade concluida.");
});

$("#loadDemoEventsButton").addEventListener("click", loadDemoEvents);

$("#gradeFile").addEventListener("change", async (event) => {
  $("#gradeText").value = await readTextFile(event.target.files?.[0]);
  notify("Arquivo GRADE carregado.");
});

$("#mapaFile").addEventListener("change", async (event) => {
  $("#mapaText").value = await readTextFile(event.target.files?.[0]);
  notify("Arquivo MAPA carregado.");
});

$("#loadDemoFilesButton").addEventListener("click", loadDemoFiles);
$("#testMapaButton").addEventListener("click", testarMapa);

$("#analyzeFilesButton").addEventListener("click", () => {
  const codeMap = parseMapa($("#mapaText").value);
  const items = parseGrade($("#gradeText").value, codeMap);
  const radio = getRadioContext();
  const runtimeItems = prepareRuntimeTimeline(items);
  audioQueue.splice(0, audioQueue.length);
  const locutorIaCues = createLocutorIaCues(runtimeItems, radio);
  const eventQueueData = buildEventQueue(runtimeItems, locutorIaCues, radio);
  const validatorAlerts = validateGradeSchedule(items);
  stopRunner();
  runnerState.items = runtimeItems;
  runnerState.eventQueue = eventQueueData.queue;
  runnerState.alerts = validatorAlerts;
  runnerState.locutorIaCues = locutorIaCues;
  runnerState.queueCycleSeconds = eventQueueData.cycleSeconds;
  runnerState.loopAnchorSeconds = currentClockSeconds();
  runnerState.currentIndex = findCurrentQueueIndexByClock(runnerState.eventQueue);
  renderGradeSummary(runtimeItems, describeGrade(items, radio), validatorAlerts);
  renderGradeInsights(analyzeGradeItems(items, radio));
  renderValidatorAlerts(validatorAlerts);
  renderAudioQueueStatus();
  renderCurrentProgramEvent();
  notify("GRADE e MAPA analisados.");
});

$("#startRunnerButton").addEventListener("click", startRunner);
$("#pauseRunnerButton").addEventListener("click", pauseRunner);
$("#resetRunnerButton").addEventListener("click", resetRunner);
$("#syncRealtimeButton").addEventListener("click", syncRealtimeNow);

renderNeurons();
renderProgramEvents();
renderAudioQueueStatus();
