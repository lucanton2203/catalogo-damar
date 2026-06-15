const path = require("path");
const fs = require("fs");
const express = require("express");
const XLSX = require("xlsx");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = !!process.env.RENDER;

const DATA_DIR = path.join(__dirname, "data");
const EXCEL_PATH = path.join(DATA_DIR, "productos.xlsx");

// Asegurar que la carpeta data/ exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function readProductsFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const products = [];

  for (const row of rows) {
    const codigo = normalizeValue(row["Código"]);
    if (!codigo) {
      continue;
    }

    const codBarras = normalizeValue(row["Cód.Barras U.Consumo"]);
    const descripcion = normalizeValue(row["Descripcion"]);
    const precio = parsePrice(row["Tradicional (c/Iva)"]);

    products.push({
      codigo,
      codBarras,
      descripcion,
      precio,
      updatedAt: new Date().toISOString()
    });
  }

  return products;
}

let productsCache = [];
let lastUpdate = null;
let loadError = null;

function refreshProducts() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log("No se encontró ./data/productos.xlsx. Iniciando con catálogo vacío.");
    productsCache = [];
    lastUpdate = new Date().toISOString();
    loadError = null;
    return;
  }

  try {
    productsCache = readProductsFromExcel(EXCEL_PATH);
    lastUpdate = new Date().toISOString();
    loadError = null;
    console.log(`Catálogo actualizado: ${productsCache.length} productos`);
  } catch (error) {
    loadError = error.message;
    console.error("Error leyendo Excel:", error.message);
  }
}

refreshProducts();

// Detectar cambios en el Excel y recargar automaticamente
function watchExcel() {
  try {
    if (fs.existsSync(EXCEL_PATH)) {
      fs.watchFile(EXCEL_PATH, { interval: 1000 }, () => {
        console.log("Excel modificado, recargando catalogo...");
        refreshProducts();
      });
      console.log("Auto-recarga activada: cambios en el Excel se detectaran automaticamente");
    }
  } catch (e) {
    console.error("No se pudo activar el watcher del Excel:", e.message);
  }
}
watchExcel();

app.use(express.static(path.join(__dirname, "public")));

// Configurar multer para guardar en memoria y luego mover al lugar correcto
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos Excel (.xlsx o .xls)"));
    }
  }
});

// Panel admin - servir admin.html
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Lista de vendedores con sus números de WhatsApp
const VENDORS = {
  luciano: "+542214772539",
  mariela: "+542214956980",
  dolores: "+542216562908",
  jonatan: "+542216685897",
  mirta:   "+541133302637",
  gaston:  "+542215736074",
  romina:  "+542215378290"
};

// Rutas de catálogo por vendedor - sirven el mismo index.html
app.get("/v/:vendedor", (req, res) => {
  const name = req.params.vendedor.toLowerCase();
  if (!VENDORS[name]) {
    return res.status(404).send("Vendedor no encontrado");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API para consultar info de un vendedor (usado por el frontend)
app.get("/api/vendor/:nombre", (req, res) => {
  const name = req.params.nombre.toLowerCase();
  if (!VENDORS[name]) {
    return res.status(404).json({ ok: false, error: "Vendedor no encontrado" });
  }
  return res.json({ ok: true, name, phone: VENDORS[name] });
});

// Endpoint de upload de Excel — DESHABILITADO: el catalogo se actualiza solo desde PC via git push
app.post("/admin/upload", (_req, res) => {
  return res.status(403).json({
    ok: false,
    error: "El catalogo se actualiza exclusivamente desde la PC. Usa el acceso directo del escritorio."
  });
});

// Endpoint para parsear el body del form en /admin/upload (multer ya lo maneja)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/api/products", (_req, res) => {
  if (loadError) {
    return res.status(500).json({
      error: "No se pudo leer el archivo Excel",
      details: loadError
    });
  }

  return res.json({
    total: productsCache.length,
    lastUpdate,
    products: productsCache
  });
});

app.get("/api/health", (_req, res) => {
  return res.json({
    ok: !loadError,
    totalProducts: productsCache.length,
    lastUpdate,
    excelPath: EXCEL_PATH,
    hasExcel: fs.existsSync(EXCEL_PATH),
    loadError
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`App catálogo disponible en http://localhost:${PORT}`);
  if (!IS_PRODUCTION) {
    const { exec } = require("child_process");
    exec(`start "" "http://localhost:${PORT}"`, (err) => {
      if (err) console.log("No se pudo abrir el navegador automáticamente");
    });
  }
});
