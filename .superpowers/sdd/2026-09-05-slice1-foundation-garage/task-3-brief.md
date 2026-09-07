### Task 3: Reference screenshots of the design

**Files:**
- Create: `scripts/serve-design.mjs`
- Produces: `docs/reference/{garage-idle,garage-card2,stats-taycan,stats-model-s,sheet-add-empty,sheet-add-sample,vin-help,sheet-recall,garage-added-toast,tab-recalls,tab-profile}.png`

**Interfaces:**
- Produces: the reference PNGs every visual verification step compares against, 430 × 932 logical px. Captured with the **Playwright MCP server attached to this session** (`mcp__plugin_playwright_playwright__browser_*`) — no npm Playwright, no Chromium download. The user declined the Playwright download; if the MCP cannot launch a browser either, fall back to the Claude-in-Chrome extension (`mcp__claude-in-chrome__*`) for *live* comparison in Task 22 — its screenshots land in the conversation, not on disk — and write `reference: live (Chrome extension)` in `verification.md`.

- [ ] **Step 1: Write `scripts/serve-design.mjs`** — a dependency-free static server so the design loads over `http://` (browser access to `file://` is inconsistent)

```js
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('design_handoff_recall_hub/design');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(ROOT, path === '/' || path === '\\' ? 'GaragePrototype.dc.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`design served at http://localhost:${PORT}/GaragePrototype.dc.html`));
```

Add to `package.json` scripts: `"serve-design": "node scripts/serve-design.mjs"`.

- [ ] **Step 2: Start it in the background**

Run (Bash, `run_in_background`): `npm run serve-design`
Expected: `design served at http://localhost:4173/GaragePrototype.dc.html`. The page needs internet for its CDN fonts, Remixicon and React.

- [ ] **Step 3: Load the browser tools** (one call)

ToolSearch: `select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_find,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_wait_for,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_close`

- [ ] **Step 4: Open the design at the frame size**

`browser_navigate` → `http://localhost:4173/GaragePrototype.dc.html`; `browser_resize` → width 430, height 932; `browser_evaluate` → `document.body.style.margin='0'; document.body.style.background='#fff'; document.fonts.ready.then(()=>'fonts ok')`. If launching fails with a "browser not installed" error, this is the fallback trigger described in Interfaces — stop and use the Chrome extension path.

- [ ] **Step 5: Capture the states** — for each row: reach the state, `browser_wait_for` the listed time, then `browser_take_screenshot` with `filename` = `docs/reference/<name>.png` (viewport only, no `fullPage`). To click, `browser_snapshot` (or `browser_find` with the text) and click the matching `ref`.

| # | Get there | wait | name |
|---|---|---|---|
| 1 | After navigate, wait 8 s (splash timeline 7.1 s), click the **Google** pill | 0.7 s | `garage-idle` |
| 2 | Click the **Taycan 4S** card | 0.7 s | `garage-card2` |
| 3 | Click **Taycan 4S** again | 1.8 s | `stats-taycan` |
| 4 | Click the back arrow (`ri-arrow-left-line`), click **Model S Plaid** twice (second after 0.7 s) | 1.8 s | `stats-model-s` |
| 5 | Back arrow; click **Add Vehicle** | 0.5 s | `sheet-add-empty` |
| 6 | Click **Use sample VIN** | 0.4 s | `sheet-add-sample` |
| 7 | Click the info button (aria-label *Where do I find my VIN?*) | 0.6 s | `vin-help` |
| 8 | Click **Close** (top-left), click **Add to garage** | 0.6 s | `garage-added-toast` |
| 9 | Wait 2.2 s; click **Rear camera image failure** | 0.5 s | `sheet-recall` |
| 10 | Click the scrim (top of the page, e.g. `browser_evaluate` → `document.querySelector('[style*="rgba(23,22,26,0.28)"]').click()`); click tab **RECALLS** (aria-label) | 0.8 s | `tab-recalls` |
| 11 | Click tab **PROFILE** | 0.8 s | `tab-profile` |

- [ ] **Step 6: Check the PNGs with the Read tool**

Expected: `garage-idle` shows the header, "3 VEHICLES · 1 RECALL", the Model S card with a pink/red glow; `stats-model-s` shows the gauge at 65 "Fair"; `sheet-add-sample` shows the "F-150 Lightning" preview; `sheet-recall` shows four rows and the blue "Schedule Repair". A wrong state means a click landed elsewhere — redo that row; do not keep a wrong reference.

- [ ] **Step 7: Close the browser and stop the server** — `browser_close`; kill the background `serve-design` task.

- [ ] **Step 8: Checkpoint** — "chore: reference screenshots of the design's garage states"

---

