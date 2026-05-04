const fs = require("fs");

let ultimoMapa = "";

function lerMapa() {
  try {
    return fs.readFileSync("MAPA.txt", "utf-8");
  } catch {
    return "";
  }
}

async function locutorIA() {
  console.log("LocutorIA: Voltamos com a programacao");
}

async function rodar() {
  while (true) {
    const mapa = lerMapa();

    if (mapa !== ultimoMapa) {
      ultimoMapa = mapa;

      if (mapa.includes("COM")) {
        await locutorIA();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

rodar();
