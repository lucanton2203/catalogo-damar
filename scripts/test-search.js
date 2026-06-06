const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const XLSX = require("../node_modules/xlsx");

const IMG_DIR = path.join(__dirname, "..", "public", "images", "productos");
const EXCEL_PATH = path.join(__dirname, "..", "data", "productos.xlsx");

const wb = XLSX.readFile(EXCEL_PATH);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const existing = new Set(fs.readdirSync(IMG_DIR).map(f => f.split(".")[0]));
const missing = data.filter(p => !existing.has(String(p["Código"])));

function searchImage(query) {
  return new Promise((resolve) => {
    const url = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(query);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }, (r) => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => {
        const regex = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png))"/gi;
        let match;
        const urls = [];
        while ((match = regex.exec(d)) !== null) {
          const u = match[1];
          if (!u.includes("google") && !u.includes("gstatic")) urls.push(u);
        }
        resolve(urls[0] || null);
      });
    }).on("error", () => resolve(null));
  });
}

function cleanDesc(desc) {
  return desc.replace(/\(.*?\)/g, "").replace(/x\d+\s*un/gi, "").replace(/\d{13}/g, "").replace(/[^a-záéíóúñ\s]/gi, " ").replace(/\s+/g, " ").trim();
}

async function test() {
  const sample = missing.slice(0, 5);
  for (const p of sample) {
    const desc = cleanDesc(p.Descripcion || "");
    const query = desc + " producto";
    const imgUrl = await searchImage(query);
    console.log(p["Código"], "|", desc.substring(0, 50), "|", imgUrl ? "FOUND: " + imgUrl.substring(0, 60) : "NOT FOUND");
    await new Promise(r => setTimeout(r, 1500));
  }
}
test();
