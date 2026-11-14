// Clover House — sitio público
const WHATSAPP = "526141420049";
const DOMINIO = "cloverhouse.mx";

// Testimonios: se muestran solo si hay. Formato: { texto: "...", nombre: "Familia Pérez", detalle: "Compraron en Sicomoro" }
const TESTIMONIOS = [];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Mensajes de WhatsApp con origen (y si viene de anuncio, lo dice)
const deAnuncio = new URLSearchParams(location.search).has("utm_source");
const saludo = () => `Hola Lolys, ${deAnuncio ? "vi tu anuncio y " : ""}vengo de ${DOMINIO}.`;
const ligaWA = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`${saludo()} ${texto}`.trim())}`;
$$("[data-wa]").forEach((a) => (a.href = ligaWA(a.dataset.wa)));

$("#anio").textContent = new Date().getFullYear();
const barra = $("#barra");
addEventListener("scroll", () => barra.classList.toggle("con-sombra", scrollY > 10), { passive: true });

// ---------- Formulario de búsqueda ----------
$$(".chips").forEach((grupo) => {
  grupo.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const activo = b.getAttribute("aria-pressed") === "true";
    if (grupo.hasAttribute("data-uno")) $$("button", grupo).forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", String(!activo));
  });
  $$("button", grupo).forEach((b) => b.setAttribute("aria-pressed", "false"));
});

const elegidos = (campo) => $$(`.chips[data-campo="${campo}"] button[aria-pressed="true"]`).map((b) => b.textContent.trim());

$("#formulario").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const nombre = f.nombre.value.trim();
  $("#error").hidden = !!nombre;
  if (!nombre) { f.nombre.focus(); return; }
  const lineas = [];
  const agrega = (etiqueta, valor) => { if (valor && valor.length) lineas.push(`• ${etiqueta}: ${Array.isArray(valor) ? valor.join(", ") : valor}`); };
  agrega("Para", elegidos("para"));
  const zonas = elegidos("zona");
  if (f.colonia.value.trim()) zonas.push(f.colonia.value.trim());
  agrega("Zona", zonas);
  agrega("Presupuesto", elegidos("presupuesto"));
  agrega("Recámaras", elegidos("recamaras"));
  agrega("Pago", elegidos("pago"));
  agrega("¿Para cuándo?", elegidos("cuando"));
  agrega("No puede faltar", f.indispensable.value.trim());
  const texto = `Soy ${nombre} y estoy buscando casa.${lineas.length ? "\n" + lineas.join("\n") : ""}`;
  if (typeof fbq === "function") fbq("track", "Lead");
  window.open(ligaWA(texto), "_blank", "noopener");
});

// ---------- Casas ----------
const pesos = (n) => n ? "$" + Number(n).toLocaleString("es-MX") : "Precio a consultar";
const m2 = (n) => `${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 1 })} m²`;
const baños = (n) => (Number(n) % 1 ? `${Math.floor(n)} ½` : n) + (n == 1 ? " baño" : " baños");
const ESTADO = { apartada: "Apartada", vendida: "Vendida" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const datosCasa = (p) => [
  p.recamaras ? `${p.recamaras} rec.` : "",
  p.banos ? baños(p.banos) : "",
  p.construccion ? `${m2(p.construccion)} const.` : "",
  p.terreno ? `${m2(p.terreno)} terreno` : "",
].filter(Boolean).map((d) => `<li>${esc(d)}</li>`).join("");

let casas = [];
async function cargarCasas() {
  const rejilla = $("#rejilla");
  try {
    const r = await fetch("/api/propiedades");
    casas = r.ok ? await r.json() : [];
  } catch { casas = []; }
  rejilla.innerHTML = casas.map((p, i) => `
    <button class="tarjeta${p.estado === "vendida" ? " tarjeta--vendida" : ""}" type="button" data-i="${i}">
      <div class="tarjeta__foto">
        <img src="${esc(p.fotos[0] || "")}" alt="${esc(p.titulo)}" loading="lazy" width="800" height="600">
        ${ESTADO[p.estado] ? `<span class="etiqueta etiqueta--${p.estado}">${ESTADO[p.estado]}</span>` : ""}
        ${p.fotos.length > 1 ? `<span class="tarjeta__num">${p.fotos.length} fotos</span>` : ""}
      </div>
      <div class="tarjeta__cuerpo">
        <span class="tarjeta__zona">${esc(p.zona)}</span>
        <h3>${esc(p.titulo)}</h3>
        <p class="tarjeta__precio">${p.estado === "vendida" ? "Vendida por Lolys" : pesos(p.precio)}${p.precio_nota && p.estado !== "vendida" ? `<small>${esc(p.precio_nota)}</small>` : ""}</p>
        <ul class="datos">${datosCasa(p)}</ul>
      </div>
    </button>`).join("") + `
    <a class="tarjeta tarjeta--busca" href="#busqueda">
      <svg viewBox="0 0 120 120" aria-hidden="true"><use href="#trebol"/></svg>
      <h3>¿No está aquí la tuya?</h3>
      <p>Cuéntame qué buscas y la busco en todo el mercado.</p>
      <span>Empezar mi búsqueda →</span>
    </a>`;
  abrirDesdeHash();
}

// ---------- Ficha ----------
const ficha = $("#ficha");
let actual = null, foto = 0;
function mostrarFoto() {
  const img = $("#ficha-foto");
  img.src = actual.fotos[foto] || "";
  img.alt = `${actual.titulo}, foto ${foto + 1}`;
  $("#ficha-contador").textContent = `${foto + 1} / ${actual.fotos.length}`;
  $$(".ficha__flecha").forEach((b) => (b.hidden = actual.fotos.length < 2));
  const sig = actual.fotos[(foto + 1) % actual.fotos.length];
  if (sig) new Image().src = sig;
}
function abrir(p) {
  actual = p; foto = 0;
  $("#ficha-zona").textContent = p.zona;
  $("#ficha-titulo").textContent = p.titulo;
  $("#ficha-precio").innerHTML = p.estado === "vendida" ? "Vendida por Lolys" : `${pesos(p.precio)}${p.precio_nota ? ` <small>· ${esc(p.precio_nota)}</small>` : ""}`;
  $("#ficha-datos").innerHTML = datosCasa(p);
  $("#ficha-descripcion").textContent = p.descripcion;
  $("#ficha-carac").innerHTML = p.caracteristicas.map((c) => `<li>${esc(c)}</li>`).join("");
  const wa = $("#ficha-wa");
  wa.hidden = p.estado === "vendida";
  wa.href = ligaWA(`Me interesa la casa "${p.titulo}" en ${p.zona} (${pesos(p.precio)}). ¿Sigue disponible?`);
  mostrarFoto();
  if (!ficha.open) ficha.showModal();
  history.replaceState(null, "", `#casa-${p.id.slice(0, 8)}`);
}
function cerrar() { if (ficha.open) ficha.close(); }
ficha.addEventListener("close", () => { if (location.hash.startsWith("#casa-")) history.replaceState(null, "", location.pathname + location.search); });
ficha.addEventListener("click", (e) => {
  if (e.target === ficha || e.target.closest("[data-cerrar]")) cerrar();
  const m = e.target.closest("[data-mover]");
  if (m) { foto = (foto + Number(m.dataset.mover) + actual.fotos.length) % actual.fotos.length; mostrarFoto(); }
});
addEventListener("keydown", (e) => {
  if (!ficha.open || actual?.fotos.length < 2) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { foto = (foto + (e.key === "ArrowRight" ? 1 : -1) + actual.fotos.length) % actual.fotos.length; mostrarFoto(); }
});
let toque = 0;
$(".ficha__galeria").addEventListener("touchstart", (e) => (toque = e.touches[0].clientX), { passive: true });
$(".ficha__galeria").addEventListener("touchend", (e) => {
  const d = e.changedTouches[0].clientX - toque;
  if (Math.abs(d) > 40 && actual.fotos.length > 1) { foto = (foto + (d < 0 ? 1 : -1) + actual.fotos.length) % actual.fotos.length; mostrarFoto(); }
});
$("#rejilla").addEventListener("click", (e) => { const t = e.target.closest("[data-i]"); if (t) abrir(casas[t.dataset.i]); });
function abrirDesdeHash() {
  const m = location.hash.match(/^#casa-([\w-]+)/);
  const p = m && casas.find((c) => c.id.startsWith(m[1]));
  if (p) abrir(p);
}

// ---------- Testimonios ----------
if (TESTIMONIOS.length) {
  $("#opiniones").hidden = false;
  $("#opiniones-lista").innerHTML = TESTIMONIOS.map((t) => `<figure class="opinion"><blockquote>“${esc(t.texto)}”</blockquote><figcaption><strong>${esc(t.nombre)}</strong>${t.detalle ? ` · ${esc(t.detalle)}` : ""}</figcaption></figure>`).join("");
}

cargarCasas();
