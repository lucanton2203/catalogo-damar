// ── VENDORS ──────────────────────────────────────────────────────────────────
const VENDORS = {
  luciano: "542214772539",
  mariela: "542214956980",
  dolores: "542216562908",
  jonatan: "542216685897",
  mirta:   "541133302637",
  gaston:  "542215736074",
  romina:  "542215378290"
};

// Detecta el vendedor actual desde la URL /v/:nombre
function detectVendor() {
  const match = window.location.pathname.match(/^\/v\/([^/]+)/i);
  if (match) {
    const name = match[1].toLowerCase();
    if (VENDORS[name]) {
      return { name, phone: VENDORS[name] };
    }
  }
  return null;
}

const currentVendor = detectVendor();

// Habilitar UI del carrito sólo en URLs de vendedor
if (currentVendor) {
  document.body.classList.add("cart-enabled");
}

// ── ESTADO DEL CARRITO ────────────────────────────────────────────────────────
const CART_KEY = "damar_cart_" + (currentVendor ? currentVendor.name : "generic");
let cart = [];

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch (e) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

loadCart();

// ── OPERACIONES DEL CARRITO ──────────────────────────────────────────────────
function addToCart(product) {
  const existing = cart.find(item => item.codigo === product.codigo);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      codigo:      product.codigo,
      descripcion: product.descripcion,
      precio:      product.precio,
      qty:         1
    });
  }
  saveCart();
  renderCart();
  updateCartBadge();

  // Animación del botón flotante
  const btn = document.getElementById("cartFloatBtn");
  if (btn) {
    btn.classList.remove("cart-bump");
    void btn.offsetWidth; // force reflow
    btn.classList.add("cart-bump");
  }
}

function removeFromCart(codigo) {
  cart = cart.filter(item => item.codigo !== codigo);
  saveCart();
  renderCart();
  updateCartBadge();
}

function updateQty(codigo, delta) {
  const item = cart.find(i => i.codigo === codigo);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(codigo);
    return;
  }
  saveCart();
  renderCart();
  updateCartBadge();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  updateCartBadge();
}

function getTotal() {
  return cart.reduce((sum, item) => {
    return sum + (typeof item.precio === "number" ? item.precio * item.qty : 0);
  }, 0);
}

function getTotalItems() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// Exponer para que app.js pueda leer cantidad de un producto
window.getCartQty = function(codigo) {
  const item = cart.find(i => i.codigo === codigo);
  return item ? item.qty : 0;
};

// ── FORMATEADORES ─────────────────────────────────────────────────────────────
const arsCart = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2
});

function priceUnitText(price) {
  return typeof price === "number" ? arsCart.format(price) : "Consultar";
}

function priceSubtotalText(price, qty) {
  return typeof price === "number" ? arsCart.format(price * qty) : "Consultar";
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = cart.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ── RENDER PANEL CARRITO ──────────────────────────────────────────────────────
function renderCart() {
  const list    = document.getElementById("cartItemsList");
  const totalEl = document.getElementById("cartTotal");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = "<p class=\"cart-empty\">El carrito está vacío</p>";
    if (totalEl) totalEl.textContent = "";
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of cart) {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML =
      "<div class=\"cart-item-info\">" +
        "<div class=\"cart-item-code\">Cod: " + item.codigo + "</div>" +
        "<div class=\"cart-item-desc\">" + (item.descripcion || "Sin descripción") + "</div>" +
        "<div class=\"cart-item-price\">" + priceUnitText(item.precio) + " c/u</div>" +
      "</div>" +
      "<div class=\"cart-item-controls\">" +
        "<button class=\"qty-btn\" data-action=\"dec\" data-codigo=\"" + item.codigo + "\">−</button>" +
        "<span class=\"cart-qty\">" + item.qty + "</span>" +
        "<button class=\"qty-btn\" data-action=\"inc\" data-codigo=\"" + item.codigo + "\">+</button>" +
        "<button class=\"remove-btn\" data-codigo=\"" + item.codigo + "\" title=\"Eliminar\">✕</button>" +
      "</div>" +
      "<div class=\"cart-item-subtotal\">" + priceSubtotalText(item.precio, item.qty) + "</div>";
    fragment.appendChild(div);
  }

  list.innerHTML = "";
  list.appendChild(fragment);

  if (totalEl) {
    totalEl.textContent = "Total: " + arsCart.format(getTotal());
  }
}

// ── ABRIR / CERRAR PANEL ──────────────────────────────────────────────────────
function openCart() {
  document.getElementById("cartPanel")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("visible");
  renderCart();
}

function closeCart() {
  document.getElementById("cartPanel")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("visible");
}

