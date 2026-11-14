// Clover House — Worker: casas (D1), fotos subidas (/media), acceso al panel con código por correo.
import { SEMILLA } from "./semilla.js";

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS propiedades (id TEXT PRIMARY KEY, titulo TEXT NOT NULL, zona TEXT NOT NULL DEFAULT '', precio INTEGER NOT NULL DEFAULT 0, precio_nota TEXT NOT NULL DEFAULT '', estado TEXT NOT NULL DEFAULT 'disponible', recamaras REAL NOT NULL DEFAULT 0, banos REAL NOT NULL DEFAULT 0, construccion REAL NOT NULL DEFAULT 0, terreno REAL NOT NULL DEFAULT 0, descripcion TEXT NOT NULL DEFAULT '', caracteristicas TEXT NOT NULL DEFAULT '[]', fotos TEXT NOT NULL DEFAULT '[]', visible INTEGER NOT NULL DEFAULT 1, orden INTEGER NOT NULL DEFAULT 0, creado TEXT NOT NULL DEFAULT (datetime('now')), actualizado TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS archivos (clave TEXT PRIMARY KEY, tipo TEXT NOT NULL, datos BLOB NOT NULL, creado TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS acceso_codigos (email TEXT PRIMARY KEY, hash TEXT NOT NULL, expira INTEGER NOT NULL, intentos INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS acceso_sesiones (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expira INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)`,
];

const ESTADOS = ["disponible", "apartada", "vendida"];
const COOKIE = "ch_sesion";
const DIA = 86400000;
const MAX_FOTO = 1900000;

let listo = null;
async function prepararBase(db) {
  if (!listo) {
    listo = (async () => {
      await db.batch(ESQUEMA.map((s) => db.prepare(s)));
      const m = await db.prepare("SELECT valor FROM meta WHERE clave = 'sembrado'").first();
      if (!m) {
        await db.batch([
          ...SEMILLA.map((p) => insertar(db, p)),
          db.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('sembrado', ?)").bind(new Date().toISOString()),
        ]);
      }
    })().catch((e) => { listo = null; throw e; });
  }
  return listo;
}

function insertar(db, p) {
  return db.prepare(
    `INSERT OR REPLACE INTO propiedades (id, titulo, zona, precio, precio_nota, estado, recamaras, banos, construccion, terreno, descripcion, caracteristicas, fotos, visible, orden, actualizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(p.id, p.titulo, p.zona, p.precio, p.precio_nota, p.estado, p.recamaras, p.banos, p.construccion, p.terreno, p.descripcion, JSON.stringify(p.caracteristicas), JSON.stringify(p.fotos), p.visible, p.orden);
}

const desdeFila = (r) => ({ ...r, caracteristicas: JSON.parse(r.caracteristicas || "[]"), fotos: JSON.parse(r.fotos || "[]") });

export function limpiarPropiedad(e, id) {
  const txt = (v, max = 200) => String(v ?? "").trim().slice(0, max);
  const num = (v) => { const n = Number(String(v ?? "").replace(/[$,\s]/g, "")); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const p = {
    id,
    titulo: txt(e.titulo, 120),
    zona: txt(e.zona, 80),
    precio: Math.round(num(e.precio)),
    precio_nota: txt(e.precio_nota, 40),
    estado: ESTADOS.includes(e.estado) ? e.estado : "disponible",
    recamaras: num(e.recamaras), banos: num(e.banos), construccion: num(e.construccion), terreno: num(e.terreno),
    descripcion: txt(e.descripcion, 3000),
    caracteristicas: (Array.isArray(e.caracteristicas) ? e.caracteristicas : String(e.caracteristicas ?? "").split("\n")).map((c) => txt(c, 120)).filter(Boolean).slice(0, 30),
    fotos: (Array.isArray(e.fotos) ? e.fotos : []).filter((f) => typeof f === "string" && /^\/(fotos|media)\/[\w.-]+\.webp$/.test(f)).slice(0, 40),
    visible: e.visible === false || e.visible === 0 ? 0 : 1,
    orden: Math.round(num(e.orden)),
  };
  if (!p.titulo) throw new Respuesta(400, "Falta el título");
  return p;
}

class Respuesta extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

async function sha256(texto) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const aleatorio = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const admins = (env) => String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const leerCookie = (req, nombre) => (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(nombre + "="))?.slice(nombre.length + 1);

async function sesion(req, env) {
  const t = leerCookie(req, COOKIE);
  if (!t || !env.DB) return null;
  const r = await env.DB.prepare("SELECT email, expira FROM acceso_sesiones WHERE hash = ?").bind(await sha256(t)).first();
  if (!r || r.expira < Date.now() || !admins(env).includes(r.email)) return null;
  return r.email;
}

async function enviarCodigo(env, email, codigo) {
  if (!env.RESEND_API_KEY) throw new Respuesta(500, "Falta configurar el envío de correos (RESEND_API_KEY)");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.REMITENTE || "Clover House <acceso@asesorsebas.com>",
      to: [email],
      subject: `Tu código para entrar: ${codigo}`,
      html: `<div style="font-family:Arial,sans-serif;color:#1B2420"><p>Tu código para entrar al panel de Clover House es:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold;color:#1F4D3A">${codigo}</p><p>Vence en 10 minutos. Si no lo pediste, ignora este correo.</p></div>`,
    }),
  });
  if (!r.ok) throw new Respuesta(502, `No se pudo enviar el correo (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

async function api(req, env, url) {
  const ruta = url.pathname;
  const metodo = req.method;
  const db = env.DB;

  if (ruta === "/api/propiedades" && metodo === "GET") {
    if (!db) return json(SEMILLA.filter((p) => p.visible), 200, { "cache-control": "public, max-age=60" });
    try {
      await prepararBase(db);
      const { results } = await db.prepare("SELECT * FROM propiedades WHERE visible = 1 ORDER BY CASE estado WHEN 'vendida' THEN 1 ELSE 0 END, orden, creado").all();
      return json(results.map(desdeFila), 200, { "cache-control": "public, max-age=60" });
    } catch {
      return json(SEMILLA.filter((p) => p.visible), 200, { "x-respaldo": "1" });
    }
  }

  if (!db) throw new Respuesta(503, "Falta conectar la base de datos (D1)");
  await prepararBase(db);

  if (ruta === "/api/acceso/pedir" && metodo === "POST") {
    const { email } = await req.json().catch(() => ({}));
    const e = String(email || "").trim().toLowerCase();
    if (admins(env).includes(e)) {
      const previo = await db.prepare("SELECT expira FROM acceso_codigos WHERE email = ?").bind(e).first();
      if (previo && previo.expira - 9 * 60000 > Date.now()) throw new Respuesta(429, "Espera un minuto antes de pedir otro código");
      const codigo = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
      await db.prepare("INSERT OR REPLACE INTO acceso_codigos (email, hash, expira, intentos) VALUES (?, ?, ?, 0)").bind(e, await sha256(codigo), Date.now() + 10 * 60000).run();
      await enviarCodigo(env, e, codigo);
    }
    return json({ ok: true }); // misma respuesta aunque el correo no sea admin
  }

  if (ruta === "/api/acceso/entrar" && metodo === "POST") {
    const { email, codigo } = await req.json().catch(() => ({}));
    const e = String(email || "").trim().toLowerCase();
    const r = await db.prepare("SELECT hash, expira, intentos FROM acceso_codigos WHERE email = ?").bind(e).first();
    if (!r || r.expira < Date.now() || r.intentos >= 5) throw new Respuesta(401, "El código venció. Pide uno nuevo.");
    if (r.hash !== (await sha256(String(codigo || "").trim()))) {
      await db.prepare("UPDATE acceso_codigos SET intentos = intentos + 1 WHERE email = ?").bind(e).run();
      throw new Respuesta(401, "Código incorrecto");
    }
    const token = aleatorio(32);
    await db.batch([
      db.prepare("DELETE FROM acceso_codigos WHERE email = ?").bind(e),
      db.prepare("DELETE FROM acceso_sesiones WHERE expira < ?").bind(Date.now()),
      db.prepare("INSERT INTO acceso_sesiones (hash, email, expira) VALUES (?, ?, ?)").bind(await sha256(token), e, Date.now() + 30 * DIA),
    ]);
    return json({ ok: true, email: e }, 200, { "set-cookie": `${COOKIE}=${token}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax` });
  }

  if (ruta === "/api/acceso/salir" && metodo === "POST") {
    const t = leerCookie(req, COOKIE);
    if (t) await db.prepare("DELETE FROM acceso_sesiones WHERE hash = ?").bind(await sha256(t)).run();
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }

  if (!ruta.startsWith("/api/admin/")) throw new Respuesta(404, "No encontrado");
  const quien = await sesion(req, env);
  if (!quien) throw new Respuesta(401, "Entra con tu correo");

  if (ruta === "/api/admin/yo") return json({ email: quien });

  if (ruta === "/api/admin/propiedades" && metodo === "GET") {
    const { results } = await db.prepare("SELECT * FROM propiedades ORDER BY orden, creado").all();
    return json(results.map(desdeFila));
  }

  const mProp = ruta.match(/^\/api\/admin\/propiedades(?:\/([\w-]{8,64}))?$/);
  if (mProp && (metodo === "POST" || metodo === "PUT")) {
    const id = mProp[1] || crypto.randomUUID();
    const p = limpiarPropiedad(await req.json(), id);
    const antes = await db.prepare("SELECT fotos FROM propiedades WHERE id = ?").bind(id).first();
    const quitadas = antes ? JSON.parse(antes.fotos).filter((f) => f.startsWith("/media/") && !p.fotos.includes(f)) : [];
    await db.batch([insertar(db, p), ...quitadas.map((f) => db.prepare("DELETE FROM archivos WHERE clave = ?").bind(f.slice(7, -5)))]);
    return json(p);
  }
  if (mProp && mProp[1] && metodo === "DELETE") {
    const antes = await db.prepare("SELECT fotos FROM propiedades WHERE id = ?").bind(mProp[1]).first();
    const subidas = antes ? JSON.parse(antes.fotos).filter((f) => f.startsWith("/media/")) : [];
    await db.batch([db.prepare("DELETE FROM propiedades WHERE id = ?").bind(mProp[1]), ...subidas.map((f) => db.prepare("DELETE FROM archivos WHERE clave = ?").bind(f.slice(7, -5)))]);
    return json({ ok: true });
  }

  if (ruta === "/api/admin/fotos" && metodo === "POST") {
    const datos = await req.arrayBuffer();
    if (!datos.byteLength || datos.byteLength > MAX_FOTO) throw new Respuesta(413, "La foto pesa demasiado");
    const clave = aleatorio(12);
    await db.prepare("INSERT INTO archivos (clave, tipo, datos) VALUES (?, ?, ?)").bind(clave, "image/webp", datos).run();
    return json({ url: `/media/${clave}.webp` });
  }

  throw new Respuesta(404, "No encontrado");
}

async function media(env, clave) {
  if (!env.DB) return new Response("No encontrado", { status: 404 });
  await prepararBase(env.DB);
  const r = await env.DB.prepare("SELECT tipo, datos FROM archivos WHERE clave = ?").bind(clave).first();
  if (!r) return new Response("No encontrado", { status: 404 });
  return new Response(r.datos, { headers: { "content-type": r.tipo, "cache-control": "public, max-age=31536000, immutable" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const redirigir = String(env.REDIRIGIR || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (env.DOMINIO && redirigir.includes(url.hostname)) {
      return Response.redirect(`https://${env.DOMINIO}${url.pathname}${url.search}`, 301);
    }
    try {
      if (url.pathname.startsWith("/api/")) return await api(req, env, url);
      const m = url.pathname.match(/^\/media\/([a-f0-9]{24})\.webp$/);
      if (m) return await media(env, m[1]);
    } catch (e) {
      const status = e instanceof Respuesta ? e.status : 500;
      return json({ error: e instanceof Respuesta ? e.message : `Error del servidor: ${e.message}` }, status);
    }
    const res = await env.ASSETS.fetch(req);
    // Fuera del dominio final (liga de prueba workers.dev), las URLs absolutas de OG apuntan al host actual
    if (env.DOMINIO && url.hostname !== env.DOMINIO && (res.headers.get("content-type") || "").includes("text/html")) {
      const html = (await res.text()).replaceAll(`https://${env.DOMINIO}`, url.origin);
      const h = new Headers(res.headers); h.delete("content-length");
      return new Response(html, { status: res.status, headers: h });
    }
    return res;
  },
};
