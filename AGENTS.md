# Clover House · Lolys Alvarez (cloverhouse.mx)

Sitio de Lolys Alvarez, asesora inmobiliaria en Chihuahua. Rehecho desde cero fuera de Lovable y **publicado en cloverhouse.mx el 19 nov 2026**; fuera de Lovable desde el 20 nov 2026. El repo viejo `Srabex/cloverhouse` (Lovable) queda como respaldo; ahí, en la rama `rescate-lovable`, están el export de la tabla y las fotos originales.

## Objetivo comercial
Captar **compradores** (no vendedores, decisión de Sebas). Concepto A + C: "No te vendo mi inventario, encuentro la casa que tú necesitas". Lo principal es el formulario **Cuéntame qué buscas** (manda la búsqueda por WhatsApp); las casas son secundarias ("Opciones disponibles hoy") y la confianza se apoya en el método del trébol, las cifras (+7 años, +50 negociaciones), Sobre mí y los testimonios.

## Cómo está hecho
- Sin compilación: `public/` (HTML/CSS/JS) + `worker/index.js` (Cloudflare Worker con `run_worker_first`).
- Casas en D1 (binding `DB`). Las tablas se crean solas y la primera vez se llenan con `worker/semilla.js` (las 6 casas rescatadas). Si no hay D1 o falla, `/api/propiedades` responde con la semilla (el sitio nunca se queda sin casas).
- Fotos de las casas rescatadas: `public/fotos/<zona>-NN.webp`. Fotos subidas desde el panel: tabla `archivos` (BLOB, máx. ~1.9 MB), servidas en `/media/<clave>.webp`.
- Panel `/admin/`: código de 6 dígitos por correo (Resend, remitente `acceso@asesorsebas.com`) solo para `ADMIN_EMAILS`; sesión de 30 días en cookie `ch_sesion` (en D1 solo el hash). Altas, edición, estados Disponible/Apartada/Vendida, ocultar, ordenar, fotos (se reducen en el celular a WebP 1600 px).
- Vendidas se muestran al final como "Vendida por Lolys" (prueba social).
- WhatsApp de Lolys: 614 142 0049. Todos los mensajes empiezan "Hola Lolys, vengo de cloverhouse.mx." (con `?utm_source=` dicen "vi tu anuncio y vengo de…").
- Testimonios: arreglo `TESTIMONIOS` en `public/app.js`; la sección se muestra sola cuando tiene algo.
- `www.cloverhouse.mx` redirige 301 a `cloverhouse.mx` (var `REDIRIGIR`).

## Identidad (propuesta nov 2026, pendiente de aprobar por Lolys)
Trébol de cuatro hojas con una puerta dorada al centro ("tu casa en el centro de la suerte"). Fuente: `diseno/marca.svg`. Paleta: verde trébol #1F4D3A, verde noche #143326, salvia #8FA98A, crema #F6F1E7, arena #ECE3D2, oro #C9A24A. Letras Lora (títulos) + Poppins, servidas desde `public/fuentes/`.

## Página /propuesta
Explica a Lolys el concepto A + C, el significado del trébol, colores y lo que falta de ella (`noindex`). OG propia `public/propuesta/og.jpg` (fuente `diseno/og-propuesta.html`). Se puede quitar al publicar en cloverhouse.mx.

## Estándar
OG `public/og.jpg` (fuente `diseno/og.html`, captura 1200×630 con Chrome headless), favicon e íconos (fuentes `diseno/marca.svg` e `icono.svg`), `site.webmanifest`, datos `RealEstateAgent`, robots y sitemap. En la liga de prueba (workers.dev) el Worker cambia las URLs absolutas `https://cloverhouse.mx` del HTML por el host actual para que la vista previa de WhatsApp funcione.

## Probar
- `node --test pruebas/*.test.mjs`
- `node herramientas/dev.mjs 8787` → http://localhost:8787 (D1 simulada con `node:sqlite`; el código de acceso sale en la consola).

## Estado (20 nov 2026)
- En producción en cloverhouse.mx (zona en Cloudflare, nameservers darwin/gail; registro en GoDaddy, vence 15/09/2027). Custom domain raíz y www.
- Pendiente de Lolys: visto bueno del logo y textos, testimonios (`TESTIMONIOS` en `public/app.js`), zonas del formulario, si siguen las 6 casas, redes y horario, entrar al panel. La lista completa está en `/propuesta`.
- Ojo al cambiar nameservers: revisar que GoDaddy esté en el dominio correcto (el 19 nov 2026 se pusieron por error en gomakers.mx).

## Cloudflare
Worker `cloverhouselolys`: Import a repository, build vacío, deploy `npx wrangler deploy`, producción en `main`. D1 `cloverhouse` (ID ab2e666d-e1b8-4dd6-998d-636e145a9e3d, ya en `wrangler.jsonc`). Secret `RESEND_API_KEY` (llave de Resend solo para asesorsebas.com). Dominio: modelo Six de Tacos (zona en Cloudflare, nameservers en GoDaddy, Custom domain raíz + www; no quitar el dominio en Lovable hasta que los DNS ya respondan Cloudflare).
