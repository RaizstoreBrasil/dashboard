const fs = require("fs");
const path = require("path");

const URL = process.env.XAVIER_URL || "https://SEU-XAVIER.up.railway.app/mapa";
const MAPA_CANDIDATES = [
  "C:\\Playlist\\MAPA.txt",
  "C:\\Users\\Ancelmo\\Desktop\\MAPA.txt",
  "C:\\Users\\Ancelmo\\OneDrive\\Desktop\\Mapas\\MAPA.txt",
  "C:\\Users\\Ancelmo\\OneDrive\\Desktop\\Grades\\MAPA.txt",
];

function resolverMapa() {
  for (const candidate of MAPA_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`MAPA.txt nao encontrado. Caminhos testados: ${MAPA_CANDIDATES.join(", ")}`);
}

async function enviar() {
  const mapaPath = resolverMapa();
  const mapa = fs.readFileSync(mapaPath, "utf-8");
  await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mapa, origem: path.basename(mapaPath) }),
  });
  console.log("MAPA enviado");
}

async function iniciar() {
  await enviar();
  setInterval(() => {
    enviar().catch((error) => {
      console.error("Falha ao enviar MAPA:", error.message);
    });
  }, 2000);
}

iniciar().catch((error) => {
  console.error("Falha ao iniciar envio do MAPA:", error.message);
  process.exit(1);
});
