// Servidor local para probar: sirve public/ y pasa /api y /media por el Worker con una D1 simulada (node:sqlite).
// Uso: node herramientas/dev.mjs [puerto] [--sin-db]
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.js";

const PUERTO = Number(process.argv[2]) || 8787;
const SIN_DB = process.argv.includes("--sin-db");
const RAIZ = new URL("../public/", import.meta.url).pathname;
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff": "font/woff", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".xml": "application/xml" };

export function d1(ruta = ":memory:") {
  const db = new DatabaseSync(ruta);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args.map(conv)) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args.map(conv)) }),
    run: async () => db.prepare(sql).run(...args.map(conv)),
  });
  const conv = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : v);
  return { prepare: (sql) => stmt(sql), batch: async (lista) => { for (const s of lista) await s.run(); return []; } };
}

const ASSETS = {
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p.endsWith("/")) p += "index.html";
    try {
      const datos = await readFile(join(RAIZ, p));
      return new Response(datos, { headers: { "content-type": TIPOS[extname(p)] || "application/octet-stream" } });
    } catch {
      try { const d = await readFile(join(RAIZ, p, "index.html")); return new Response(d, { headers: { "content-type": TIPOS[".html"] } }); } catch {}
      return new Response("No encontrado", { status: 404 });
    }
  },
};

export const correos = [];
export function entorno(extra = {}) {
  return {
    ASSETS, DB: SIN_DB ? undefined : d1(), DOMINIO: "cloverhouse.mx", REDIRIGIR: "www.cloverhouse.mx",
    ADMIN_EMAILS: "lolysla@outlook.com,srab17.6@gmail.com", RESEND_API_KEY: "prueba", ...extra,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = entorno();
  // Simula Resend: imprime el código en la consola
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    if (String(u).startsWith("https://api.resend.com")) { const b = JSON.parse(o.body); console.log("CORREO a", b.to[0], "→", b.subject); return new Response("{}"); }
    return fetchReal(u, o);
  };
  http.createServer(async (req, res) => {
    const cuerpo = await new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
    const r = await worker.fetch(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : cuerpo }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  }).listen(PUERTO, () => console.log(`http://localhost:${PUERTO}`));
}
