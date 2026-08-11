/**
 * Script: asignar-marcas.js
 * ─────────────────────────
 * 1) Crea/actualiza data/marcas.xlsx  → base de marcas (ID, Marca)
 * 2) Agrega/completa la columna "Marca" (ID numérico) en data/productos.xlsx
 *
 * Es SEGURO ejecutarlo varias veces:
 * - NO pisa productos que ya tengan un número de marca asignado a mano.
 * - Solo completa los productos que tengan la celda "Marca" vacía.
 * - Si aparece una marca nueva, la agrega a marcas.xlsx con el próximo ID libre.
 * - Antes de guardar, hace un backup de productos.xlsx en data/backups/.
 *
 * Ejecutar con: node scripts/asignar-marcas.js
 */

const path = require("path");
const fs = require("fs");
const XLSX = require("../node_modules/xlsx");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTOS_PATH = path.join(DATA_DIR, "productos.xlsx");
const MARCAS_PATH = path.join(DATA_DIR, "marcas.xlsx");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

function getBrandFromDesc(desc) {
  const w = String(desc || "").trim().split(/\s+/)[0];
  return w ? w.toUpperCase() : "SIN MARCA";
}

function isEmpty(value) {
  return value === "" || value === null || value === undefined;
}

function main() {
  if (!fs.existsSync(PRODUCTOS_PATH)) {
    console.error(`No se encontró ${PRODUCTOS_PATH}`);
    process.exit(1);
  }

  // 1) Cargar base de marcas existente (o arrancar vacía)
  let marcas = [];
  if (fs.existsSync(MARCAS_PATH)) {
    const wbM = XLSX.readFile(MARCAS_PATH);
    marcas = XLSX.utils.sheet_to_json(wbM.Sheets[wbM.SheetNames[0]], { defval: "" });
  }

  const nameToId = new Map(marcas.map((m) => [String(m.Marca).toUpperCase(), Number(m.ID)]));
  let nextId = marcas.reduce((max, m) => Math.max(max, Number(m.ID) || 0), 0) + 1;

  // 2) Leer productos
  const wbP = XLSX.readFile(PRODUCTOS_PATH);
  const sheetName = wbP.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wbP.Sheets[sheetName], { defval: "" });

  let yaAsignados = 0;
  let asignadosAhora = 0;
  let marcasNuevas = 0;

  for (const row of rows) {
    if (!isEmpty(row["Marca"])) {
      yaAsignados++;
      continue; // respetar asignación manual existente
    }

    const brandName = getBrandFromDesc(row["Descripcion"]);
    let id = nameToId.get(brandName);
    if (!id) {
      id = nextId++;
      nameToId.set(brandName, id);
      marcas.push({ ID: id, Marca: brandName });
      marcasNuevas++;
    }
    row["Marca"] = id;
    asignadosAhora++;
  }

  // 3) Backup de productos.xlsx antes de sobrescribir
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `productos_${stamp}.xlsx`);
  fs.copyFileSync(PRODUCTOS_PATH, backupPath);

  // 4) Guardar productos.xlsx actualizado
  const newSheetP = XLSX.utils.json_to_sheet(rows);
  const newWbP = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWbP, newSheetP, sheetName);
  XLSX.writeFile(newWbP, PRODUCTOS_PATH);

  // 5) Guardar marcas.xlsx ordenado por ID
  marcas.sort((a, b) => Number(a.ID) - Number(b.ID));
  const newSheetM = XLSX.utils.json_to_sheet(marcas);
  const newWbM = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWbM, newSheetM, "Marcas");
  XLSX.writeFile(newWbM, MARCAS_PATH);

  console.log("─".repeat(50));
  console.log("ASIGNACIÓN DE MARCAS COMPLETADA");
  console.log("─".repeat(50));
  console.log(`Productos ya tenían marca asignada : ${yaAsignados}`);
  console.log(`Productos asignados en esta corrida : ${asignadosAhora}`);
  console.log(`Marcas nuevas creadas                : ${marcasNuevas}`);
  console.log(`Total de marcas en la base            : ${marcas.length}`);
  console.log(`Backup de productos.xlsx guardado en  : data/backups/productos_${stamp}.xlsx`);
  console.log("─".repeat(50));
}

main();
