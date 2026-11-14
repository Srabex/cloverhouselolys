import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { d1 } from "../herramientas/dev.mjs";

let ultimoCodigo = null;
globalThis.fetch = async (u, o) => {
  if (String(u).startsWith("https://api.resend.com")) { ultimoCodigo = JSON.parse(o.body).subject.match(/\d{6}/)[0]; return new Response("{}"); }
  throw new Error("fetch inesperado " + u);
};
const env = { DB: d1(), ADMIN_EMAILS: "lolysla@outlook.com,srab17.6@gmail.com", RESEND_API_KEY: "x", DOMINIO: "cloverhouse.mx", REDIRIGIR: "www.cloverhouse.mx", ASSETS: { fetch: async () => new Response("asset") } };
const pide = (ruta, o = {}) => worker.fetch(new Request("https://cloverhouse.mx" + ruta, o), env);
const post = (ruta, cuerpo, cookie) => pide(ruta, { method: "POST", body: JSON.stringify(cuerpo), headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) } });

test("lista pública sembrada con las 6 casas", async () => {
  const r = await pide("/api/propiedades");
  const casas = await r.json();
  assert.equal(casas.length, 6);
  assert.ok(casas[0].fotos[0].startsWith("/fotos/"));
});

test("sin base de datos usa la semilla", async () => {
  const r = await worker.fetch(new Request("https://x.dev/api/propiedades"), { ...env, DB: undefined });
  assert.equal((await r.json()).length, 6);
});

test("www redirige al dominio", async () => {
  const r = await worker.fetch(new Request("https://www.cloverhouse.mx/casa?x=1"), env);
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("location"), "https://cloverhouse.mx/casa?x=1");
});

test("panel protegido", async () => {
  assert.equal((await pide("/api/admin/propiedades")).status, 401);
});

test("correo no admin no recibe código", async () => {
  ultimoCodigo = null;
  const r = await post("/api/acceso/pedir", { email: "otro@x.com" });
  assert.equal(r.status, 200);
  assert.equal(ultimoCodigo, null);
});

let cookie;
test("entrar con código y editar casas", async () => {
  await post("/api/acceso/pedir", { email: "LolysLA@outlook.com" });
  assert.match(ultimoCodigo, /^\d{6}$/);
  assert.equal((await post("/api/acceso/entrar", { email: "lolysla@outlook.com", codigo: "000000" === ultimoCodigo ? "111111" : "000000" })).status, 401);
  const r = await post("/api/acceso/entrar", { email: "lolysla@outlook.com", codigo: ultimoCodigo });
  assert.equal(r.status, 200);
  cookie = r.headers.get("set-cookie").split(";")[0];

  const foto = await pide("/api/admin/fotos", { method: "POST", body: new Uint8Array([1, 2, 3]), headers: { cookie } });
  const { url } = await foto.json();
  assert.match(url, /^\/media\/[a-f0-9]{24}\.webp$/);
  const media = await pide(url);
  assert.deepEqual([...new Uint8Array(await media.arrayBuffer())], [1, 2, 3]);

  const nueva = await (await post("/api/admin/propiedades", { titulo: "Casa prueba", precio: "$1,500,000", estado: "vendida", fotos: [url, "javascript:alert(1)"], caracteristicas: "Patio\n\nCochera" }, cookie)).json();
  assert.equal(nueva.precio, 1500000);
  assert.deepEqual(nueva.fotos, [url]);
  assert.deepEqual(nueva.caracteristicas, ["Patio", "Cochera"]);

  const publicas = await (await pide("/api/propiedades")).json();
  assert.equal(publicas.length, 7);
  assert.equal(publicas.at(-1).titulo, "Casa prueba"); // vendidas al final

  await post(`/api/admin/propiedades/${nueva.id}`, { ...nueva, visible: false, fotos: [] }, cookie);
  assert.equal((await (await pide("/api/propiedades")).json()).length, 6);
  assert.equal((await pide(url)).status, 404); // foto quitada se borra

  const borrar = await pide(`/api/admin/propiedades/${nueva.id}`, { method: "DELETE", headers: { cookie } });
  assert.equal(borrar.status, 200);
  assert.equal((await (await pide("/api/admin/propiedades", { headers: { cookie } })).json()).length, 6);
});

test("salir invalida la sesión", async () => {
  await post("/api/acceso/salir", {}, cookie);
  assert.equal((await pide("/api/admin/yo", { headers: { cookie } })).status, 401);
});
