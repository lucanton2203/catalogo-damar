const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const XLSX = require("../node_modules/xlsx");

const IMG_DIR = path.join(__dirname, "..", "public", "images", "productos");
const EXCEL_PATH = path.join(__dirname, "..", "data", "productos.xlsx");

// Leer productos del Excel
const wb = XLSX.readFile(EXCEL_PATH);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

// Productos que ya tienen imagen (cualquier extensión, case-insensitive)
const existingFiles = fs.readdirSync(IMG_DIR);
const existing = new Set(existingFiles.map(f => path.parse(f).name.toLowerCase()));

const missing = data.filter(p => !existing.has(String(p["Código"]).toLowerCase()));

console.log(`Total: ${data.length} | Con imagen: ${existing.size} | Sin imagen: ${missing.length}`);
console.log("─".repeat(60));

// ── Helpers de red ────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "CatalogoApp/1.0 (descarga de imagenes; contacto: admin@example.com)",
          "Accept": "application/json",
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          res.resume();
          if (loc) return fetchJson(loc).then(resolve);
          return resolve(null);
        }
        if (res.statusCode !== 200) { res.resume(); return resolve(null); }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function downloadImage(url, filepath, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) return resolve(false);
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      { headers: { "User-Agent": "CatalogoApp/1.0" }, timeout: 20000 },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          res.resume();
          if (loc) return downloadImage(loc, filepath, redirects + 1).then(resolve);
          return resolve(false);
        }
        if (res.statusCode !== 200) { res.resume(); return resolve(false); }
        const ws = fs.createWriteStream(filepath);
        res.pipe(ws);
        ws.on("finish", () => { ws.close(); resolve(true); });
        ws.on("error", () => { try { fs.unlinkSync(filepath); } catch {} resolve(false); });
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// ── Estrategias Open Food Facts ───────────────────────────────

/** Estrategia 1: buscar por código de barras EAN */
async function getImageByBarcode(barcode) {
  if (!barcode) return null;
  const ean = String(barcode).replace(/\D/g, "");
  if (!ean || ean.length < 8) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`;
  const data = await fetchJson(url);
  if (!data || data.status !== 1) return null;

  const p = data.product;
  return (
    p.image_front_url ||
    p.image_url ||
    p.image_front_small_url ||
    null
  );
}

/** Estrategia 2: buscar por nombre/descripción */
async function getImageByName(desc) {
  if (!desc) return null;
  const clean = desc
    .replace(/\(.*?\)/g, "")
    .replace(/x\s*\d+\s*(un|ml|g|kg|cc|lt?)/gi, "")
    .replace(/\d{8,}/g, "")
    .replace(/[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);

  if (!clean) return null;

  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    `search_terms=${encodeURIComponent(clean)}&json=1&page_size=5&action=process`;

  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.products) || data.products.length === 0) return null;

  for (const p of data.products) {
    const img = p.image_front_url || p.image_url;
    if (img) return img;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  let found = 0;
  let notFound = 0;
  let skipped = 0;
  const failures = [];

  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const codigo = String(p["Código"]);
    const barcode = p["Cód.Barras U.Consumo"] || p["Cod.Barras U.Consumo"] || p["EAN"] || "";
    const desc = String(p["Descripcion"] || p["Descripción"] || "");

    const prefix = `[${String(i + 1).padStart(4)}/${missing.length}] ${codigo.padEnd(10)}`;
    process.stdout.write(`${prefix} ${desc.substring(0, 35).padEnd(35)} `);

    // — Estrategia 1: EAN —
    let imgUrl = await getImageByBarcode(barcode);
    let strategy = "EAN";

    // — Estrategia 2: nombre —
    if (!imgUrl) {
      await sleep(300); // pequeña pausa entre las dos llamadas
      imgUrl = await getImageByName(desc);
      strategy = "NOMBRE";
    }

    if (!imgUrl) {
      console.log("NO ENCONTRADO");
      notFound++;
      failures.push({ codigo, desc, barcode });
      await sleep(1000);
      continue;
    }

    // Determinar extensión a partir de la URL
    const extMatch = imgUrl.match(/\.(jpg|jpeg|png|webp)/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
    const filepath = path.join(IMG_DIR, `${codigo}.${ext}`);

    const ok = await downloadImage(imgUrl, filepath);
    if (!ok) {
      console.log("DESCARGA FALLIDA");
      notFound++;
      failures.push({ codigo, desc, barcode });
      await sleep(1000);
      continue;
    }

    // Verificar tamaño mínimo (imagen real, no placeholder)
    try {
      const stats = fs.statSync(filepath);
      if (stats.size < 2000) {
        fs.unlinkSync(filepath);
        console.log("IMAGEN INVÁLIDA (muy pequeña)");
        notFound++;
        skipped++;
        failures.push({ codigo, desc, barcode });
      } else {
        console.log(`OK [${strategy}] (${(stats.size / 1024).toFixed(0)} KB)`);
        found++;
      }
    } catch {
      console.log("ERROR VERIFICACIÓN");
      notFound++;
    }

    // Esperar 1 segundo entre productos (respeto a la API)
    await sleep(1000);
  }

  // ── Resumen final ──
  console.log("\n" + "═".repeat(60));
  console.log(`RESUMEN FINAL`);
  console.log("═".repeat(60));
  console.log(`  Procesados : ${missing.length}`);
  console.log(`  Descargados: ${found}`);
  console.log(`  No hallados: ${notFound} (${skipped} imgs inválidas)`);
  console.log(`  Tasa éxito : ${((found / missing.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    const logPath = path.join(__dirname, "..", "data", "sin-imagen.txt");
    const lines = failures.map(f => `${f.codigo}\t${f.barcode}\t${f.desc}`).join("\n");
    fs.writeFileSync(logPath, "Código\tEAN\tDescripción\n" + lines, "utf8");
    console.log(`\n  Lista de faltantes guardada en: data/sin-imagen.txt`);
  }

  console.log("═".repeat(60));
}

main().catch(console.error);
