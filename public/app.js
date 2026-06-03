const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2
});

const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
const statusEl = document.getElementById("status");
const metaInfo = document.getElementById("metaInfo");
const cardTemplate = document.getElementById("cardTemplate");
const exportPdfBtn = document.getElementById("exportPdfBtn");

let allProducts = [];
let currentProducts = [];

function priceToText(price) {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "Consultar precio";
  }
  return arsFormatter.format(price);
}

function render(products) {
  currentProducts = products;
  productsGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const product of products) {
    const node = cardTemplate.content.cloneNode(true);
    const img = node.querySelector(".product-img");
    const placeholder = node.querySelector(".img-placeholder");
    const imgUrl = `/images/productos/${product.codigo}.jpg`;
    img.src = imgUrl;
    img.alt = product.descripcion || "";
    img.onload = function() { placeholder.style.display = "none"; img.style.display = "block"; };
    img.onerror = function() { img.style.display = "none"; placeholder.style.display = "flex"; };
    img.style.display = "none";
    node.querySelector(".code").textContent = `Cod: ${product.codigo}`;
    node.querySelector(".desc").textContent = product.descripcion || "Sin descripción";
    node.querySelector(".price").textContent = priceToText(product.precio);
    fragment.appendChild(node);
  }

  productsGrid.appendChild(fragment);
  statusEl.textContent = `${products.length} producto(s) mostrado(s)`;
}

function filterProducts(term) {
  const q = term.trim().toLowerCase();
  if (!q) {
    render(allProducts);
    return;
  }

  const filtered = allProducts.filter((p) => {
    return (
      String(p.codigo).toLowerCase().includes(q) ||
      String(p.descripcion || "").toLowerCase().includes(q)
    );
  });
  render(filtered);
}

function imgToBase64(url, format) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (format !== "png") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      resolve(format === "png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = function () { resolve(null); };
    img.src = url;
  });
}