// ── MODAL DATOS DEL CLIENTE ───────────────────────────────────────────────────
function openCustomerModal() {
  if (cart.length === 0) {
    alert("El carrito está vacío. Agregá productos antes de enviar.");
    return;
  }
  closeCart();
  const modal = document.getElementById("customerModal");
  if (modal) modal.classList.add("open");
  document.getElementById("customerName")?.focus();
}

function closeCustomerModal() {
  document.getElementById("customerModal")?.classList.remove("open");
}

// ── ENVIAR POR WHATSAPP ───────────────────────────────────────────────────────
function sendWhatsApp() {
  const nameEl = document.getElementById("customerName");
  const shopEl = document.getElementById("customerShop");

  const name = nameEl ? nameEl.value.trim() : "";
  const shop = shopEl ? shopEl.value.trim() : "";

  if (!name) {
    nameEl?.focus();
    alert("Por favor ingresá tu nombre y apellido.");
    return;
  }
  if (!shop) {
    shopEl?.focus();
    alert("Por favor ingresá el nombre del comercio.");
    return;
  }

  if (!currentVendor) {
    alert("No se pudo determinar el vendedor. Usá el link que te compartió tu vendedor.");
    return;
  }

  // Armar mensaje
  let msg = "*NUEVO PEDIDO*\n";
  msg += "Cliente: " + name + "\n";
  msg += "Comercio: " + shop + "\n\n";
  msg += "*Productos:*\n";

  for (const item of cart) {
    const priceStr = typeof item.precio === "number" ? arsCart.format(item.precio) : "Consultar";
    msg += "- " + item.qty + "x " + item.codigo + " - " + (item.descripcion || "Sin descripción") + " - " + priceStr + "\n";
  }

  msg += "\n*Total: " + arsCart.format(getTotal()) + "*";

  const url = "https://wa.me/" + currentVendor.phone + "?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");

  closeCustomerModal();
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  // Botón flotante
  document.getElementById("cartFloatBtn")?.addEventListener("click", openCart);

  // Cerrar panel
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart);

  // Vaciar carrito
  document.getElementById("cartClearBtn")?.addEventListener("click", () => {
    if (confirm("¿Vaciar el carrito?")) clearCart();
  });

  // Enviar pedido → abre modal
  document.getElementById("cartSendBtn")?.addEventListener("click", openCustomerModal);

  // Modal: cerrar
  document.getElementById("modalClose")?.addEventListener("click", closeCustomerModal);
  document.getElementById("modalCancel")?.addEventListener("click", closeCustomerModal);

  // Modal: click fuera
  document.getElementById("customerModal")?.addEventListener("click", (e) => {
    if (e.target.id === "customerModal") closeCustomerModal();
  });

  // Modal: enviar
  document.getElementById("modalSend")?.addEventListener("click", sendWhatsApp);

  // Enter en campos del modal
  ["customerName", "customerShop"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendWhatsApp();
    });
  });

  // Delegación en lista del carrito (qty / eliminar)
  document.getElementById("cartItemsList")?.addEventListener("click", (e) => {
    const btn       = e.target.closest("[data-action]");
    const removeBtn = e.target.closest(".remove-btn");

    if (btn) {
      const { codigo, action } = btn.dataset;
      if (action === "inc") updateQty(codigo, 1);
      if (action === "dec") updateQty(codigo, -1);
    }
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.codigo);
    }
  });

  // Delegación en grid de productos (botón Agregar)
  document.getElementById("productsGrid")?.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".btn-add-cart");
    const qtyBtn = e.target.closest(".qty-btn-card");

    if (qtyBtn) {
      const input = qtyBtn.parentElement.querySelector(".qty-input");
      let val = parseInt(input.value) || 1;
      if (qtyBtn.dataset.action === "inc") val++;
      if (qtyBtn.dataset.action === "dec" && val > 1) val--;
      input.value = val;
      return;
    }

    if (!addBtn) return;
    const card = addBtn.closest(".card");
    if (card && card.dataset.product) {
      try {
        const product = JSON.parse(card.dataset.product);
        const input = card.querySelector(".qty-input");
        const qty = parseInt(input?.value) || 1;
        // Buscar si ya existe en el carrito
        const existing = cart.find(i => i.codigo === product.codigo);
        const currentQty = existing ? existing.qty : 0;
        // Si el input muestra más que lo actual en carrito, agregar la diferencia
        // Si es la primera vez, agregar la cantidad del input
        if (currentQty === 0) {
          for (let i = 0; i < qty; i++) addToCart(product);
        } else {
          // Setear la cantidad directamente
          existing.qty = qty;
          saveCart();
          renderCart();
        }
        // Mostrar cantidad total en el carrito en el input
        const updated = cart.find(i => i.codigo === product.codigo);
        if (input && updated) input.value = updated.qty;
      } catch (err) {
        console.error("Error al parsear producto:", err);
      }
    }
  });
});
