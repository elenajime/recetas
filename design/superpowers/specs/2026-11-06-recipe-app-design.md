# Recipe app (ReciMe-like, free, iPhone) — Design

Date: 2026-11-06
Status: draft for review

## Intent and why

Elena wants a personal recipe app similar to ReciMe, built for another person
("she") who uses an iPhone. The main reason is cost: ReciMe limits how many
recipes can be imported on its free plan and charges for unlimited imports.
Elena does not want to pay for that, and wants unlimited imports.

The core use: she sees a recipe in an Instagram or TikTok video, shares it to
the app, and gets a written recipe (ingredients and steps) saved in the app.

## Goals

1. **Unlimited recipe imports from Instagram and TikTok links**, with no
   subscription and no recurring cost.
2. **Each saved recipe keeps the link to the original video** and shows it, so
   she can go back to the source.
3. **Shopping list**: ingredients grouped by supermarket section (pantry,
   produce, dairy, ...) with the source recipe shown per item, a checkbox per
   item, and an "add from a recipe" action. Recipes are shown at the top.
4. **Meal planner, week view** (decided over a month calendar): days listed
   vertically, each day holds recipes tagged Breakfast / Lunch / Dinner /
   Snack, with a "+" per day and a "Today" marker.
5. Adding a planned recipe's ingredients to the shopping list in one tap
   (this is an assumption of the designer, not stated by Elena).
6. Works well on an iPhone, installable on the home screen.

## Non-goals

- Android, desktop, or multi-device sync.
- Accounts, login, social/sharing features, creator features.
- Native App Store app (needs a paid Apple developer account).
- Recipe collections/cookbooks as a headline feature (Elena chose shopping
  list and planner as the two priorities after import). They may be a simple
  tag or folder later; not required.

## Anti-goals (a failure even if it technically works)

- Any recurring or per-use cost to Elena. If a free service disappears or hits
  its limit, the app must degrade gracefully (see Import), not start charging.
- Losing the original video link on a saved recipe.

## Constraints

- **Strictly free.** Elena was explicit that she will not pay anything, not
  even a few euros a month for the AI part.
- **Platform:** iPhone only.
- **Hosting:** Elena's personal GitHub (not the company one). GitHub Pages can
  serve the static app only; it cannot run the import logic.
- **Data storage:** recipes live only on her iPhone (local storage in the web
  app). No server-side database.
- Language of the app UI: Spanish (Elena and the user communicate in Spanish).
  Recipe language follows the source video.

## Decisions made with Elena

- Web app (PWA) added to the home screen, not a native app.
- iOS Shortcut so that "Share" from Instagram/TikTok sends the link to the app.
  (Designer's proposal, accepted implicitly; not individually confirmed.)
- Static front end on GitHub Pages; recipes stored on the phone.
- Week view for the planner.
- Visual style: warm cream background, blue/yellow/orange accents, serif
  headlines with one coloured italic word, white rounded phone-style screens
  with coloured tags for meal types. Inspired by ReciMe's look but with our own
  name, logo, and illustrations (designer's call; Elena has seen the mockup
  but did not comment on originality).

## Designer's proposals (Elena has not decided these)

- **Import service:** a small serverless function on a free tier (Cloudflare
  Workers or Vercel) that receives the video link, gets the caption/text, and
  turns it into a structured recipe with a free-tier AI model.
- **Fallback when a video has no readable recipe text** (recipe only spoken or
  shown on screen): try audio transcription on a free tier; if that is not
  possible within free limits, show the caption as-is and let her edit the
  recipe by hand.
- **Backup:** an "export my recipes" button, because local-only storage loses
  everything if the phone is lost or reset. Can be done after the first
  version.
- **Shopping list grouping:** use AI at import time to assign each ingredient
  to a supermarket section.

## Known risks (to be handled by the builder)

- Reading content from Instagram and TikTok links without paying is fragile.
  TikTok exposes a caption through a public embed endpoint; Instagram is
  harder and may block automated access. The builder must test what actually
  works for a few real links before committing to an approach.
- Free AI tiers have daily limits and can change. The app must show a clear
  message when the limit is reached and still let her save the link and add
  the recipe by hand.
- iOS PWAs and local storage can be cleared by iOS if the app is unused for a
  long time. Backup/export mitigates this.

## Left to the builder

- Choice of framework, libraries, and which specific free AI/transcription
  service to use, as long as the cost stays at zero.
- Exact screen design beyond the approved mockups (shopping list and week
  planner), recipe detail screen, and the import flow screens.
- Data model for recipes, ingredients, planned meals, and shopping items.
- Exact supermarket-section categories.

## Approved mockups

Shopping list and week planner mockups were shown and the week view was
chosen. Screenshots: `recime-clone/mockup-preview-v2.png`.
