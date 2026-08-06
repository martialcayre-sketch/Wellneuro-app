---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
source: anthropics/skills@b29e7cf65e5cb78a5ac33d582270551bc74a14eb, audit /wn-tiers du 2026-08-06 — scripts/with_server.py réécrit (readiness, nettoyage, doctrine de port) diverge fortement de l'amont, ne pas resynchroniser sans relire (voir changelog)
---

# Web Application Testing

To test local web applications, write native Python Playwright scripts.

**Helper Scripts Available**:
- `scripts/with_server.py` - Manages server lifecycle (supports multiple servers)

**Adaptation WellNeuro — cette consigne remplace la consigne amont « ne pas lire la source »** : sur cette machine, **lire intégralement tout script de `scripts/` avant sa première exécution** — le dépôt porte `secrets/` et `web/.env.local`, aucun script tiers ne se lance en boîte noire. Après cette première lecture, lancer avec `--help` pour l'usage et réutiliser le script sans recharger sa source dans le contexte.

**Adaptation WellNeuro — serveurs et worktrees** : ne jamais piloter un serveur qu'on n'a pas lancé soi-même depuis **ce** worktree. Plusieurs sessions travaillent en parallèle et `npm run dev` (Next.js) prend `:3000` par défaut : un serveur « déjà lancé » est probablement celui d'une autre branche. Lancer le serveur sur un port libre **distinct** du port E2E de ce worktree — `web/playwright.config.ts` réserve déjà `3100 + index` (`worktreePort()`, dérivé de `git worktree list`) pour ses propres runs Playwright ; réutiliser ce port collisionnerait avec un run E2E en cours sur ce même worktree (et `reuseExistingServer` en mode dev ferait tourner cet E2E contre le serveur laissé par ce skill, sans ses drapeaux). Choisir un autre port libre — par exemple en laissant l'OS en attribuer un (`python3 -c "import socket;s=socket.socket();s.bind(('',0));print(s.getsockname()[1])"`) — et le passer à la fois à la commande serveur (`npm run dev -- -p <port>`) et à `--port`. `with_server.py` refuse un port déjà occupé avant lancement, et échoue aussi si le processus serveur meurt pendant l'attente de disponibilité.

## Decision Tree: Choosing Your Approach

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file directly to identify selectors
    │         ├─ Success → Write Playwright script using selectors
    │         └─ Fails/Incomplete → Treat as dynamic (below)
    │
    └─ No (dynamic webapp) → Is the server already running?
        ├─ No → Run: python scripts/with_server.py --help
        │        Then use the helper + write simplified Playwright script
        │
        └─ Yes, started from THIS worktree (else start your own, free port) → Reconnaissance-then-action:
            1. Navigate and wait for networkidle
            2. Take screenshot or inspect DOM
            3. Identify selectors from rendered state
            4. Execute actions with discovered selectors
```

## Example: Using with_server.py

To start a server, run `--help` first, then use the helper:

**Single server:**
```bash
python scripts/with_server.py --server "npm run dev -- -p 5173" --port 5173 -- python your_automation.py
```

**Multiple servers (e.g., backend + frontend):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py --port 3000" --port 3000 \
  --server "cd frontend && npm run dev -- -p 5173" --port 5173 \
  -- python your_automation.py
```

**Le port passé à `--server` et à `--port` doit être le même** : c'est ce que
sonde `with_server.py`, pas le port par défaut du framework.

To create an automation script, include only Playwright logic (servers are managed automatically):
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True) # Always launch chromium in headless mode
    page = browser.new_page()
    page.goto('http://localhost:5173') # Même port que --port ci-dessus
    page.wait_for_load_state('networkidle') # CRITICAL: Wait for JS to execute
    # ... your automation logic
    browser.close()
```

## Reconnaissance-Then-Action Pattern

1. **Inspect rendered DOM**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identify selectors** from inspection results

3. **Execute actions** using discovered selectors

## Common Pitfall

❌ **Don't** inspect the DOM before waiting for `networkidle` on dynamic apps
✅ **Do** wait for `page.wait_for_load_state('networkidle')` before inspection

## Best Practices

- **Scripts de `scripts/` : lus intégralement une fois, puis réutilisés** (adaptation WellNeuro — jamais en boîte noire, voir plus haut). Ils couvrent des workflows complexes de façon fiable ; après la première lecture, `--help` pour l'usage, puis invocation directe.
- Use `sync_playwright()` for synchronous scripts
- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Add appropriate waits: `page.wait_for_selector()` or `page.wait_for_timeout()`

## Reference Files

- **examples/** - Examples showing common patterns:
  - `element_discovery.py` - Discovering buttons, links, and inputs on a page
  - `static_html_automation.py` - Using file:// URLs for local HTML
  - `console_logging.py` - Capturing console logs during automation