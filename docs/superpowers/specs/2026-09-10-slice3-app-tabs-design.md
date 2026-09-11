# Slice 3 — The rest of the app: Recalls, Service, Hub, Profile and their overlays

**Date:** 2026-09-10
**Status:** approved by construction — the user asked to "get the rest of the app functional for the demo"; open questions are parked in §15 rather than asked (standing instruction). Built and emulator-verified 2026-09-10 (see `docs/reference/verification.md`, Slice 3 section).
**Source of truth:** `design_handoff_recall_hub/design/GaragePrototype.dc.html` (line numbers below refer to it; template lines 127–1005, logic lines 1006–2379). Where this spec and the source disagree, the source wins. Reference captures: `docs/reference/app-*.png` (430×932 @2x) and `docs/reference/app-geometry.json`, produced by `scripts/app-refs.mjs` (installed Chrome over CDP, no downloads).

## 1. Purpose

Port everything in the app artboard that Slice 1 (Foundation + Garage) and Slice 2 (Splash/Auth) left as the design's own `NOT IN THIS PROTOTYPE YET` stub, so the whole demo flow runs in Expo Go on the S24 Ultra: the **Recalls** tab with its recall detail screen, the **Service** tab with the tilt map, reason sheet and confirmation state, the **Hub** tab with the auto-advancing article rail, the 20 dashboard lights, the light sheet and the swipeable article reader, and the **Profile** tab with its toggles, the membership screen and the concierge chat. After this slice the stub component is deleted.

Fidelity is the primary requirement, exactly as in Slices 1–2: values are the design's, in dp, unscaled; copy is verbatim; where a platform cannot match, match intent and flag it (§9).

## 2. Scope

