const fs = require("fs");

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function lerMapa() {
  const texto = fs.readFileSync("MAPA.txt", "utf-8");
  return texto.split(",").map((codigo) => codigo.trim()).filter(Boolean);
}

async function gerarAudio(texto) {
  const t = Math.min(3000, String(texto || "").length * 40);
  return new Promise((resolve) => setTimeout(() => resolve("audio_" + Date.now() + ".mp3"), t));
}

let ultimaFala = "";

function gerarFala(contexto) {
  const falas = {
    retorno: [
      "Voltamos com a melhor programacao!",
      "De volta com mais musica boa!",
      "Seguimos com voce na nossa radio!",
    ],
    hora: [
      "Agora sao exatamente " + new Date().toLocaleTimeString(),
      "Hora certa pra voce, agora " + new Date().toLocaleTimeString(),
    ],
  };

  const lista = falas[contexto] || falas.retorno;

  let fala;
  do {
    fala = lista[Math.floor(Math.random() * lista.length)];
  } while (fala === ultimaFala && lista.length > 1);

  ultimaFala = fala;
  return fala;
}

async function processarLocutor(contexto) {
  console.log("LocutorIA entrando...");
  await esperar(1000);

  const texto = gerarFala(contexto);
  console.log("FALA:", texto);

  const audio = await gerarAudio(texto);
  console.log("Audio pronto:", audio);
}

async function executar() {
  const mapa = lerMapa();

  while (true) {
    for (const evento of mapa) {
      console.log("\nEvento:", evento);

      if (evento === "HC") {
        await processarLocutor("hora");
      }

      if (evento === "COM") {
        await esperar(2000);
        await processarLocutor("retorno");
      }

      if (evento === "VEM" || evento === "MODAO" || evento === "RAIZ") {
        console.log("Tocando musica...");
        await esperar(4000);
      }

      if (evento === "SINAL") {
        console.log("Identificacao da radio...");
        await esperar(2000);
      }
    }
  }
}

executar();
