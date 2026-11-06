# Recetas

Web app para iPhone: guarda recetas de vídeos de TikTok/Instagram, lista de la compra y plan semanal.
Todo gratis. Las recetas se guardan solo en el móvil, con el enlace al vídeo original.

```
app/      la app (HTML/JS, sin compilar) → GitHub Pages
worker/   servidor de importación → Cloudflare Workers (plan gratis)
docs/     documento de diseño
```

## 1. Publicar la app (GitHub Pages)

1. Crea un repositorio en tu GitHub personal y sube este proyecto.
2. Settings → Pages → Source: *GitHub Actions* o rama `main` con carpeta `/app` (si la opción de carpeta no sale, mueve el contenido de `app/` a `/docs` y elige `/docs`).
3. La app quedará en `https://TU_USUARIO.github.io/TU_REPO/`.

## 2. Servidor de importación (Cloudflare Workers, gratis)

1. Clave de IA gratuita: https://aistudio.google.com/apikey (Gemini).
2. En https://dash.cloudflare.com → Workers & Pages → Create → Hello World → pega el contenido de `worker/worker.js` → Deploy.
3. Settings → Variables and Secrets:
   - `GEMINI_API_KEY` (secreto) = tu clave.
   - `ALLOWED_ORIGIN` = `https://TU_USUARIO.github.io` (recomendado).
   - `APP_TOKEN` = una palabra al azar (opcional).
   - `GEMINI_MODEL` solo si el modelo por defecto (`gemini-2.0-flash`) ya no existe; pon otro modelo gratuito.
4. Copia la URL del Worker en `app/config.js` (`workerUrl`, y `token` si usaste `APP_TOKEN`) y vuelve a subir.

## 3. Instalar en el iPhone

Safari → abre la URL de la app → Compartir → *Añadir a pantalla de inicio*.

## 4. Atajo para compartir desde TikTok/Instagram

App Atajos → nuevo atajo:
1. **Recibir** *URLs* de la hoja Compartir (activar "Mostrar en hoja compartir").
2. **Abrir URL** con: `https://TU_USUARIO.github.io/TU_REPO/?url=` seguido de la variable *Entrada del atajo* (usa la acción "Codificar URL" antes si el enlace lleva símbolos).

Compartir un vídeo → *Recetas* abre la app y empieza a importar.
Si el atajo abre Safari en vez de la app instalada, usa la app manualmente: pega el enlace en *+*.

## Qué esperar (límites conocidos)

- **TikTok**: lee el pie del vídeo automáticamente. **Instagram** suele bloquear a servidores: si pasa, la app pide pegar el texto del post y lo ordena igual.
- Si el vídeo no trae la receta escrita (solo hablada), no se transcribe el audio: se edita a mano.
- La IA gratuita tiene límite diario; si se agota, la app avisa y se puede crear la receta a mano.
- Las recetas viven en el iPhone. Usa *Copia de seguridad* (en Recetas) de vez en cuando.
- Pendiente (no incluido): sumar cantidades repetidas en la lista de la compra; nombre/logo definitivos.
- Sin probar con enlaces reales de TikTok/Instagram ni con una clave real de Gemini (el Worker se probó con respuestas simuladas). Haz una primera prueba con 2 o 3 enlaces reales.

## Probar en local

```
cd app && python3 -m http.server 8765
```
Abre http://127.0.0.1:8765/
