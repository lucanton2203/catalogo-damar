/**
 * Script: agregar-columna-lanzamiento.js
 * ───────────────────────────────────────
 * Agrega la columna "Lanzamiento" a data/productos.xlsx (si no existe todavía).
 * No pisa la columna si ya existe. Hace backup antes de escribir.
 *
 * Cómo marcar un producto como "de lanzamiento":
 *   Abrí data/productos.xlsx y en la columna "Lanzamiento" escribí SI
 *   en la fila del producto que querés destacar. Dejalo vacío para el resto.
 *
 * Ejecutar con: node scripts/agregar-columna-lanzamiento.js
 */

const path = require("path");
const fs = require("fs");
const XLSX = require("../node_modules/xlsx");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTOS_PATH = path.join(DATA_DIR, "productos.xlsx");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

function main() {
  if (!fs.existsSync(PRODUCTOS_PATH)) {
    console.error(`No se encontró ${PRODUCTOS_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(PRODUCTOS_PATH);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

  if (rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], "Lanzamiento")) {
    console.log("La columna 'Lanzamiento' ya existe. No se modificó nada.");
    return;
  }

  for (const row of rows) {
    row["Lanzamiento"] = "";
  }

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(PRODUCTOS_PATH, path.join(BACKUPS_DIR, `productos_${stamp}.xlsx`));

  const newSheet = XLSX.utils.json_to_sheet(rows);
  const newWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWb, newSheet, sheetName);
  XLSX.writeFile(newWb, PRODUCTOS_PATH);

  console.log(`Columna 'Lanzamiento' agregada a ${rows.length} productos.`);
  console.log(`Backup guardado en data/backups/productos_${stamp}.xlsx`);
}

main();
