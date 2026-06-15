const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const TEST_PORT = 3001;
const APP_URL = "http://localhost:3000";

console.log("=== PRUEBA DE SINCRONIZACION DE PRECIOS ===\n");

// Simular el estado del carrito (igual que en localStorage del navegador)
let cart = [
  {
    codigo: 109351,
    descripcion: "CALIPSO PD ANATOMICA + MANZANILLA X30U",
    precio: 1000.00, // precio viejo simulado
    qty: 2
  }
];

// Funcion syncCartPrices del cart.js
async function syncCartPrices() {
  if (cart.length === 0) return;

  return new Promise((resolve, reject) => {
    const url = APP_URL + "/api/products";
    const client = url.startsWith("https") ? https : http;

    client.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const products = result.products || [];
          const map = {};
          products.forEach(p => { map[p.codigo] = p.precio; });

          let changed = false;
          cart.forEach(item => {
            if (map[item.codigo] !== undefined && map[item.codigo] !== item.precio) {
              console.log(`🔄 ${item.codigo}: $${item.precio} → $${map[item.codigo]}`);
              item.precio = map[item.codigo];
              changed = true;
            }
          });

          if (changed) {
            console.log("✅ Precios actualizados desde el servidor!\n");
          } else {
            console.log("ℹ️  Los precios ya estaban actualizados.\n");
          }

          resolve(changed);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function runTest() {
  console.log("Estado inicial del carrito:");
  cart.forEach(item => {
    console.log(`  - Cod: ${item.codigo}, Precio: $${item.precio}, Cant: ${item.qty}`);
  });
  console.log("");

  try {
    await syncCartPrices();

    console.log("Estado final del carrito:");
    cart.forEach(item => {
      console.log(`  - Cod: ${item.codigo}, Precio: $${item.precio}, Cant: ${item.qty}`);
    });

    const total = cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
    console.log(`\n💰 Total carrito: $${total.toFixed(2)}`);

  } catch (err) {
    console.error("❌ Error en la sincronizacion:", err.message);
  }
}

runTest();
