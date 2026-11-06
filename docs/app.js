"use strict";
// ---------- Datos (solo en el iPhone, localStorage) ----------
const KEY = "recetas.v1";
const SECTIONS = ["Despensa", "Fruta y verdura", "Lácteos", "Carne y pescado", "Panadería", "Otros"];
const MEALS = [["b", "Desayuno"], ["l", "Comida"], ["d", "Cena"], ["s", "Snack"]];
const cfg = window.APP_CONFIG || {};

const emptyDb = () => ({ recipes: [], plan: {}, shopping: [] });
function load() {
  try { return Object.assign(emptyDb(), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { return emptyDb(); }
}
let db = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const byId = (id) => db.recipes.find((r) => r.id === id);

const GUESS = [
  [/leche|nata|queso|yogur|mantequilla|crema|huevo/i, "Lácteos"],
  [/pollo|ternera|cerdo|carne|jam[oó]n|bacon|panceta|pescado|salm[oó]n|at[uú]n|gamba|merluza|bacalao|chorizo/i, "Carne y pescado"],
  [/tomate|cebolla|ajo|zanahoria|patata|lechuga|pimiento|calabac|berenjena|espinaca|aguacate|lim[oó]n|manzana|pl[aá]tano|fruta|verdura|perejil|cilantro|albahaca|champi|seta|pepino|boniato|calabaza/i, "Fruta y verdura"],
  [/pan\b|pan de|baguette|tortilla de trigo|masa|hojaldre|bollo/i, "Panadería"],
  [/harina|az[uú]car|sal\b|pimienta|aceite|vinagre|arroz|pasta|espagueti|macarr|legumbre|garbanzo|lenteja|alubia|lata|salsa|especia|comino|piment[oó]n|caldo|miel|chocolate|levadura|avena/i, "Despensa"],
];
const guessSection = (t) => (GUESS.find(([re]) => re.test(t)) || [0, "Otros"])[1];

// ---------- Estado de pantalla ----------
let view = { name: "recipes" };
const $app = document.getElementById("app");
function go(name, extra = {}) { view = Object.assign({ name }, extra); render(); window.scrollTo(0, 0); }

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- Fechas ----------
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function weekStart(offset) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}
const dayLabel = (d) => d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric" }).replace(/^./, (c) => c.toUpperCase());

// ---------- Vistas ----------
function head(title, back) {
  return `<div class="head">${back ? `<button class="icon-btn" data-act="back" aria-label="Volver">‹</button>` : ""}<h1>${title}</h1></div>`;
}
function tabs() {
  const t = (n, i, l) => `<button class="tab ${view.name === n ? "on" : ""}" data-go="${n}"><span>${i}</span>${l}</button>`;
  return `<nav class="tabs"><div class="tabs-in">${t("recipes", "📖", "Recetas")}${t("plan", "📅", "Plan")}${t("shop", "🛒", "Compra")}</div></nav>`;
}

function recipeCards(q) {
  const list = db.recipes.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()));
  if (!db.recipes.length) return `<div class="empty">Aún no hay recetas.<br>Pulsa + para importar la primera.</div>`;
  if (!list.length) return `<div class="empty">Nada con ese nombre.</div>`;
  return list.map((r) => `<div class="card" data-act="open" data-id="${r.id}">
      <div class="thumb">🍽️</div>
      <div><div class="t">${esc(r.title)}</div><div class="s">${r.ingredients.length} ingredientes${r.url ? " · con vídeo" : ""}</div></div></div>`).join("");
}
function recipesView() {
  return `${head("Mis <em>recetas</em>")}
    <input class="search" id="q" type="search" placeholder="Buscar receta" value="${esc(view.q || "")}">
    <div id="list">${recipeCards(view.q)}</div>
    <div class="pad"><button class="ghost" data-act="backup">Copia de seguridad</button></div>
    <button class="fab" data-go="import" aria-label="Importar receta">+</button>`;
}

function recipeView() {
  const r = byId(view.id);
  if (!r) return `${head("Receta", true)}<div class="empty">No se encontró la receta.</div>`;
  const link = safeUrl(r.url);
  return `<div class="detail">${head("", true)}
    <h2>${esc(r.title)}</h2>
    ${link ? `<a class="link" href="${esc(link)}" target="_blank" rel="noopener">▶ Ver el vídeo original</a>` : ""}
    <h3>Ingredientes</h3><ul>${r.ingredients.map((i) => `<li>${esc(i.text)}</li>`).join("") || "<li>Sin ingredientes</li>"}</ul>
    <h3>Pasos</h3><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("") || "<li>Sin pasos</li>"}</ol>
    <div class="actions">
      <button data-act="to-shop" data-id="${r.id}">🛒 A la compra</button>
      <button data-act="plan-pick" data-id="${r.id}">📅 Planificar</button>
      <button data-act="edit" data-id="${r.id}">✏️ Editar</button>
      <button class="danger" data-act="del-recipe" data-id="${r.id}">🗑 Eliminar</button>
    </div></div>`;
}

