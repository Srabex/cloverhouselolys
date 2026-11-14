# Arma una vista previa de un solo archivo (todo incrustado) para publicarla como artifact de claude.ai.
# Uso: python3 herramientas/vista-previa.py  → dist/vista-previa.html
import base64, io, json, re, subprocess
from pathlib import Path
from PIL import Image
R = Path(__file__).resolve().parent.parent
P = R / "public"
def uri(path, mime): return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
def img_uri(path, ancho=900, q=62):
    im = Image.open(path).convert("RGB"); im.thumbnail((ancho, ancho * 2))
    b = io.BytesIO(); im.save(b, "WEBP", quality=q); return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()

casas = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
  "import {SEMILLA} from './worker/semilla.js'; console.log(JSON.stringify(SEMILLA))"], cwd=R))
cache = {}
for c in casas:
    c["fotos"] = [cache.setdefault(f, img_uri(P / f.lstrip("/"))) for f in c["fotos"]]

css = (P / "estilos.css").read_text()
for f in (P / "fuentes").glob("*.woff"):
    css = css.replace(f"/fuentes/{f.name}", uri(f, "font/woff"))
js = (P / "app.js").read_text()
js = js.replace('const r = await fetch("/api/propiedades");\n    casas = r.ok ? await r.json() : [];', "casas = window.__CASAS;")
js = js.replace('window.open(ligaWA(texto), "_blank", "noopener");',
  'const err = $("#error"); err.hidden = false; err.innerHTML = `Vista previa: <a href="${ligaWA(texto)}" target="_blank" rel="noopener">abrir el mensaje en WhatsApp</a>`;')
html = (P / "index.html").read_text()
html = re.sub(r'<link rel="(icon|apple-touch-icon|manifest|preload)[^>]*>\n', "", html)
html = html.replace('<link rel="stylesheet" href="/estilos.css?v=1">', f"<style>{css}</style>")
html = html.replace('src="/img/lolys.webp"', f'src="{img_uri(P / "img/lolys.webp", 800, 75)}"')
html = html.replace('<script src="/app.js?v=1" defer></script>',
  f"<script>window.__CASAS={json.dumps(casas)};</script><script>{js}</script>")
html = html.replace("<title>", f'<link rel="icon" href="{uri(P / "favicon.svg", "image/svg+xml")}"><title>', 1)
(R / "dist").mkdir(exist_ok=True)
(R / "dist/vista-previa.html").write_text(html)
print(f"{len(html)/1e6:.1f} MB")