**In:**
- Recalls tab (`isRecalls`, lines 182–273) and the recall detail screen (`isDetail`, lines 127–180) as a stack route inside the recalls tab.
- Service tab (`isService`, lines 363–535): booking form with the tilt map, the recall-reason sheet (lines 973–1001), the confirmation state.
- Hub tab (`isHub`, lines 635–710): infinite auto-advancing article rail, dots, light-group filter, 20-tile light grid, the light sheet (lines 897–922), the article reader with swipe/prev/next (lines 924–971).
- Profile tab (`isProfile`, lines 537–633), the membership screen (lines 749–799), the concierge chat (lines 801–846).
- Store fields and actions mirroring the design's state; fixtures lifted verbatim (`ARTICLES`, `LIGHTS`, `CHAT_SCRIPT`, `USER`, `ACTIVITY`, `SVC_DATES`, `SVC_TIMES`, `SVC_CENTER`, `HISTORY`, `REASONS`, `PLANS`).
- New primitives: `ShineBorder`, `Toggle`, `StatusChip`, `SheetShell` (headerless sheet), `InfiniteRail` (the garage rail's snapping/wrapping logic, generalised), `TiltMap`.
- Cross-links: stats "Details" → recalls tab with the item expanded (line 1401); reason sheet "Full recall" → recall detail; service "Return to Garage"; profile garage rows → stats; profile "+ ADD VEHICLE" → add sheet; tab switching clears every overlay (line 2366).
- Hardware back for every new overlay (addition, as in Slices 1–2).
- Design reference captures (`app-*.png`), emulator verification, unit + component tests.

**Out:** the on-device pass (Slice 1 Task 23 / Slice 2 Task 12 — blocked on the phone); iOS; a real map, real sensors calibration, real chat backend (the design has none either); hover states.

## 3. Target platform and sizing

Unchanged from Slice 1 §3: S24 Ultra, ~412 dp, Android 14+, 120 Hz; the emulator proxy is `s24ultraProxy` (411 dp). All values are used as-is; layouts that depend on the 430 width are re-expressed with `useWindowDimensions()`:
- Rails (hub articles, garage vehicles): `paddingHorizontal = (width − 318) / 2` (`railPadding`, exists).
- Light grid: 4 columns, `tile = (width − 40 − 3·8) / 4`, `aspectRatio: 1`.
- Everything else is fixed gutters (20) + flex.
- Safe areas: tab content gets `paddingTop = insets.top + <design top padding>`; full-screen overlays add `insets.top` above their header and `insets.bottom` below their footer; sheets add `insets.bottom` inside the panel (existing `Sheet` behaviour). The tab bar already paints the bottom inset white.

## 4. Architecture

```
app/(tabs)/
  recalls/_layout.tsx        Stack, headerShown false, animation 'none'      (was recalls.tsx)
  recalls/index.tsx          RecallsScreen
  recalls/[id].tsx           RecallDetailScreen (id = recall id, 'v1' | 'h1'…)
  service.tsx                ServiceScreen
  hub.tsx                    HubScreen
  profile.tsx                ProfileScreen
src/
  fixtures/articles.ts lights.ts chat.ts profile.ts service.ts recalls.ts   (+ types.ts additions)
  lib/recalls.ts             allRecalls, stateMeta, recallCounts, heroVals, filterVals, detailFor
  lib/service.ts             dateLabel, refLine, trackerSteps, tiltFor
  lib/hub.ts                 GROUP_META, BADGE, hubHeadline, hubCounter, visibleLights, neighbour
  lib/chat.ts                revealPlan (timings), CANNED_REPLY
  lib/membership.ts          planLabel, planLine
  store/useAppStore.ts       (+ fields/actions in §5)
  ui/ShineBorder.tsx Toggle.tsx StatusChip.tsx InfiniteRail.tsx TiltMap.tsx
  ui/Sheet.tsx               (+ SheetShell export; Sheet composes it)
  screens/recalls/RecallsScreen.tsx RecallCard.tsx RecallDetailScreen.tsx
  screens/service/ServiceScreen.tsx ServiceDone.tsx ReasonSheet.tsx
  screens/hub/HubScreen.tsx ArticleCard.tsx LightSheet.tsx ArticleReader.tsx ArticlePanel.tsx
  screens/profile/ProfileScreen.tsx MembershipScreen.tsx PlanCard.tsx ChatScreen.tsx
  screens/garage/Rail.tsx    thin wrapper over InfiniteRail (behaviour unchanged)
  overlays/OverlayHost.tsx   + LightSheet, ReasonSheet, MembershipScreen, ChatScreen, ArticleReader; back order
  screens/TabStub.tsx        deleted (+ its test)
scripts/app-refs.mjs         design references (done); scripts/bake-assets.mjs (+ shine ramps)
src/assets/images/shine-plus.png shine-caution.png
```

**Navigation.** Same model as Slice 1. Tabs are expo-router `<Tabs>`; the recall detail is a stack route inside the recalls tab with `animation: 'none'` so it swaps in place like the source (`isRecalls` → `isDetail`, the tab bar stays). Tapping a tab item runs the store's `switchTab` (clears `sheet`, `screen`, `hubLight`, `article` — line 2366) and navigates; for the garage **and recalls** tabs it navigates to `{ screen: 'index' }` so their stacks pop to the root. Entering the detail from another tab is `router.navigate({ pathname: '/(tabs)/recalls/[id]', params: { id } })` after `switchTab('recalls')`.

**Overlay host.** All new overlays render in `OverlayHost` as absolute siblings, never RN `<Modal>`, in the source's z-order: add/recall sheet (z20) → light sheet, reason sheet (z24) → membership (z25) → chat (z26) → VIN help (z27) → article (z28) → toast (z30) → splash (z60). The light sheet is driven by `hubLight`, the reason sheet by `sheet === 'reason'`, the three screens by `screen`. Hardware back closes, in order: `screen` (article / VIN help / chat / membership) → `hubLight` → `sheet` → otherwise default (which pops the detail route or leaves the app).

## 5. State and data

### Store additions (`useAppStore`) — names are the design's (line 1227)

```ts
type SheetId = 'add' | 'recall' | 'reason';
type ScreenId = 'vinhelp' | 'membership' | 'chat' | 'article';
type RecallFilter = 'open' | 'scheduled' | 'closed';
type PlanId = 'standard' | 'plus' | 'pro';
type LightGroup = 'all' | 'critical' | 'warning' | 'info';
type SvcMethod = 'dropoff' | 'concierge';

// fields (initial values are the design's)
rFilter: 'open'; rOpen: null;                     // recalls list filter / expanded item id
plan: 'pro';
hubIdx: 0; hubGroup: 'all'; hubLight: null; article: null;
svcMethod: 'dropoff'; svcDate: '13'; svcTime: '09:30 AM'; svcDone: false;
pfPush: true; pfEmail: true; pfBio: false;

// actions
switchTab(tab)            → { tab, sheet: null, screen: null, hubLight: null, article: null }      // line 2366
openScreen(id) / closeScreen()                                                                   // openVinHelp/closeVinHelp stay as aliases
setRecallFilter(f)        → { rFilter: f, rOpen: null }                                          // line 1520
toggleRecall(id)          → { rOpen: rOpen === id ? null : id }                                  // line 1555
showRecall(id)            → { tab: 'recalls', screen: null, rFilter: 'open', rOpen: id }         // stats Details, line 1401
scheduleFromRecalls()     → { scheduled: true, rFilter: 'scheduled', rOpen: null } + flash('Service booked · Thu 10:30 AM')   // lines 1471, 1552
setPlan(id)               → { plan: id } + flash(PLANS[id].name + ' membership active')          // lines 2108, 2113
setHubIdx(i); setHubGroup(g); openLight(id) → { hubLight: id }; closeLight() → { hubLight: null }
openArticle(id)           → { screen: 'article', article: id }
setArticle(id)            → { article: id }                                                      // goArticle
closeArticle()            → { screen: null, article: null }
setSvcMethod(m); setSvcDate(d); setSvcTime(t)
confirmService()          → { svcDone: true, scheduled: true } + flash('Service booked · ' + dateLabel(svcDate) + ' at ' + svcTime)   // line 1637
returnToGarage()          → { tab: 'garage', svcDone: false }                                    // line 1675; caller navigates
togglePref(key)           → flips pfPush | pfEmail | pfBio
```

`resetAppStore()` resets everything. Chat state (`chatLog`, `chatShown`, `chatTyping`, `chatDraft`) is **local to `ChatScreen`** (§15.1) — `openChat()` in the source resets it on every open anyway. Tilt values are shared values inside `TiltMap`, never store state.

### Fixtures (verbatim from the source — every string, colour and icon name as written; icons without the `ri-` prefix)

- `fixtures/articles.ts` — `ARTICLES` (line 1016): `{ id, kicker, icon, read, date, wash: { from, to } (the two 135deg stops), title, dek, body: { heading?, text }[] }`.
- `fixtures/lights.ts` — `LIGHTS` (line 1069): `{ id, group, name, short, icon, tone, glyph?, means, action }` — `icon: ''` and `glyph: 'ABS'` for `l8`; `l3`, `l5`, `l7` carry `glyph: ''` (falsy, renders nothing).
- `fixtures/chat.ts` — `CHAT_SCRIPT` (line 1140), `CANNED_REPLY` (line 1755: `'Noted. A specialist will pick this up with your Model S Plaid record attached — expect a reply in this thread within the hour.'`).
- `fixtures/profile.ts` — `USER` (line 1149), `ACTIVITY` (line 1154), `PLANS` (line 1217: `features: [label, ok(0|1)][]`, `recommend?: true`).
- `fixtures/service.ts` — `SVC_DATES`, `SVC_TIMES`, `SVC_CENTER` (lines 1160–1166); the two methods `[{ key:'dropoff', label:'Drop-off', icon:'car-line' }, { key:'concierge', label:'Concierge', icon:'home-4-line' }]` (line 1607); tracker labels (line 1651).
- `fixtures/recalls.ts` — `HISTORY` (line 1168), `REASONS` (line 1174: `{ why, facts: [k,v][], steps: [title, body][], note }`), the live-recall constants (line 1434: severity `'Safety recall'`, remedy `'Software update, free'`, dealer `'Tesla Service — 6.2 mi'`, est `'45 minutes'`, done `'Booked Thu 10:30 AM'` | `'Reported 12 Feb 2026'`), `STATE_META` (line 1447).
- `fixtures/types.ts` — the types above plus `RecallState = 'open' | 'scheduled' | 'closed'`, `RecallItem`.

### Derivations (pure, unit-tested)

- `lib/recalls.ts`
  - `allRecalls(vehicles, scheduled): RecallItem[]` (line 1431) — live entries `id: 'v' + v.id` for every vehicle with a recall, then `HISTORY` with `state: 'closed'`.
  - `vehicleName(vehicles, vid)` (line 1443, fallback `'Vehicle'`).
  - `recallCounts(items)` → `{ open, scheduled, closed }`.
  - `heroVals(counts, vehiclesCount)` (lines 1494–1526): `glow`, `shell` (`#232228` | `#F2F1EE`), `faceOpacity` (`0.86` | `0` — see §7 GlowCard), `title`, `sub`, `icon`, `iconBg`, `strip` (only non-zero segments, `grow` = count), `legend` (three entries), `headline`.
  - `filterVals(k, counts, rFilter)` (line 1517): `label`, `count`, `bg`, `border`, `fg`, `meta` exactly as the source's ternaries.
  - `emptyText(rFilter)` (line 1531).
  - `itemRows(x)` → `[['SEVERITY', x.severity], ['REMEDY', x.remedy], ['WHERE', x.dealer], ['EST. TIME', x.est]]`.
  - `detailFor(items, vehicles, id)` (line 1455): `{ code, title, meta, vehicle: name + ' · ' + done, facts, why, steps: { n, title, body }[], note, state }`; `REASONS[code]` fallback `{ why:'', facts:[], steps:[], note:'' }`.
- `lib/service.ts`
  - `dateLabel(svcDate)` = `'Tuesday, Oct ' + svcDate` (line 1565 — verbatim, the weekday is the design's).
  - `refLine(open)` = `'REF: ' + (open ? code.replace('NHTSA ', 'NHTSA-') : 'NHTSA-24V001')`; `reasonVals(open)` (lines 1569–1577).
  - `reasonRows(center)` (line 1583) — `WHERE` = `SVC_CENTER.name + ' — ' + SVC_CENTER.distance`.
  - `trackerSteps()` (lines 1651–1666): rail/node/dot/fg/size/weight/track per state.
  - `tiltFor(betaDeg, gammaDeg)` (line 1798): `nx = clamp((beta − 35)·0.28, ±8)`, `ny = clamp(gamma·0.28, ±8)` → `{ tiltX: −nx, tiltY: ny }`; `tiltChanged(prev, next)` = either delta > 0.25.
- `lib/hub.ts` — `GROUP_META` (line 1903), `BADGE` (line 1911), `hubHeadline()` = `'4 ARTICLES · 20 DASHBOARD LIGHTS'`, `hubCounter(i)`, `visibleLights(group)`, `neighbour(id, dir)` (wrapping), `nextTitle(id)`.
- `lib/chat.ts` — `revealPlan(script)` → the ordered timer steps of `revealChat` (line 1728): for `them`: `typing` then after **1200 ms** show, then **900 ms** before the next; for `me`: after **320 ms** show, then **500 ms** before the next. `sendDelay = 1400`.
- `lib/membership.ts` — `planLabel(plan)` = `'AEGIS ' + name.toUpperCase() + ' ACTIVE'`; `planLine(plan)` = `name + ' · ' + price + '/month'`.

## 6. Tokens (`theme/tokens.ts` additions)

Colours: `infoBg '#E7F1F7'`, `dangerBg '#FBE9EB'`, `dangerEdge '#F0B9C0'`, `dangerInk '#7a5257'`, `warnBadgeBg '#FBE9CB'`, `warnBadgeInk '#7A5307'`, `ink8 '#a3a2aa'`, `hair10 'rgba(0,0,0,0.10)'`, `hair12 'rgba(0,0,0,0.12)'`, `hair20 'rgba(0,0,0,0.20)'`, `tint06 'rgba(0,0,0,0.06)'`, `chatTop '#18181B'`, `chatBottom '#09090B'`, `chatBubble 'rgba(39,39,42,0.9)'`, `chatField 'rgba(39,39,42,0.5)'`, `chatEdge 'rgba(255,255,255,0.10)'`, `chatHair 'rgba(255,255,255,0.06)'`, `chatDim 'rgba(255,255,255,0.42)'`, `chatMuted 'rgba(255,255,255,0.6)'`, `chatSendOff 'rgba(255,255,255,0.3)'`, `mapInk 'rgba(23,22,26,0.25)'`, `mapInk2 'rgba(23,22,26,0.20)'`, `mapInk3 'rgba(23,22,26,0.10)'`, `mapTint 'rgba(23,22,26,0.05)'`, `building 'rgba(107,106,114,0.30)'` (others computed inline).
Easings: `swipe [0.22, 1, 0.36, 1]`. Durations: `swipe 360`, `snap 300`, `leave 380`, `toggle 220`, `tilt 120`, `strip 500`, `bubbleIn 350`, `dotBob 800`, `hubAuto 5000`, `shine 4000`, `filter 200`, `map 350`.
Layout: `shineBaked 1024`.

## 7. Primitives

### `ShineBorder` (lines 762–766 membership; 375–379 service)
Props `{ ramp: 'plus' | 'caution', radius, children, style }`. Wrapper `borderRadius: radius, overflow: 'hidden'` (the source's `inset:0` clip) with a pre-baked conic PNG (`shine-<ramp>.png`, blur baked in) sized `side = ceil(hypot(w, h))` from `onLayout`, centred, rotating 0 → 360° in **4 s linear, infinite** (`shine-spin`). Children render above. The face is the caller's inner card (white, radius − 2, inset 2 via the caller's `padding: 2`). Ramps (from 0deg): plus `#3b82f6, #ef4444, #2dd4bf, #3b82f6` blur 4; caution `#D0021B, #ffb741, #D0021B, #ffb741, #D0021B` blur 3.

### `Toggle` (lines 578–583)
`{ on, onPress, label }`: row `minHeight 42`, label `14 #3a3941` left; track 44×26 r13 `padding 3`, colour `#0F638F` on / `#dcdbd8` off (220 ms `ease`); knob 20 white r10 `boxShadow 0 1px 2px rgba(0,0,0,.22)`, `translateX 18` on / 0 off (220 ms `cubic-bezier(.4,0,.2,1)` = `ease.press`). Whole row pressable, `accessibilityRole="switch"`.

### `StatusChip` (line 133, 240, 977)
`{ bg, fg, icon, label, size = 9, padX = 10, padY = 5 }`: r999 row `gap 6`, mono `size / 1.4` in `fg`, icon 12 in `fg`.

### `SheetShell` (added to `ui/Sheet.tsx`)
The scrim + panel + handle of `sheetShell` (line 2203) without the title block: `{ onClose, handleMargin = 18, paddingBottom = 28, gap, children, testID }`. `Sheet` becomes `SheetShell` + its title/sub/action header (unchanged output). The light and reason sheets use `SheetShell` with `handleMargin 6`, `paddingBottom 26`, `gap 14` (lines 900–901, 976–977).

### `InfiniteRail` (from `screens/garage/Rail.tsx`)
The tripled-list, centre-snapping, silently-recentring `FlatList` with the 9 %/91 % edge mask, generalised: `{ count, index, onIndexChange, renderItem(i, active), keyFor(i), testID }` + an imperative handle `{ scrollTo(i, animated), advance() }`. `advance()` = scroll one **slot** forward from the current slot (animated), then after `dur.swipe + 60 ms` recentre silently if the slot left the middle copy — the source's `startHubAuto` glides to `children[n + hubIdx + 1]` and lets the scroll handler recentre (lines 1866–1898). Garage's `Rail` keeps its exact behaviour by delegating to it.

### `TiltMap` (lines 388–441)
See §8 Service. Sensor: `expo-sensors` `DeviceMotion` (`setUpdateInterval(60)`), `rotation.beta/gamma` in radians → degrees → `tiltFor`; only when `tiltChanged` → `tiltOn = true`, `withTiming(120 ms, linear)` into shared values; `transform: [{ perspective: 1000 }, { rotateX }, { rotateY }]`. Permission: `DeviceMotion.requestPermissionsAsync()` is called but its answer is **not** a gate — Expo Go reports `denied` (no HIGH_SAMPLING_RATE_SENSORS in its manifest) while still delivering 60 ms updates (found on the emulator, 2026-09-10); the permission only matters above 200 Hz. If the sensor is unavailable the card stays flat with `LIVE` (the source's desktop fallback uses the pointer, which has no touch equivalent — §9).

## 8. Screens — every measurement is from the cited lines; anything not listed is read from the source

### Recalls (`isRecalls`, lines 182–273) — `screens/recalls/RecallsScreen.tsx`
Scroll `gap 20`, `padding (insets.top + 24) 20 28`.
1. Title row `alignItems flex-end`, `gap 16`: `Recalls` `38/42/600/−1.2 #17161A`; `headline` mono `11 / 1.4 #63626a` (wraps to two lines at this width, as in `app-recalls-open.png`); `MetalButton` blue `Add Vehicle` / `sparkling-2-line` → `openSheet('add')`.
2. Hero `GlowCard` `shell = heroShell`, `radius 18`, `glow = counts.open > 0`, blob **220 / blur 18** (baked blob scaled to 220), `faceOpacity = open ? 0.86 : 0`, `faceRadius 16`, face `padding 18 gap 14`, outline `rgba(0,0,0,.08)`: header row `space-between gap 14`: [title `30/34/600/−1`, sub `13 #6b6a72` (gap 3)] + 40 px circle `heroIconBg` with `heroIcon` 19 white; strip row `gap 3 height 6`: segments `flex = grow` (animated 500 ms `ease`), r3, colour; legend row `gap 14`: 7 px dot + mono `9 / 1.1 #57565e`.
3. Filters row `gap 8`: per `open | scheduled | closed` a pressable `flex 1`, column `gap 3`, `padding 11 12`, r14, `bg` + `border 1 border`: count `22/600/−0.6 fg`; label mono `9 / 1.2 meta` → `setRecallFilter(k)`.
4. Items column `gap 12`: `RecallCard` per shown item; if none, the empty row `gap 11 r16 #F2F1EE padding 16`: `shield-check-fill` 19 `#01a08c` + `14 #3a3941` `emptyText`.

**`RecallCard`** (lines 231–264): `GlowCard` shell `#232228` | `#F2F1EE`, r18, `glow = open`, blob **200 / blur 16**, `faceOpacity = open ? 0.86 : 0`, faceRadius 16, face `padding 16 gap 12`; whole card pressable → `toggleRecall(id)`:
- row `gap 8`: `StatusChip` (`chipBg/chipFg/icon/status` from `STATE_META`), code mono `10 / 1.2 #57565e`, caret `arrow-up-s-line` | `arrow-down-s-line` 20 `#63626a` at the right (`marginLeft auto`).
- `gap 3`: title `18/23/600/−0.3`, vehicle `13 #6b6a72`.
- expanded: rows `padding 10 0`, `borderTop 1 rgba(0,0,0,.07)`: k mono `9 / 1.2 #57565e` | v `13 #17161A` right-aligned.
- actionable (open): row `gap 10`: `MetalButton` blue `Schedule Repair` / `calendar-2-line`, `flex 1.4`, width auto, h48, r999, gap 8, icon 16, font 14 → `scheduleFromRecalls()`; `OutlinePill` `See details` / `arrow-right-line` h48 → `router.navigate` to the detail (the press must not toggle the card).

### Recall detail (`isDetail`, lines 127–180) — `RecallDetailScreen({ id, onBack })`
Column `flex 1`. Scroll `gap 20`, `padding (insets.top + 18) 20 24`:
1. Row `gap 10`: back 36×36 (`marginLeft −8`) `arrow-left-line` 20 `#17161A` → `onBack`; code mono `10 / 1.6 #57565e`; `StatusChip` right (`marginLeft auto`).
2. `gap 8`: title `28/33/600/−0.9`; vehicle `14 #6b6a72`.
3. Facts 2-column grid `gap 10`: r14 `#F2F1EE` `padding 13 14 gap 5`: k mono `9 / 1.3 #57565e`; v `15/500 #17161A`.
4. `gap 9`: `WHY THIS MATTERS` mono `10 / 1.8 #63626a`; why `15/23 #3a3941`.
5. `gap 11`: `THE REMEDY`; steps: row `gap 12 alignItems flex-start`: 24 px circle `#17161A` mono `11 #F4F3F5` `n`; column `gap 2 paddingTop 2`: title `14/500 #17161A`, body `13/19 #6b6a72`.
6. Note row `gap 10 r14 #F2F1EE padding 14 15`: `information-line` 17 `#0F638F` + `13/19 #3a3941`.
Pinned footer `padding 12 20 16`, `rgba(255,255,255,.94)`, `borderTop 1 rgba(0,0,0,.07)`, row `gap 10 alignItems stretch`: open → `MetalButton` blue `Schedule Repair` / `calendar-2-line` `flex 1` width auto h54 r999 gap 9 icon 17 font 15 → `scheduleFromRecalls()`; else a `flex 1 h54 r999 #F2F1EE` row `gap 8` with `checkbox-circle-line` 17 + `15/500 #6b6a72` `Scheduled Thu 10:30 AM` (scheduled) | `Repair complete` (closed). Phone button 54×54 r999 `border 1 rgba(0,0,0,.14)` `phone-line` 19 → `flash('Calling the service centre is not wired up here')`.

### Service form (`sv.showForm`, lines 366–488) — `screens/service/ServiceScreen.tsx`
Scroll `gap 24`, `padding (insets.top + 18) 20 28`. `open = vehicles.find(v => v.recall)` (the *first* vehicle with a recall, scheduled or not — line 1564).
1. `gap 5`: `Schedule Service` `30/34/600/−1`; `Select a time and location for your appointment.` `13 #6b6a72`.
2. Reason card, pressable → `openSheet('reason')` (only meaningful when `open`; the sheet renders only when `open` — line 1580): outer r16 `padding 2`, `overflow hidden`, bg `transparent` (open) | `#F2F1EE`; when open, `ShineBorder` ramp `caution`. Inner r14 `#F2F1EE` `padding 15 16` row `gap 14 alignItems center`: column `gap 6 flex 1`: row `gap 7` [icon 13 `reasonTone` + ref mono `9 / 1.4 reasonTone`]; reason `18/23/600/−0.3`; hint mono `9 / 1.2 #57565e`; `arrow-right-s-line` 20 `#63626a`. Values: line 1569–1577.
3. `gap 11`: row `space-between` [`SELECTED CENTER` mono `10 / 1.8 #63626a` | `Change` `12/500 #0F638F` → `flash('Dealer map is not wired up here')`]; **`TiltMap`**:
   - Card `height 250 r16 #FFFFFF border 1 rgba(0,0,0,.1) overflow hidden`, transform per §7.
   - Map layer (absolute fill): `#F2F1EE`; roads as absolutely positioned views at percentage positions (`top/left %` are supported): horizontals at 35 % and 65 % (4 px, `rgba(23,22,26,.25)`), verticals at 30 % and 70 % (3 px, `.20`), then 1.5 px `.10` lines at 20/50/80 % (horizontal) and 15/45/55/85 % (vertical), each centred on its percentage; six buildings (lines 416–421) as `position absolute` views with the percentage `top/left/width/height` (the fourth uses `right: 10%`), r3, fill/border as written; the pin: 30×30 SVG (`path M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z` fill `#0F638F`, circle `12 9 r2.5` white) centred, `filter: [{ dropShadow: '0 0 10px rgba(15,99,143,0.45)' }]`; fade: `LinearGradient` bottom `#FFFFFF` → transparent at 55 % (`angle 0deg` = upward), `opacity .72`.
   - Content layer `padding 15 16`, column `space-between`, `height 100%`: top row [44 px circle `rgba(255,255,255,.86)` with `map-pin-line` 20 `#17161A` | pill r999 `rgba(23,22,26,.05)` `padding 5 9 gap 6`: 6 px dot `#01a08c` + mono `9 / 1.2 #57565e` `LIVE` | `LIVE TILT`]; bottom row `alignItems flex-end space-between`: column `gap 3` [center `18/600/−0.3`; address `13 #6b6a72`; coords mono `11 / .6 #57565e`; rule 1 px `LinearGradient` 90deg `rgba(15,99,143,.5) → .25 → transparent`, `marginTop 3`] + distance mono `11 #0F638F`.
4. `gap 11`: `SERVICE METHOD`; segmented row `gap 4 padding 4 r14 #F2F1EE`: two pressables `flex 1 h42 r10` row `gap 8`: on → `#FFFFFF` + `boxShadow 0 1px 2px rgba(0,0,0,.08)`, fg `#17161A`; off → transparent, fg `#6b6a72`; icon 16 + label `13/500`.
5. `gap 11`: `SELECT DATE`; horizontal `ScrollView` `gap 10`, `marginHorizontal −20`, `paddingHorizontal 20`: tiles 66×82 r16 column centre `gap 4`, on → `#E7F1F7` / border `#0F638F` / fg `#0F638F` / meta `#0F638F`; off → `#FFFFFF` / `rgba(0,0,0,.1)` / `#17161A` / `#63626a`; day mono `9 / 1.2`, date `22/600/−0.6`.
6. `gap 11`: `AVAILABLE TIMES`; 3-column grid `gap 10`: cells `minHeight 46 r12`, same on/off colours, label mono `12`; the **first** time is disabled (`opacity .35`, not pressable — line 1626).
7. `paddingTop 2`: `MetalButton` blue `Confirm Appointment` / `calendar-check-line` `flex 1` width auto h54 r999 gap 9 icon 17 font 15 → `confirmService()`.

### Service done (`sv.showDone`, lines 490–533) — `ServiceDone.tsx`
Same scroll; column `gap 26`:
1. Centre column `gap 12 padding 22 0 4`: 146 px circle `#F2F1EE` `border 1 rgba(15,99,143,.28)` `boxShadow 0 0 34px rgba(15,99,143,.14)` containing a 58 px circle with the blue face gradient (`160deg #2E93C4 → #0F638F 55% → #0B4E73`) and `check-line` 32 `#EAF7FF`; `Confirmed` `28/32/600/−0.9` (`marginTop 6`); `Your service request is scheduled.` `13 #6b6a72`.
2. Details card r16 `#F2F1EE padding 0 18`: two rows `minHeight 88 gap 14 padding 18 0 borderTop 1 line` (first transparent, second `rgba(0,0,0,.08)`): 42 px white circle with icon 20 `#3a3941` (`calendar-line`, `map-pin-line`); column `gap 3`: label mono `9 / 1.3 #57565e`, value `18/600/−0.3`, secondary `12 #6b6a72`. Values line 1646.
3. `gap 14`: `STATUS TRACKER`; steps (line 1651): row `gap 12 minHeight 52 alignItems flex-start`: 20 px column with the rail (1 px, `top 20 bottom −32`, colour `rail`) and the node (20 px circle, `nodeBg`, `nodeBorder` 2 px `#0F638F` active / 1 px `#9a99a2` done / 1 px `rgba(0,0,0,.12)` pending, inner 8 px dot `dot`); label `size / weight / track / fg` per state (active `20/600/−0.4 #0F638F`, done `15/400 #3a3941`, pending `15/400 #9a99a2`).
4. `MetalButton` blue `Return to Garage` / `inbox-line` `flex 1` width auto h54 r999 gap 9 icon 17 font 15 → `returnToGarage()` + `router.navigate('/(tabs)/garage')`.

### Reason sheet (`sv.reasonOpen`, lines 973–1001) — `ReasonSheet.tsx`
`SheetShell` (handle margin 6, gap 14, paddingBottom 26): row `gap 8`: `StatusChip` `#D0021B`/`#fff` `alarm-warning-fill` `ACTIVE SAFETY RECALL` + code mono `10 / 1.2 #57565e`; `gap 4`: title `21/26/600/−0.5`, vehicle `13 #6b6a72` (= `name · meta`); rows (`reasonRows`) `padding 10 0 borderTop rgba(0,0,0,.07)`: mono `9 / 1.2 #57565e` | `13 #17161A` right; why `13.5/20 #3a3941`; buttons row `gap 10`: `Continue booking` `flex 1.4 h50 r999 #17161A` `14/500 #F4F3F5` → `closeSheet()`; `Full recall` `flex 1 h50 r999 border 1 rgba(0,0,0,.14)` `14/500 #17161A` + `arrow-right-up-line` 15 → `closeSheet()`, `switchTab('recalls')`, `setRecallFilter('open')`, navigate to the detail of `'v' + open.id` (line 1591).

### Hub (`isHub`, lines 635–710) — `screens/hub/HubScreen.tsx`
Scroll `gap 24`, `padding (insets.top + 24) 0 28` (no side padding; sections add `paddingHorizontal 20`).
1. `gap 6 px 20`: `Hub` `38/42/600/−1.2`; headline mono `11 / 1.4 #63626a`.
2. `gap 12`: row `baseline space-between px 20` [`FEATURED READING` | counter] mono `10 / 1.8 #63626a`; **rail** = `InfiniteRail` over `ARTICLES` (`index = hubIdx`, `onIndexChange = setHubIdx`), auto-advancing every **5 s** while the hub tab is focused (`useIsFocused`) and no `screen` / `hubLight` / `sheet` is open (line 1892) — the interval keeps running; ticks are skipped; dots row `gap 6 px 20`: 2 px r1, active `width 22 #17161A` / inactive `6 #dcdbd8` (300 ms), tap → `scrollTo(i)`.
   **`ArticleCard`** (lines 651–664): `width 318 r18 #F2F1EE overflow hidden`, pressable → `openArticle(id)`: wash `height 132 padding 16` column `space-between` with `LinearGradient` 135deg `[from, to]` (`cssAngleToPoints(135, 318, 132)`): kicker pill (`alignSelf flex-start`, r999 `rgba(255,255,255,.9)`, mono `9 / 1.3 #17161A`, `padding 5 10 gap 6`, icon 12) and the article icon 44 `rgba(255,255,255,.85)` `alignSelf flex-end`; body `padding 15 16 17 gap 6`: title `18/23/600/−0.4`, dek `13/19 #6b6a72`, row `gap 8 marginTop 4`: read mono `9 / 1.2 #57565e` + `arrow-right-up-line` 14 `#63626a`.
3. `gap 12 px 20`: `gap 5` [`DASHBOARD LIGHTS` mono `10 / 1.8 #63626a`; `Tap any warning light to read what it means and what to do next.` `13/19 #6b6a72`]; group chips row `gap 7 wrap`: r999 `padding 7 12` row `gap 6`, `bg`/`edge`/`fg` per `on` (line 1929), 7 px dot `GROUP_META.dot`, mono `9 / 1.2` label → `setHubGroup(k)`; **grid** 4 columns `gap 8`: tile `aspectRatio 1 r14 #F2F1EE border 1 edge` (`rgba(0,0,0,.20)` when `hubLight === id`, else transparent) column centre `gap 6 padding 6`: 26 px box with icon 23 in `tone` (when `icon`) and/or glyph mono `13/500 ls .4` (when `glyph`); short `9.5/12 #57565e` centred → `openLight(id)`; info row `gap 10 r14 #F2F1EE padding 13 15`: `information-line` 16 `#0F638F` + `12/18 #3a3941` (line 705 copy).

### Light sheet (`hb.lightOpen`, lines 897–922) — `LightSheet.tsx`
`SheetShell` (handle margin 6, gap 14, paddingBottom 26): row `gap 13`: 52×52 r14 `#17161A` with icon 27 `tone` and/or glyph mono `15/500 tone`; column `gap 4`: name `19/600/−0.4`, badge (`alignSelf flex-start`, r999, mono `9 / 1.3`, `padding 4 9`, `BADGE[group]` = `['STOP DRIVING', '#D0021B', '#FFFFFF']` | `['GET IT CHECKED', '#FBE9CB', '#7A5307']` | `['STATUS ONLY', '#E7F1F7', '#0B4E73']`); means `14/21 #3a3941`; box r14 `#F2F1EE padding 14 15 gap 9`: `WHAT TO DO` mono `9 / 1.3 #57565e` + action `13.5/20 #17161A`; `Got it` `h50 r999 #17161A` `14/500 #F4F3F5` → `closeLight()`. Scrim tap → `closeLight()`.

### Article reader (`isArticle`, lines 924–971; logic 1950–2086) — `ArticleReader.tsx` + `ArticlePanel.tsx`
Absolute overlay, white. Three kinds of panel, all `StyleSheet.absoluteFill #FFFFFF`:
- **Live panel** (key = article id): header `padding (insets.top + 18) 20 8` row `space-between`: [close 38×38 `marginLeft −9` `close-line` 23 → `closeArticle()`; kicker mono `10 / 1.8 #57565e`] + [prev/next 44×44 r22 `border 1 rgba(0,0,0,.12)` `arrow-left-s-line` / `arrow-right-s-line` 19 `#3a3941`]; scroll `gap 18 padding 8 20 32`: wash `height 150 r18 padding 16` (icon 56 `rgba(255,255,255,.85)` bottom-right); `gap 8` [title `30/35/600/−1.1`; row `gap 8`: read mono `9 / 1.2 #57565e` · 3 px dot `#a3a2aa` · date]; body blocks `gap 6` [heading `17/600/−0.3` when present; text `15/24 #3a3941`]; hint row centred `gap 8 padding 2 0`: `drag-move-2-line` 15 + `SWIPE FOR THE NEXT ARTICLE` mono `9 / 1.3`, both `#9a99a2`; next card r16 `#F2F1EE padding 15 16` row `gap 12`: [`NEXT ARTICLE` mono `9 / 1.3 #57565e`; `nextTitle` `14/500`] + `arrow-right-line` 19 `#63626a` → next.
- **Peek / leaver panels** (`articlePanel`, line 1979): header (close glyph + kicker, non-interactive) + wash 150 + title + first paragraph only, `pointerEvents none`.
Motion (all `bez(ease.swipe)` = `cubic-bezier(.22,1,.36,1)`):
- Entrance: `dir 0` (from the hub) `translateY(H) → 0`; `dir ±1` `translateX(±W) → 0`; 360 ms (`playArticleSwipe`).
- Leaver: previous article's panel `translateX 0 → ∓0.22·W`, opacity 1 → 0, 360 ms; unmounted after 380 ms (`goArticle`).
- Drag: `Gesture.Pan()` `activeOffsetX ±8`, `failOffsetY ±8` (the source arms at |dx| ≥ 8 with |dx| ≥ |dy|); live panel `translateX = dx`, a shadow underlay `0 0 40px rgba(0,0,0,.18)` fades in while dragging; peek panels sit at `W + dx` (next) and `−W + dx` (prev) so the correct neighbour slides in with the finger. Release: `|dx| > 70` → `goArticle(dx < 0 ? 1 : −1)`, else `withTiming(0, 300 ms)`.
- `goArticle(dir)`: `setArticle(neighbour)`, `setHubIdx(index)` (the hub rail follows), leaver = the old id, drag reset to 0, live panel remounts with the entrance.
- The overlay ignores drags while a leaver is animating (line 2003).

### Profile (`isProfile`, lines 537–633) — `screens/profile/ProfileScreen.tsx`
Scroll `gap 16`, `padding (insets.top + 18) 20 28`. Cards are r16 `#F2F1EE padding 18` unless stated.
1. Header column centre `gap 8 padding 20 0 22`: 118 px circle `#FFFFFF border 2 rgba(0,0,0,.12)` with initials `42/49/700/−1.5 #9a99a2` (Geist 700 is not loaded — use 600, §9); name `28/32/600/−0.9` (`marginTop 4`); member `13 #6b6a72`; plan pill r999 `#F2F1EE padding 5 12 gap 5`: `shield-check-fill` 12 `#0F638F` + mono `9 / 1.4 #0F638F` `planLabel`.
2. Membership row (pressable → `openScreen('membership')`) `gap 12`: `vip-crown-2-line` 20 `#0F638F`; column `gap 3` [`Membership` `18/600/−0.3`; `planLine` mono `9 / 1.3 #57565e`]; `arrow-right-s-line` 22 `#63626a`.
3. Account Details `gap 16`: title `18/600/−0.3`; info blocks `gap 3` [label mono `9 / 1.3 #57565e`; value `13 #3a3941`] for EMAIL / PHONE; `Edit Profile` button `minHeight 48 r12 border 1 rgba(0,0,0,.14)` row `gap 8` `pencil-line` 15 + `13/500`, both `#3a3941` → `flash('Profile editing stays local in this prototype')`.
4. Preferences `gap 6`: title (`marginBottom 8`); three `Toggle`s (`Push Notifications`, `Email Alerts`, `Biometric Login`) → `togglePref`.
5. My Garage `gap 14`: row `space-between` [title | `+ ADD VEHICLE` mono `9 / 1.4 #0F638F` → `openSheet('add')`]; per vehicle a pressable row r12 `#FFFFFF border 1 rgba(0,0,0,.08) padding 15 16 gap 12 alignItems flex-start` → stats (`router.navigate('/(tabs)/garage/[id]')` after `switchTab('garage')`): column `gap 4` [name `15/600/−0.2`; make `12 #6b6a72`; vin chip (`alignSelf flex-start marginTop 2` mono `9 / 1.1 #57565e` `#F2F1EE r4 padding 4 6`) = `'VIN: ' + vin.replace('···· ', '') + 'XXXXXX'`; status row `marginTop 6 gap 6` 7 px dot + `12` in `statusColor` `1 Active Recall` | `All Clear`]; `car-fill` 18 `iconColor` (`#D0021B` open / `#9a99a2`).
6. Concierge `gap 12`: 48 px circle `#E7F1F7` `customer-service-2-line` 23 `#0F638F`; `Concierge Support` title; body `13/20 #6b6a72` (line 607 copy); `MetalButton` blue `Start Chat` / `chat-3-line` `flex 1` width auto h50 r999 gap 8 icon 16 font 14 → `openScreen('chat')`.
7. Recent Activity `gap 14`: rows `gap 12 alignItems flex-start`: 8 px dot `color` (`marginTop 6`); column `gap 3` [title `13 #3a3941`; detail mono `9 / 1.2 #57565e`].
8. Danger Zone r16 `#FBE9EB border 1 #F0B9C0 padding 18 gap 12`: title `18/600/−0.3 #D0021B`; body `13/20 #7a5257`; `Delete Account` `alignSelf flex-start minHeight 46 padding 0 16 r12 border 1 #D0021B` `13/500 #D0021B` → `flash('No account data is stored by this build')`.

### Membership (`isMembership`, lines 749–799) — `MembershipScreen.tsx` + `PlanCard.tsx`
`SlideUpScreen` caption `MEMBERSHIP` (close → `closeScreen()`); body `gap 16 padding 8 20 32`: `gap 7` [`Select your protection level` `32/36/600/−1.1`; sub `14/21 #6b6a72` (line 758 copy)]; a `PlanCard` per plan; footer row `gap 9 padding 2 2 0`: `lock-line` 14 `#63626a` + `12/18 #6b6a72` `Billed monthly. Cancel any time from this screen.`
**`PlanCard`** (lines 760–792, vals 2096–2127): outer r16, `padding = recommend ? 2 : 0`, `bg = recommend ? transparent : #FFFFFF`, `ShineBorder` ramp `plus` when `recommend`; inner r14 `#FFFFFF border 1 edge` (`transparent` | `rgba(0,0,0,.10)`) `padding 18 gap 14`: header row `space-between alignItems flex-start gap 10`: column `gap 5` [name `18/600/−0.3`; row `baseline gap 4` price `32/600/−1.3` + `/month` `13 #6b6a72`] + badge when recommend (r999 `#17161A` `#F4F3F5` `11/500 padding 5 10 gap 5` `fire-fill` 13 `Recommend`); divider 1 px `rgba(0,0,0,.08)`; features `gap 10`: row `gap 9` icon 15 (`check-line #17161A` | `close-line #a3a2aa`) + label `13` (`#6b6a72` | `#a3a2aa`); CTA: recommend → `MetalButton` **default** tint (`metalPill` without `tint`), label `Current plan` if active else `cta`, `sparkling-2-line`, width `'auto'` stretched (`alignSelf stretch`), h48, r12, gap 8, icon 16, font 14 → `setPlan`; else a pressable `h48 r12 14/500`: active → `#F2F1EE`, border transparent, `#6b6a72`, `Current plan`, not pressable; inactive → `#FFFFFF border 1 rgba(0,0,0,.14) #17161A` `cta` → `setPlan`.

### Chat (`isChat`, lines 801–846; logic 1724–1808) — `ChatScreen.tsx`
Absolute overlay sliding up 340 ms (`screen-up`, `ease.sheet`), background `LinearGradient` 180deg `#18181B → #09090B`, `StatusBar light` while mounted.
- Header `padding (insets.top + 16) 16 13`, `borderBottom 1 rgba(255,255,255,.06)`, row `gap 10`: close 34×34 `marginLeft −7` `close-line` 22 white → `closeScreen()`; avatar 34 r17 gradient 135deg `#2E93C4 → #0B4E73` `customer-service-2-fill` 17 white; column `gap 1` [`Aegis Concierge` `14/500 #fff`; status `11 rgba(255,255,255,.42)` = `Typing…` while typing else `Online · replies in minutes`]; Replay button r10 `rgba(255,255,255,.06) padding 7 11 gap 6`: `restart-line` 14 + `Replay` `12`, both `rgba(255,255,255,.6)` → restart the reveal.
- Body `ScrollView` `gap 12 padding 18 16`, scrolled to the end on every change: per shown message a row `gap 8 alignItems flex-end`, `row` (them) | `row-reverse` (me); avatar 30 r15 (them only); bubble `maxWidth 75% r16 padding 11 14` `13.5/20`: them → `rgba(39,39,42,.9)`, `#F4F4F5`, `border 1 rgba(255,255,255,.10)`, `borderTopLeftRadius 6`, shadow `0 4px 12px -2px rgba(0,0,0,.3)`; me → gradient 135deg `#2E93C4 → #0B4E73`, white, no border, `borderTopRightRadius 6`, shadow `0 8px 24px -6px rgba(15,99,143,.5)`. Entrance `bub-in-l` / `bub-in-r`: opacity 0 → 1, `translate(∓20, 12) scale(.96)` → identity, 350 ms `ease.swipe`. Typing row: avatar + pill (r16, `borderTopLeftRadius 6`, `border 1 rgba(255,255,255,.10)`, `rgba(39,39,42,.9)`, `padding 13 15 gap 5`) with three 7 px dots `rgba(255,255,255,.6)` bobbing (opacity .4 → 1 → .4, `translateY 0 → −4 → 0`, 800 ms ease-in-out, delays 0 / 150 / 300 ms, infinite).
- Composer `padding 12 14 (20 + insets.bottom)`, `borderTop 1 rgba(255,255,255,.06)`, inside a `KeyboardAvoidingView`: field r14 `border 1 rgba(255,255,255,.10)` `rgba(39,39,42,.5)` `padding 8 8 8 15` row `gap 10`: `TextInput` `13.5 #fff` placeholder `Ask the concierge…` (`rgba(255,255,255,.45)`), `returnKeyType send`, submit → send; send button 34×34 r11, `#0F638F` with draft else `rgba(255,255,255,.06)`; `send-plane-fill` 16 `#fff` | `rgba(255,255,255,.3)`.
- Reveal (`revealPlan`): on mount and on Replay, reset `shown = 0`, then run the timer plan from §5. `send`: trims the draft (ignore empty), appends `{ from: 'me' }`, shows typing, after **1400 ms** appends `CANNED_REPLY`. Timers are cleared on unmount/close.

## 9. Effects — implementation and flags

| Effect | Implementation | Fidelity note |
|---|---|---|
| Shine borders (Plus plan, service caution) | pre-baked conic PNG rotating 4 s linear, clipped by the card radius | exact pixels; blur baked at 2× |
| Recalls glow cards | `GlowCard` (exists) with blob 220/200 | the baked blob is 210 px / blur 16; 220/18 and 200/16 are scaled from it — sub-pixel blur differences, accepted (as Slice 1) |
| Glass faces `backdrop-filter: blur(24px)` on `rgba(255,255,255,.86)` | `GlowCard`'s BlurView only under glow shells | invisible over flat `#F2F1EE`, as Slice 1 |
| Tilt map `rotateX/rotateY` + `perspective` | RN transforms driven by `DeviceMotion` | **flag:** the emulator's virtual sensor is static (the card sits at one fixed tilt and says `LIVE TILT`); the pointer fallback has no touch equivalent |
| Pin `drop-shadow` | RN `filter: dropShadow` on Android; the layer shadow (`shadowColor #0F638F`, opacity .45, radius 5) elsewhere | Android is the target; the iOS path (added 2026-09-11) follows the pin's alpha because the view has no background — unverified off Android |
| Map `backdrop-filter: blur(4px)` on the LIVE pill | omitted | the pill sits on a flat map layer; nothing to blur |
| Strip `flex-grow` transition | Reanimated animated `flex` | exact |
| Toggle track colour | `interpolateColor` 220 ms | exact |
| Filter / chip / date / time `background .2s` transitions | instant | **flag:** 200 ms colour fades on tap targets are not reproduced |
| Article swipe (`art-in/out`, drag, peek) | Reanimated + gesture-handler Pan | exact; the drag threshold uses GH's `activeOffsetX` |
| Chat bubble entrances, dot bob | Reanimated `withTiming` / `withRepeat` | exact |
| Sheets `sheet-up` + scrim `blur(2px)` | existing `Sheet` behaviour | as Slice 1 |
| Membership Plus CTA (`metalPill` default tint) | `MetalButton tint="default"` (exists, `metal-default.png`) | exact |
| Initials `font-weight 700` | Geist 700 | exact — `Geist_700Bold` loaded 2026-09-11 (it was 600 while only 300–600 were loaded) |
| Hub rail fling / hub auto-advance glide (420 ms cubic) | `FlatList` snapping / `scrollToOffset` animated | as Slice 1's rail flag: platform deceleration, not the source's cubic |

## 10. Assets, fonts, icons

- `scripts/bake-assets.mjs` gains `SHINE = { plus: { ramp, blur: 4 }, caution: { ramp, blur: 3 } }` baked with the existing `conic()` at `1024 × 1024` (`shineBaked`) and `blur(png, blur · 2)` → `src/assets/images/shine-plus.png`, `shine-caution.png`.
- Icons used (all Remixicon 4.5.0, present in the glyph map): `alarm-warning-fill calendar-check-fill checkbox-circle-fill arrow-up-s-line arrow-down-s-line arrow-right-line arrow-left-line arrow-right-s-line arrow-left-s-line arrow-right-up-line phone-line information-line shield-check-fill calendar-2-line settings-3-line map-pin-line car-line home-4-line calendar-check-line calendar-line check-line inbox-line sparkling-2-line vip-crown-2-line pencil-line car-fill customer-service-2-line customer-service-2-fill chat-3-line fire-fill lock-line close-line restart-line send-plane-fill drag-move-2-line` plus every `LIGHTS[].icon` and `ARTICLES[].icon`. Task 1 asserts each exists in the glyph map.
- No new font packages. `Geist_700Bold` (already inside the installed `@expo-google-fonts/geist`) was added to `_layout.tsx` on 2026-09-11 for the initials.

## 11. Dependencies

`expo-sensors@~57.0.2` — installed 2026-09-10 via `npx expo install` (bundled in Expo Go; recorded in the ledger so the user can object). Nothing else. `react-native-gesture-handler` and `expo-linear-gradient` are already present.

## 12. Verification

1. **References** (done): `node scripts/app-refs.mjs` → 34 `app-*.png` + `app-geometry.json`.
2. **Per state on the emulator** (Task 13, controller): capture with `adb exec-out screencap -p` and compare with the references at the same logical width: recalls open / expanded / scheduled-empty / closed / closed-expanded / after-schedule; detail open / open-bottom / scheduled; service form / bottom / selected / reason sheet / done / done-bottom; hub idle / auto-2 / grid / critical / info / light abs / oil / cruise; article a2 / swipe-mid / a3 / a3-bottom; profile / mid / bottom / toggle / plus; membership / bottom / plus; chat typing / 2 / full / draft / sent-typing / sent. Motion checked by eye: shine spin, strip growth, toggle, tilt (static on the emulator), rail auto-advance, article swipe/prev/next, bubble entrances and dot bob.
3. **Tests:** unit — `lib/recalls`, `lib/service`, `lib/hub`, `lib/chat`, `lib/membership`, the store additions; component — every screen and overlay (copy present, taps drive the store, cross-links call the router), `InfiniteRail` (garage rail unchanged), `Toggle`, `ShineBorder`, `StatusChip`, `SheetShell`, `OverlayHost` back order. `expo-sensors` and `expo-router` hooks are mocked in `jest.setup.ts`.
4. **On-device:** deferred to the phone pass with Slices 1–2.

## 13. Risks

- **Article reader gestures vs. the vertical ScrollView inside it** — GH Pan with `failOffsetY` should yield to the scroll; verify on the emulator with a diagonal drag.
- **Hub auto-advance + `InfiniteRail` recentring** — programmatic `scrollToOffset` on Android does not reliably fire `onMomentumScrollEnd`; `advance()` therefore recentres itself on a timer.
- **DeviceMotion units** — `rotation.beta/gamma` are radians; the maths expects degrees. Unit test `tiltFor` with degree inputs; convert at the listener.
- **Animated `flex` on the strip** — if Reanimated refuses a layout prop on the UI thread, fall back to animated `width` from `onLayout`.
- **Regression risk in the garage rail refactor** — covered by the existing Garage tests and one emulator capture.

## 14. Acceptance

Slice 3 is complete when: all five tabs are real (the stub is deleted); every state in §12.2 matches its reference on the emulator with every flag documented in `verification.md`; scheduling from the recalls list, the detail, the stats card, the recall sheet or the service form flips every dependent view (garage card/alerts, recalls counts/filters, service reason, profile garage status); the reason sheet's `Full recall` lands on the detail; `Return to Garage` lands on the garage; the article swipe works in both directions; the chat script plays and a sent message gets the canned reply; tests and typecheck pass; everything is pushed.

## 15. Parked decisions (made on the user's behalf; overrule any of them)

1. **Chat state lives in `ChatScreen`**, not the store. The source keeps it in the app state but resets it on every open, so nothing observable differs; local state keeps the timers next to the component that owns them.
2. **The reason sheet is `sheet: 'reason'`**, so switching tabs closes it. The source keeps `svcReason` set across a tab switch and shows the sheet again on return — an edge case with no demo value; one line to change.
3. **Recall detail is a stack route**; Android back pops it (the source has no back). Hardware back on every new overlay closes it (as Slices 1–2).
4. **Hub auto-advance pauses only while the hub tab is focused and no overlay is open** — exactly the source's `startHubAuto` guard; the 5 s interval is never reset by a manual swipe (the source does not reset it either).
5. **Stats "Details" expands the item in the recalls list** (`showRecall`, line 1401) instead of Slice 1's placeholder navigation; the recall sheet's `Details` keeps switching to the tab with its toast (line 2261). Both are the source's behaviour.
6. ~~**Initials at weight 600**~~ — **resolved 2026-09-11:** `Geist_700Bold` is loaded (no download; it ships in the installed package) and the initials render at 700 as designed.
7. **Tilt on the emulator is static** (§9); the phone pass judges it.
8. **A garage row on the Profile tab opens stats with the Garage tab active** — the stats screen is a route in the garage stack (Slice 1), so `router.navigate` switches tabs; the source keeps Profile highlighted while showing stats in place. Moving stats to a shared overlay would restore that; not worth it for the demo.