function planView() {
  const start = weekStart(view.week || 0);
  const today = dkey(new Date());
  let days = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = dkey(d);
    const entries = (db.plan[k] || []).map((e) => ({ e, r: byId(e.recipeId) })).filter((x) => x.r);
    const meals = entries.map(({ e, r }) => {
      const m = MEALS.find((x) => x[0] === e.meal) || MEALS[1];
      return `<div class="meal" data-act="open" data-id="${r.id}">
        <span class="n">${esc(r.title)}</span><span class="tag ${m[0]}">${m[1]}</span>
        <button class="x" data-act="plan-del" data-day="${k}" data-pid="${e.id}" aria-label="Quitar">✕</button></div>`;
    }).join("");
    days += `<div class="day"><div class="day-h ${k === today ? "today" : ""}"><span>${k === today ? "Hoy · " : ""}${dayLabel(d)}</span>
      <button data-act="plan-add" data-day="${k}" aria-label="Añadir">+</button></div>${meals || `<div class="none">Nada planificado</div>`}</div>`;
  }
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${head("Plan de <em>comidas</em>")}
    <div class="week-nav"><button class="icon-btn" data-act="week" data-d="-1">‹</button><span>${fmt(start)} – ${fmt(end)}</span><button class="icon-btn" data-act="week" data-d="1">›</button></div>
    ${days}`;
}

function shopView() {
  let html = head("Lista de la <em>compra</em>") +
    `<form class="row" id="add-item"><input id="new-item" placeholder="Añadir producto" autocomplete="off"><button type="submit">Añadir</button></form>`;
  if (!db.shopping.length) html += `<div class="empty">La lista está vacía.<br>Añade ingredientes desde una receta.</div>`;
  for (const s of SECTIONS) {
    const items = db.shopping.filter((i) => i.section === s);
    if (!items.length) continue;
    html += `<div class="sec">${s}</div>` + items.map((i) => {
      const r = i.recipeId && byId(i.recipeId);
      return `<div class="item ${i.done ? "done" : ""}"><button class="cb ${i.done ? "on" : ""}" data-act="toggle" data-id="${i.id}" aria-label="Marcar">${i.done ? "✓" : ""}</button>
        <div class="tx"><div>${esc(i.text)}</div>${r ? `<div class="src">${esc(r.title)}</div>` : ""}</div>
        <button class="x" data-act="del-item" data-id="${i.id}" aria-label="Borrar">✕</button></div>`;
    }).join("");
  }
  if (db.shopping.some((i) => i.done)) html += `<div class="pad"><button class="ghost" data-act="clear-done">Quitar los marcados</button></div>`;
  return html;
}

function importView() {
  const d = view.draft;
  if (!d) {
    return `${head("Importar", true)}<div class="pad">
      <label for="i-url">Enlace del vídeo (TikTok o Instagram)</label>
      <input id="i-url" type="url" inputmode="url" placeholder="https://www.tiktok.com/…" value="${esc(view.url || "")}">
      <label for="i-text">Texto del post (opcional)</label>
      <textarea id="i-text" rows="5" placeholder="Si el enlace no se puede leer, copia aquí el texto del post">${esc(view.text || "")}</textarea>
      <p class="msg ${view.err ? "err" : ""}" id="i-msg">${esc(view.msg || "")}</p>
      <button class="cta" data-act="import-go">Importar</button>
      <button class="ghost" data-act="manual">Crear a mano</button></div>`;
  }
  return `${head(d.editId ? "Editar receta" : "Revisar receta", true)}<div class="pad">
    <label for="e-title">Título</label><input id="e-title" value="${esc(d.title)}">
    <label for="e-url">Enlace del vídeo</label><input id="e-url" type="url" value="${esc(d.url)}">
    <label for="e-ing">Ingredientes (uno por línea)</label>
    <textarea id="e-ing" rows="8">${esc(d.ingredients.map((i) => i.text).join("\n"))}</textarea>
    <label for="e-steps">Pasos (uno por línea)</label>
    <textarea id="e-steps" rows="8">${esc(d.steps.join("\n"))}</textarea>
    <button class="cta" data-act="save-draft">Guardar receta</button></div>`;
}

function render() {
  const n = view.name;
  const body = { recipes: recipesView, plan: planView, shop: shopView, recipe: recipeView, import: importView }[n]();
  $app.innerHTML = body + (["recipes", "plan", "shop"].includes(n) ? tabs() : "");
}

// ---------- Hojas modales ----------
function sheet(html, onMount) {
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = `<div class="sheet">${html}</div>`;
  o.addEventListener("click", (e) => { if (e.target === o) o.remove(); });
  document.body.appendChild(o);
  onMount && onMount(o);
  return o;
}
function mealOptions() { return MEALS.map(([k, n]) => `<option value="${k}">${n}</option>`).join(""); }

function planSheet({ day, recipeId }) {
  if (!db.recipes.length) return toast("Primero importa una receta");
  const dayOpts = (() => {
    const s = weekStart(view.week || 0); let o = "";
    for (let i = 0; i < 7; i++) { const d = new Date(s); d.setDate(s.getDate() + i); o += `<option value="${dkey(d)}" ${dkey(d) === day ? "selected" : ""}>${dayLabel(d)}</option>`; }
    return o;
  })();
  const recOpts = db.recipes.map((r) => `<option value="${r.id}" ${r.id === recipeId ? "selected" : ""}>${esc(r.title)}</option>`).join("");
  sheet(`<h2>Planificar</h2>
    ${recipeId ? "" : `<label>Receta</label><select id="p-rec">${recOpts}</select>`}
    <label>Día</label><select id="p-day">${dayOpts}</select>
    <label>Comida</label><select id="p-meal">${mealOptions()}</select>
    <button class="cta" id="p-ok">Añadir al plan</button>`, (o) => {
    o.querySelector("#p-ok").onclick = () => {
      const rid = recipeId || o.querySelector("#p-rec").value;
      const k = o.querySelector("#p-day").value;
      (db.plan[k] = db.plan[k] || []).push({ id: uid(), recipeId: rid, meal: o.querySelector("#p-meal").value });
      save(); o.remove(); toast("Añadido al plan"); render();
    };
  });
}

// ---------- Acciones ----------
function addToShopping(r) {
  r.ingredients.forEach((i) => db.shopping.push({ id: uid(), text: i.text, section: SECTIONS.includes(i.section) ? i.section : guessSection(i.text), recipeId: r.id, done: false }));
  save(); toast(`${r.ingredients.length} ingredientes añadidos`);
}

async function runImport() {
  const url = document.getElementById("i-url").value.trim();
  const text = document.getElementById("i-text").value.trim();
  const msg = document.getElementById("i-msg");
  view.url = url; view.text = text;
  if (!safeUrl(url)) { view.msg = "Pon un enlace que empiece por http(s)://"; view.err = true; return render(); }
  if (!cfg.workerUrl) { view.msg = "Falta configurar el servidor de importación (ver README). Puedes crear la receta a mano."; view.err = true; return render(); }
  msg.className = "msg"; msg.textContent = "Importando… puede tardar unos segundos.";
  try {
    const res = await fetch(cfg.workerUrl, { method: "POST", headers: { "content-type": "application/json", ...(cfg.token ? { "x-token": cfg.token } : {}) }, body: JSON.stringify({ url, text }) });
    const j = await res.json();
    if (j.recipe) {
      view = { name: "import", draft: { title: j.recipe.title || "", url, ingredients: j.recipe.ingredients || [], steps: j.recipe.steps || [] } };
      return render();
    }
    view.err = true;
    view.msg = j.error === "no_text" ? "No he podido leer el texto de ese vídeo. Copia el texto del post, pégalo abajo e inténtalo de nuevo."
      : j.error === "ai_failed" ? "La IA gratuita no está disponible ahora (quizá límite diario). Pega el texto y prueba más tarde, o crea la receta a mano."
      : "No se pudo importar (" + (j.error || res.status) + ").";
  } catch {
    view.err = true; view.msg = "Sin conexión con el servidor de importación.";
  }
  render();
}

function saveDraft() {
  const d = view.draft;
  const title = document.getElementById("e-title").value.trim();
  if (!title) return toast("Pon un título");
  const old = new Map(d.ingredients.map((i) => [i.text, i.section]));
  const ingredients = document.getElementById("e-ing").value.split("\n").map((s) => s.trim()).filter(Boolean)
    .map((text) => ({ text, section: old.get(text) || guessSection(text) }));
  const steps = document.getElementById("e-steps").value.split("\n").map((s) => s.trim()).filter(Boolean);
  const url = document.getElementById("e-url").value.trim();
  let id = d.editId;
  if (id) Object.assign(byId(id), { title, url, ingredients, steps });
  else { id = uid(); db.recipes.unshift({ id, title, url, ingredients, steps, createdAt: Date.now() }); }
  save(); toast("Receta guardada"); go("recipe", { id });
}

function backup() {
  sheet(`<h2>Copia de seguridad</h2>
    <p class="sub" style="margin:0 0 12px">Guarda tus recetas en un archivo por si pierdes o restableces el móvil.</p>
    <button class="cta" id="b-exp">Exportar recetas</button>
    <label class="ghost" style="display:block;text-align:center;margin-top:10px">Importar copia<input id="b-imp" type="file" accept="application/json" hidden></label>`, (o) => {
    o.querySelector("#b-exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
      a.download = `recetas-${dkey(new Date())}.json`; a.click(); o.remove();
    };
    o.querySelector("#b-imp").onchange = async (e) => {
      try {
        const j = JSON.parse(await e.target.files[0].text());
        if (!Array.isArray(j.recipes)) throw 0;
        if (!confirm("Esto sustituirá lo que hay ahora. ¿Continuar?")) return;
        db = Object.assign(emptyDb(), j); save(); o.remove(); toast("Copia restaurada"); go("recipes");
      } catch { toast("Archivo no válido"); }
    };
  });
}

// ---------- Eventos ----------
document.addEventListener("click", (ev) => {
  const g = ev.target.closest("[data-go]");
  if (g) return go(g.dataset.go);
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const { act, id, day, pid, d } = el.dataset;
  ev.stopPropagation();
  switch (act) {
    case "back": return view.draft && view.draft.editId ? go("recipe", { id: view.draft.editId }) : view.name === "recipe" ? go("recipes") : go("recipes");
    case "open": return go("recipe", { id });
    case "to-shop": return addToShopping(byId(id));
    case "plan-pick": return planSheet({ day: dkey(new Date()), recipeId: id });
    case "plan-add": return planSheet({ day });
    case "plan-del": db.plan[day] = (db.plan[day] || []).filter((e) => e.id !== pid); save(); return render();
    case "week": view.week = (view.week || 0) + Number(d); return render();
    case "edit": { const r = byId(id); return go("import", { draft: { editId: id, title: r.title, url: r.url, ingredients: r.ingredients.map((i) => ({ ...i })), steps: [...r.steps] } }); }
    case "del-recipe":
      if (!confirm("¿Eliminar esta receta?")) return;
      db.recipes = db.recipes.filter((r) => r.id !== id);
      Object.keys(db.plan).forEach((k) => (db.plan[k] = db.plan[k].filter((e) => e.recipeId !== id)));
      db.shopping.forEach((i) => { if (i.recipeId === id) i.recipeId = null; });
      save(); return go("recipes");
    case "toggle": { const i = db.shopping.find((x) => x.id === id); i.done = !i.done; save(); return render(); }
    case "del-item": db.shopping = db.shopping.filter((i) => i.id !== id); save(); return render();
    case "clear-done": db.shopping = db.shopping.filter((i) => !i.done); save(); return render();
    case "import-go": return runImport();
    case "manual": return go("import", { draft: { title: "", url: view.url || "", ingredients: [], steps: [] } });
    case "save-draft": return saveDraft();
    case "backup": return backup();
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "q") { view.q = e.target.value; document.getElementById("list").innerHTML = recipeCards(view.q); }
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "add-item") return;
  e.preventDefault();
  const t = document.getElementById("new-item").value.trim();
  if (!t) return;
  db.shopping.push({ id: uid(), text: t, section: guessSection(t), recipeId: null, done: false });
  save(); render(); document.getElementById("new-item").focus();
});

// ---------- Arranque ----------
(function start() {
  navigator.storage && navigator.storage.persist && navigator.storage.persist();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  // Enlace compartido desde el atajo de iOS: ?url=<enlace>&text=<texto opcional>
  const p = new URLSearchParams(location.search);
  const shared = p.get("url") || (p.get("text") || "").match(/https?:\/\/\S+/)?.[0];
  if (shared) {
    history.replaceState(null, "", location.pathname);
    view = { name: "import", url: shared, text: "" };
    render();
    if (cfg.workerUrl) runImport();
  } else render();
})();
