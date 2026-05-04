async function gerarAudio(texto) {
  const tempo = Math.min(3000, String(texto || "").length * 50);
  return new Promise((resolve) => {
    setTimeout(() => {
      const nomeArquivo = "audio_" + Date.now() + ".mp3";
      resolve(nomeArquivo);
    }, tempo);
  });
}

async function processarLocutorIA(evento) {
  evento.status = "processing";
  const audio = await gerarAudio(evento.texto);
  evento.audio = audio;
  evento.status = "ready";
  console.log("Audio pronto:", audio);
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executarFila(queue) {
  for (const evento of queue) {
    console.log("Evento:", evento.tipo);
    if (evento.tipo === "LocutorIA") {
      await processarLocutorIA(evento);
    }
    await esperar(1000);
  }
}

const fila = [
  { tipo: "COMERCIAL" },
  { tipo: "LocutorIA", texto: "Voltamos com a melhor programacao!" },
  { tipo: "MUSICA" },
];

executarFila(fila);
