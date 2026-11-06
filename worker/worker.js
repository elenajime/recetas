// Cloudflare Worker: recibe { url, text? } y devuelve { recipe } o { error }.
// Variables (Settings > Variables en Cloudflare):
//   GEMINI_API_KEY  (secreto, obligatorio)  clave gratuita de https://aistudio.google.com/apikey
//   GEMINI_MODEL    (opcional)              por defecto "gemini-2.0-flash"; si deja de existir, pon otro modelo gratuito
//   APP_TOKEN       (opcional)              si lo defines, la app debe enviarlo en la cabecera x-token
//   ALLOWED_ORIGIN  (opcional)              p. ej. https://TU_USUARIO.github.io (por defecto cualquiera)

const SECTIONS = ["Despensa", "Fruta y verdura", "Lácteos", "Carne y pescado", "Panadería", "Otros"];
const ALLOWED_HOSTS = ["tiktok.com", "instagram.com"];

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json", ...cors } });

export default {
  async fetch(req, env) {
    const cors = {
      "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
      "access-control-allow-headers": "content-type,x-token",
      "access-control-allow-methods": "POST,OPTIONS",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "method" }, 405, cors);
    if (env.APP_TOKEN && req.headers.get("x-token") !== env.APP_TOKEN) return json({ error: "unauthorized" }, 401, cors);

    let body;
    try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, cors); }
    const url = String(body.url || "");
    let text = String(body.text || "").trim().slice(0, 8000);

    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { return json({ error: "bad_url" }, 400, cors); }
    if (!/^https:\/\//i.test(url) || !ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h)))
      return json({ error: "bad_url" }, 400, cors);

    if (!text) text = await getCaption(url, host);
    if (!text || text.length < 20) return json({ error: "no_text" }, 200, cors);

    try {
      return json({ recipe: await structure(text, env) }, 200, cors);
    } catch (e) {
      return json({ error: "ai_failed", detail: String((e && e.message) || e) }, 200, cors);
    }
  },
};

async function getCaption(url, host) {
  try {
    if (host.endsWith("tiktok.com")) {
      const r = await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(url));
      if (r.ok) return String((await r.json()).title || "").trim();
    } else {
      // Instagram suele bloquear a servidores; si falla, la app pide pegar el texto.
      const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/<meta[^>]+property="og:(?:description|title)"[^>]+content="([^"]+)"/i);
        if (m) return m[1].replace(/&quot;/g, '"').replace(/&#039;|&#x27;/g, "'").replace(/&amp;/g, "&");
      }
    }
  } catch { /* se trata como no_text */ }
  return "";
}

async function structure(text, env) {
  if (!env.GEMINI_API_KEY) throw new Error("falta GEMINI_API_KEY");
  const model = env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt =
    `Del siguiente texto de un vídeo de cocina extrae la receta. Responde SOLO con JSON: ` +
    `{"title": string, "ingredients": [{"text": string, "section": string}], "steps": [string]}. ` +
    `"section" debe ser una de: ${SECTIONS.join(", ")}. Usa el mismo idioma del texto. ` +
    `No inventes ingredientes ni pasos que no estén en el texto; si no hay receta, devuelve listas vacías.\n\nTEXTO:\n${text}`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
  });
  if (!r.ok) throw new Error("Gemini " + r.status);
  const out = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const j = JSON.parse(out);
  const ingredients = (Array.isArray(j.ingredients) ? j.ingredients : [])
    .map((i) => ({ text: String(i.text || "").trim(), section: SECTIONS.includes(i.section) ? i.section : "Otros" }))
    .filter((i) => i.text);
  const steps = (Array.isArray(j.steps) ? j.steps : []).map((s) => String(s).trim()).filter(Boolean);
  if (!ingredients.length && !steps.length) throw new Error("no_recipe");
  return { title: String(j.title || "").trim() || "Receta sin título", ingredients, steps };
}