async function exportPDF() {
  if (!window.jspdf) {
    alert("La librería de PDF no está disponible. Verificá tu conexión a internet.");
    return;
  }

  const originalHTML = exportPdfBtn.innerHTML;
  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = "Generando...";

  // Precargar logo como PNG (preserva transparencia)
  const logoB64 = await imgToBase64("/images/logo.png", "png");

  // Precargar imágenes disponibles
  const imageCache = {};
  const imgPromises = currentProducts.map(async (p) => {
    const url = `/images/productos/${p.codigo}.jpg`;
    const b64 = await imgToBase64(url);
    if (b64) imageCache[p.codigo] = b64;
  });
  await Promise.all(imgPromises);

  // Logo Damar en base64 (PNG, ~38KB)
  const LOGO_BASE64 = "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";

  const { jsPDF } = window.jspdf;

  // ── Constantes de layout (A4 portrait, unidades: mm) ──
  const PAGE_W = 210, PAGE_H = 297;
  const ML = 8, MR = 8;
  const CONTENT_W = PAGE_W - ML - MR;
  const COLS = 4;
  const COL_GAP = 2;
  const COL_W = (CONTENT_W - (COLS - 1) * COL_GAP) / COLS;
  const HEADER_H = 58;
  const FOOTER_H = 12;
  const FIRST_PAGE_START_Y = HEADER_H + 5;
  const OTHER_PAGE_START_Y = 10;
  const IMG_H = 35;
  const CELL_H = 53;
  const ROW_GAP = 2;
  const CONTENT_BOTTOM = PAGE_H - FOOTER_H;
  const ROWS_FIRST_PAGE = Math.floor((CONTENT_BOTTOM - FIRST_PAGE_START_Y) / (CELL_H + ROW_GAP));
  const ROWS_OTHER_PAGES = Math.floor((CONTENT_BOTTOM - OTHER_PAGE_START_Y) / (CELL_H + ROW_GAP));

  const today = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
  const filterTerm = searchInput.value.trim();

  // ── Encabezado banner ──
  function drawHeader(d) {
    // Degradado completo: celeste RGB(0,180,255) -> violeta RGB(120,50,180)
    const strips = 40;
    const stripH = HEADER_H / strips;
    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);
      const r = Math.round(0   + t * 120);
      const g = Math.round(180 - t * 130);
      const b = Math.round(255 - t * 75);
      d.setFillColor(r, g, b);
      d.rect(0, i * stripH, PAGE_W, stripH + 0.3, "F");
    }

    // Título principal centrado
    d.setFont("helvetica", "bold");
    d.setFontSize(18);
    d.setTextColor(255, 255, 255);
    d.text("CATÁLOGO GENERAL DE PRODUCTOS", PAGE_W / 2, 22, { align: "center" });

    // Subtítulo
    d.setFontSize(14);
    d.text("DISTRIBUIDORA DAMAR", PAGE_W / 2, 32, { align: "center" });

    // Datos de contacto
    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    d.setTextColor(255, 255, 255);
    const contactY = 53;
    const third = CONTENT_W / 3;
    const c1 = ML + third * 0 + third / 2;
    const c2 = ML + third * 1 + third / 2;
    const c3 = ML + third * 2 + third / 2;
    d.text("Tel: +54 221 543-1105", c1, contactY, { align: "center" });
    d.text("Web: www.distribuidoradamar.com.ar", c2, contactY, { align: "center" });
    d.text("IG: @DamarDistribuidora", c3, contactY, { align: "center" });
  }

  // ── Pie de página ──
  function drawFooter(d, pageNum, totalPages) {
    const lineY = PAGE_H - FOOTER_H + 2;
    d.setDrawColor(214, 0, 110);
    d.setLineWidth(0.35);
    d.line(ML, lineY, PAGE_W - MR, lineY);
    d.setFontSize(7.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(170, 0, 80);
    d.text(
      `Distribuidora DAMAR  |  Catálogo de Productos  |  Página ${pageNum} de ${totalPages}`,
      PAGE_W / 2, lineY + 5, { align: "center" }
    );
  }

  // ── Celda de producto ──
  function drawCell(d, product, imgData, x, y) {
    // Imagen cuadrada centrada (mantiene proporción)
    const imgSize = Math.min(IMG_H, COL_W - 2); // cuadrado que cabe
    const imgX = x + (COL_W - imgSize) / 2;
    const imgY = y;
    if (imgData) {
      try {
        d.addImage(imgData, "JPEG", imgX, imgY, imgSize, imgSize);
      } catch(e) {
        d.setFillColor(245, 245, 245);
        d.rect(imgX, imgY, imgSize, imgSize, "F");
      }
    } else {
      d.setFillColor(245, 245, 245);
      d.rect(imgX, imgY, imgSize, imgSize, "F");
    }

    const cx = x + COL_W / 2;
    const textStart = y + imgSize + 2;

    // Código en dorado
    d.setFont("helvetica", "bold");
    d.setFontSize(6.5);
    d.setTextColor(180, 130, 0);
    d.text(`Cod: ${product.codigo}`, cx, textStart, { align: "center" });

    // Descripción en negro (1 línea)
    d.setFont("helvetica", "normal");
    d.setFontSize(5.5);
    d.setTextColor(30, 30, 30);
    const descLines = d.splitTextToSize(product.descripcion || "Sin descripción", COL_W - 2);
    d.text(descLines[0], cx, textStart + 3.5, { align: "center" });

    // Precio en rosa/magenta
    d.setFont("helvetica", "bold");
    d.setFontSize(7);
    d.setTextColor(214, 0, 110);
    const priceText = typeof product.precio === "number"
      ? arsFormatter.format(product.precio)
      : "Consultar";
    d.text(priceText, cx, textStart + 7.5, { align: "center" });
  }

  // ── Generar PDF ──
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawHeader(doc);

  let curY = FIRST_PAGE_START_Y;
  let rowsOnPage = 0;
  let isFirstPage = true;
  const maxRowsThisPage = () => isFirstPage ? ROWS_FIRST_PAGE : ROWS_OTHER_PAGES;

  for (let i = 0; i < currentProducts.length; i++) {
    const col = i % COLS;
    if (col === 0 && i > 0) {
      rowsOnPage++;
      if (rowsOnPage >= maxRowsThisPage()) {
        doc.addPage();
        isFirstPage = false;
        curY = OTHER_PAGE_START_Y;
        rowsOnPage = 0;
      } else {
        curY = curY + CELL_H + ROW_GAP;
      }
    }
    const x = ML + col * (COL_W + COL_GAP);
    drawCell(doc, currentProducts[i], imageCache[currentProducts[i].codigo] || null, x, curY);
  }

  // Pie en todas las páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = filterTerm ? "_filtro" : "";
  doc.save(`DAMAR_Catalogo_${dateStr}${suffix}.pdf`);

  exportPdfBtn.disabled = false;
  exportPdfBtn.innerHTML = originalHTML;
}

async function loadCatalog() {
  statusEl.textContent = "Cargando productos...";
  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error("No se pudo cargar el catálogo");
    }

    const data = await response.json();
    allProducts = data.products || [];
    render(allProducts);

    const updated = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString("es-AR") : "N/D";
    metaInfo.textContent = `${data.total} productos | Actualizado: ${updated}`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    metaInfo.textContent = "Error de carga";
  }
}

searchInput.addEventListener("input", (event) => {
  filterProducts(event.target.value);
});

exportPdfBtn.addEventListener("click", exportPDF);

loadCatalog();
