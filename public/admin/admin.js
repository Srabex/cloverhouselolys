// Panel de Clover House: entrar con código por correo, editar casas y subir fotos.
const $ = (s, r = document) => r.querySelector(s);
const vistas = ["entrar", "lista", "editor"];
const ver = (v) => vistas.forEach((n) => ($(`#vista-${n}`).hidden = n !== v));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pesos = (n) => (n ? "$" + Number(n).toLocaleString("es-MX") : "Sin precio");

let tAviso;
function aviso(texto, error = false) {
  const a = $("#aviso");
  a.textContent = texto; a.hidden = false; a.classList.toggle("aviso--error", error);
  clearTimeout(tAviso); tAviso = setTimeout(() => (a.hidden = true), error ? 6000 : 2500);
}

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, { credentials: "same-origin", ...opciones, headers: { "content-type": "application/json", ...(opciones.headers || {}) } });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && ruta.startsWith("/api/admin/")) { ver("entrar"); $("#salir").hidden = true; throw new Error("Entra de nuevo con tu correo"); }
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

// ---------- Entrar ----------
let correo = "";
$("#form-correo").addEventListener("submit", async (e) => {
  e.preventDefault();
  correo = e.target.email.value.trim().toLowerCase();
  const b = e.target.querySelector("button"); b.disabled = true;
  try {
    await api("/api/acceso/pedir", { method: "POST", body: JSON.stringify({ email: correo }) });
    $("#correo-enviado").textContent = correo;
    $("#form-correo").hidden = true; $("#form-codigo").hidden = false;
    $("#form-codigo").codigo.focus();
  } catch (err) { aviso(err.message, true); } finally { b.disabled = false; }
});
$("#form-codigo").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/acceso/entrar", { method: "POST", body: JSON.stringify({ email: correo, codigo: e.target.codigo.value }) });
    e.target.reset(); iniciar();
  } catch (err) { aviso(err.message, true); }
});
$("#otro-correo").addEventListener("click", () => { $("#form-codigo").hidden = true; $("#form-correo").hidden = false; });
$("#salir").addEventListener("click", async () => { await api("/api/acceso/salir", { method: "POST" }).catch(() => {}); location.reload(); });

// ---------- Lista ----------
let casas = [];
async function cargarLista() {
  casas = await api("/api/admin/propiedades");
  $("#lista").innerHTML = casas.length ? casas.map((p, i) => {
    const etiqueta = !p.visible ? ["oculta", "Oculta"] : p.estado === "vendida" ? ["vendida", "Vendida"] : p.estado === "apartada" ? ["apartada", "Apartada"] : ["", "Disponible"];
    return `<button class="fila" type="button" data-i="${i}">
      <img src="${esc(p.fotos[0] || "")}" alt="" loading="lazy">
      <span><strong>${esc(p.titulo)}</strong><small>${esc(p.zona)} · ${pesos(p.precio)} · ${p.fotos.length} fotos</small></span>
      <span class="pastilla pastilla--${etiqueta[0]}">${etiqueta[1]}</span>
    </button>`;
  }).join("") : `<p class="ayuda">Todavía no hay casas. Agrega la primera.</p>`;
}
$("#lista").addEventListener("click", (e) => { const f = e.target.closest("[data-i]"); if (f) editar(casas[f.dataset.i]); });
$("#nueva").addEventListener("click", () => editar(null));
$("#volver").addEventListener("click", () => { if (!sinCambios() && !confirm("¿Salir sin guardar?")) return; ver("lista"); });

// ---------- Editor ----------
const form = $("#form-casa");
let actual = null, fotos = [], foto0 = "";
const NUMS = ["precio", "recamaras", "banos", "construccion", "terreno", "orden"];
function editar(p) {
  actual = p;
  $("#editor-titulo").textContent = p ? "Editar casa" : "Nueva casa";
  $("#borrar").hidden = !p;
  form.reset();
  const c = p || { estado: "disponible", visible: 1, orden: (casas.at(-1)?.orden ?? 0) + 1, caracteristicas: [], fotos: [] };
  ["titulo", "zona", "precio_nota", "descripcion", "estado", ...NUMS].forEach((k) => (form[k].value = c[k] ?? ""));
  form.caracteristicas.value = (c.caracteristicas || []).join("\n");
  form.visible.checked = !!c.visible;
  fotos = [...(c.fotos || [])];
  pintarFotos();
  foto0 = JSON.stringify(datosForm());
  ver("editor"); scrollTo(0, 0);
}
const sinCambios = () => JSON.stringify(datosForm()) === foto0;
function datosForm() {
  const d = Object.fromEntries(["titulo", "zona", "precio_nota", "descripcion", "estado", ...NUMS].map((k) => [k, form[k].value]));
  d.caracteristicas = form.caracteristicas.value.split("\n").map((s) => s.trim()).filter(Boolean);
  d.visible = form.visible.checked;
  d.fotos = fotos;
  return d;
}
function pintarFotos() {
  $("#fotos").innerHTML = fotos.map((f, i) => `
    <div class="foto"><img src="${esc(f)}" alt="Foto ${i + 1}">
      <div class="foto__botones">
        <button type="button" data-a="izq" data-i="${i}" aria-label="Mover a la izquierda" ${i === 0 ? "disabled" : ""}>←</button>
        <button type="button" data-a="portada" data-i="${i}" aria-label="Poner de portada" title="Portada">★</button>
        <button type="button" data-a="quitar" data-i="${i}" aria-label="Quitar foto">✕</button>
        <button type="button" data-a="der" data-i="${i}" aria-label="Mover a la derecha" ${i === fotos.length - 1 ? "disabled" : ""}>→</button>
      </div></div>`).join("");
}
$("#fotos").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const i = Number(b.dataset.i), a = b.dataset.a;
  if (a === "quitar") { if (confirm("¿Quitar esta foto?")) fotos.splice(i, 1); }
  else if (a === "portada") fotos.unshift(...fotos.splice(i, 1));
  else { const j = a === "izq" ? i - 1 : i + 1; [fotos[i], fotos[j]] = [fotos[j], fotos[i]]; }
  pintarFotos();
});

// Reduce la foto en el celular antes de subirla (WebP, 1600 px, sin datos de ubicación)
async function reducir(archivo) {
  const img = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.82, 0.7, 0.55]) {
    const b = await new Promise((r) => c.toBlob(r, "image/webp", q));
    if (b && b.size < 1800000) return b;
  }
  throw new Error("La foto es demasiado grande");
}
$("#archivo").addEventListener("change", async (e) => {
  const lista = [...e.target.files]; e.target.value = "";
  const estado = $("#subiendo"); estado.hidden = false;
  for (const [n, a] of lista.entries()) {
    estado.textContent = `Subiendo foto ${n + 1} de ${lista.length}…`;
    try {
      const blob = await reducir(a);
      const r = await fetch("/api/admin/fotos", { method: "POST", body: blob, headers: { "content-type": "image/webp" } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo subir");
      fotos.push(d.url); pintarFotos();
    } catch (err) { aviso(`${a.name}: ${err.message}`, true); }
  }
  estado.hidden = true;
  aviso("Fotos listas. No olvides Guardar.");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = $("#guardar"); b.disabled = true;
  try {
    const ruta = actual ? `/api/admin/propiedades/${actual.id}` : "/api/admin/propiedades";
    await api(ruta, { method: actual ? "PUT" : "POST", body: JSON.stringify(datosForm()) });
    aviso("Guardado ✓");
    await cargarLista(); ver("lista");
  } catch (err) { aviso(err.message, true); } finally { b.disabled = false; }
});
$("#borrar").addEventListener("click", async () => {
  if (!actual || !confirm(`¿Borrar "${actual.titulo}"? Si ya se vendió, mejor márcala como Vendida.`)) return;
  try { await api(`/api/admin/propiedades/${actual.id}`, { method: "DELETE" }); aviso("Casa borrada"); await cargarLista(); ver("lista"); }
  catch (err) { aviso(err.message, true); }
});

// ---------- Inicio ----------
async function iniciar() {
  try {
    await api("/api/admin/yo");
    $("#salir").hidden = false;
    await cargarLista(); ver("lista");
  } catch (err) {
    ver("entrar");
    if (!/Entra/.test(err.message)) aviso(err.message, true);
  }
}
iniciar();
