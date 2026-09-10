// scripts/app-refs.mjs — Slice 3 reference captures of design/GaragePrototype.dc.html (Recalls, Service, Hub, Profile and their
// overlays). Drives the locally installed Chrome over CDP (no npm Playwright, no Chromium download).
// Output: docs/reference/app-<state>.png (430×932 @2x) and docs/reference/app-geometry.json.
// Needs internet: the design loads fonts, Remixicon and React from CDNs.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4173;
const CDP_PORT = 9334;
const URL = `http://localhost:${PORT}/GaragePrototype.dc.html`;
const OUT = 'docs/reference';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['scripts/serve-design.mjs'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
const profile = mkdtempSync(join(tmpdir(), 'app-refs-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--window-size=430,932', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

async function targetUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a page target');
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(typeof e.data === 'string' ? e.data : e.data.toString());
      if (m.id) { const p = this.pending.get(m.id); this.pending.delete(m.id); if (!p) return; m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
      else this.listeners.forEach((l) => l(m));
    };
  }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  once(method) { return new Promise((resolve) => this.listeners.push((m) => { if (m.method === method) resolve(m.params); })); }
}
const ws = new WebSocket(await targetUrl());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
const cdp = new CDP(ws);
const evaluate = async (expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description));
  return r.result.value;
};
const shot = async (name) => { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/app-${name}.png`, Buffer.from(data, 'base64')); console.log('shot', name); };
const R = '(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})';
const rectOfText = (text) => `(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.textContent.trim()===${JSON.stringify(text)}){const r=n.parentElement.getBoundingClientRect();const cs=getComputedStyle(n.parentElement);return {x:r.x,y:r.y,w:r.width,h:r.height,lines:n.parentElement.getClientRects().length,font:cs.fontFamily,size:cs.fontSize,lh:cs.lineHeight,weight:cs.fontWeight,ls:cs.letterSpacing,color:cs.color}}}return null})()`;
const rectOfIcon = (cls) => `(()=>{const e=document.querySelector('.${cls}');return e?${R}(e):null})()`;
const findText = (text) => `(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.textContent.trim()===${JSON.stringify(text)})return n.parentElement}return null})()`;
const click = async (expr, what) => { await evaluate(`(()=>{const e=${expr};if(!e)throw new Error('no element: ' + ${JSON.stringify(what)});e.click();return 1})()`); };
const clickText = (text) => click(findText(text), text);
const clickTab = (label) => click(`document.querySelector('[aria-label="${label}"]')`, label);
const clickIcon = (cls, nth = 0) => click(`document.querySelectorAll('.${cls}')[${nth}]`, cls);
// metal pills put their onClick on a <button aria-label> hit layer above a pointer-events:none label, so click that layer
const clickPill = (label) => click(`document.querySelector('button[aria-label="${label}"]')`, label);
const scrollBody = (top, last = false) => evaluate(`(()=>{const els=[...document.querySelectorAll('div')].filter(e=>e.style.overflowY==='auto');const el=${last ? 'els.pop()' : 'els[0]'};if(el)el.scrollTop=${top};return 1})()`);
const geometry = { note: 'CSS px of the 430×932 frame; rects {x,y,w,h}; text entries add computed font metrics.' };

await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: false });
const loaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.navigate', { url: URL });
await loaded;
await evaluate('document.fonts.ready.then(()=>1)');
for (let i = 0; i < 100 && !(await evaluate('!!document.querySelector(".ri-restart-line")')); i++) await sleep(100);
// let the splash reach the auth step, then leave through the Google pill (onDone)
await sleep(8600);
await clickText('Google');
await sleep(600);

// ---------- RECALLS ----------
await clickTab('RECALLS'); await sleep(700);
await shot('recalls-open');
geometry.recalls = {
  title: await evaluate(rectOfText('Recalls')), headline: await evaluate(rectOfText('1 OPEN RECALL · 3 VEHICLES MONITORED')),
  heroTitle: await evaluate(rectOfText('1 needs action')), filterOpen: await evaluate(rectOfText('OPEN')),
  itemTitle: await evaluate(rectOfText('Rear camera image failure')), chip: await evaluate(rectOfText('ACTION REQUIRED')),
  caret: await evaluate(rectOfIcon('ri-arrow-down-s-line')),
};
await clickIcon('ri-arrow-down-s-line'); await sleep(400);
await shot('recalls-open-expanded');
geometry.recalls.expanded = { severity: await evaluate(rectOfText('SEVERITY')), seeDetails: await evaluate(rectOfText('See details')) };
await clickText('See details'); await sleep(500);
await shot('recall-detail-open');
geometry.detail = { code: await evaluate(rectOfText('NHTSA 24V-137')), title: await evaluate(rectOfText('Rear camera image failure')), why: await evaluate(rectOfText('WHY THIS MATTERS')), remedy: await evaluate(rectOfText('THE REMEDY')), cta: await evaluate(rectOfText('Schedule Repair')), phone: await evaluate(rectOfIcon('ri-phone-line')) };
await scrollBody(9999); await sleep(300);
await shot('recall-detail-open-bottom');
await clickIcon('ri-arrow-left-line'); await sleep(400);
await clickText('SCHEDULED'); await sleep(400);
await shot('recalls-scheduled-empty');
await clickText('RESOLVED'); await sleep(400);
await shot('recalls-closed');
await clickIcon('ri-arrow-down-s-line', 1); await sleep(400);
await shot('recalls-closed-expanded');
await clickText('OPEN'); await sleep(400);
await clickIcon('ri-arrow-down-s-line'); await sleep(300);
await clickPill('Schedule Repair'); await sleep(500);
await shot('recalls-after-schedule');

// ---------- SERVICE ----------
await clickTab('SERVICE'); await sleep(700);
await shot('service-form');
geometry.service = {
  title: await evaluate(rectOfText('Schedule Service')), ref: await evaluate(rectOfText('REF: NHTSA-24V-137')), reason: await evaluate(rectOfText('Rear camera image failure')),
  hint: await evaluate(rectOfText('TAP FOR RECALL DETAILS')), selectedCenter: await evaluate(rectOfText('SELECTED CENTER')), change: await evaluate(rectOfText('Change')),
  center: await evaluate(rectOfText('Prime Center')), address: await evaluate(rectOfText('1200 Technical Blvd')), coords: await evaluate(rectOfText('37.7749° N, 122.4194° W')),
  distance: await evaluate(rectOfText('4.2 mi')), live: await evaluate(rectOfText('LIVE')), pin: await evaluate(rectOfIcon('ri-map-pin-line')),
  method: await evaluate(rectOfText('SERVICE METHOD')), dropoff: await evaluate(rectOfText('Drop-off')), concierge: await evaluate(rectOfText('Concierge')),
  selectDate: await evaluate(rectOfText('SELECT DATE')), mon: await evaluate(rectOfText('MON')), d12: await evaluate(rectOfText('12')),
};
await scrollBody(9999); await sleep(300);
await shot('service-form-bottom');
geometry.service.times = await evaluate(rectOfText('AVAILABLE TIMES')); geometry.service.t0930 = await evaluate(rectOfText('09:30 AM')); geometry.service.confirm = await evaluate(rectOfText('Confirm Appointment'));
await clickText('Concierge'); await clickText('THU'); await clickText('02:30 PM'); await sleep(400);
await shot('service-form-selected');
await scrollBody(0); await sleep(200);
await clickText('TAP FOR RECALL DETAILS'); await sleep(500);
await shot('service-reason-sheet');
geometry.reasonSheet = { chip: await evaluate(rectOfText('ACTIVE SAFETY RECALL')), title: await evaluate(rectOfText('Rear camera image failure')), continueBooking: await evaluate(rectOfText('Continue booking')), full: await evaluate(rectOfText('Full recall')) };
await clickText('Full recall'); await sleep(600);
await shot('recall-detail-scheduled');
await clickIcon('ri-arrow-left-line'); await sleep(300);
await clickTab('SERVICE'); await sleep(600);
await scrollBody(9999); await sleep(200);
await clickPill('Confirm Appointment'); await sleep(500);
await shot('service-done');
geometry.serviceDone = { confirmed: await evaluate(rectOfText('Confirmed')), check: await evaluate(rectOfIcon('ri-check-line')), dateTime: await evaluate(rectOfText('DATE & TIME')), tracker: await evaluate(rectOfText('STATUS TRACKER')), active: await evaluate(rectOfText('Appointment confirmed')), returnCta: await evaluate(rectOfText('Return to Garage')) };
await scrollBody(9999); await sleep(300);
await shot('service-done-bottom');
await sleep(2300);

// ---------- HUB ----------
await clickTab('HUB'); await sleep(900);
await shot('hub-idle');
geometry.hub = {
  title: await evaluate(rectOfText('Hub')), headline: await evaluate(rectOfText('4 ARTICLES · 20 DASHBOARD LIGHTS')), featured: await evaluate(rectOfText('FEATURED READING')), counter: await evaluate(rectOfText('01 / 04')),
  kicker: await evaluate(rectOfText('RECALL BASICS')), cardTitle: await evaluate(rectOfText('What actually happens after a recall is issued')), read: await evaluate(rectOfText('4 MIN READ')),
  lights: await evaluate(rectOfText('DASHBOARD LIGHTS')), all: await evaluate(rectOfText('ALL')), stopNow: await evaluate(rectOfText('STOP NOW')), oil: await evaluate(rectOfText('Oil pressure')), oilIcon: await evaluate(rectOfIcon('ri-oil-fill')),
  rail: await evaluate(`(()=>{const el=document.getElementById('gp-hub-rail');const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,scrollLeft:el.scrollLeft,children:el.children.length,card0:${R}(el.children[0]),card4:${R}(el.children[4])}})()`),
};
await sleep(5200);
await shot('hub-auto-2');
geometry.hub.counterAfterAuto = await evaluate(rectOfText('02 / 04'));
await scrollBody(9999); await sleep(300);
await shot('hub-grid-bottom');
await clickText('STOP NOW'); await sleep(400);
await shot('hub-critical');
await clickText('STATUS'); await sleep(400);
await shot('hub-info');
await clickText('ALL'); await sleep(300);
await clickText('ABS'); await sleep(500);
await shot('hub-light-abs');
await clickText('Got it'); await sleep(400);
await clickText('Oil pressure'); await sleep(500);
await shot('hub-light-oil');
geometry.lightSheet = { icon: await evaluate(rectOfIcon('ri-oil-fill')), name: await evaluate(rectOfText('Engine oil pressure')), badge: await evaluate(rectOfText('STOP DRIVING')), whatToDo: await evaluate(rectOfText('WHAT TO DO')), gotIt: await evaluate(rectOfText('Got it')) };
await clickText('Got it'); await sleep(400);
await clickText('Cruise'); await sleep(500);
await shot('hub-light-cruise');
await clickText('Got it'); await sleep(400);
await scrollBody(0); await sleep(300);
await clickText('Oil intervals: why the sticker and the manual disagree'); await sleep(700);
await shot('article-a2');
geometry.article = { kicker: await evaluate(rectOfText('MAINTENANCE')), prev: await evaluate(rectOfIcon('ri-arrow-left-s-line')), next: await evaluate(rectOfIcon('ri-arrow-right-s-line')), title: await evaluate(rectOfText('Oil intervals: why the sticker and the manual disagree')), read: await evaluate(rectOfText('3 MIN READ')), heading: await evaluate(rectOfText('Read the manual, not the sticker')) };
await clickIcon('ri-arrow-right-s-line'); await sleep(150);
await shot('article-swipe-mid');
await sleep(600);
await shot('article-a3');
await scrollBody(9999, true); await sleep(300);
await shot('article-a3-bottom');
geometry.article.nextCard = await evaluate(rectOfText('NEXT ARTICLE')); geometry.article.swipeHint = await evaluate(rectOfText('SWIPE FOR THE NEXT ARTICLE'));
await clickIcon('ri-close-line'); await sleep(500);

// ---------- PROFILE ----------
await clickTab('PROFILE'); await sleep(700);
await shot('profile');
geometry.profile = {
  initials: await evaluate(rectOfText('AV')), name: await evaluate(rectOfText('Alexander Vance')), member: await evaluate(rectOfText('Premium Member since 2022')), plan: await evaluate(rectOfText('AEGIS PRO ACTIVE')),
  membership: await evaluate(rectOfText('Membership')), planLine: await evaluate(rectOfText('Pro · $29/month')), account: await evaluate(rectOfText('Account Details')), email: await evaluate(rectOfText('alexander.vance@example.com')),
  edit: await evaluate(rectOfText('Edit Profile')), prefs: await evaluate(rectOfText('Preferences')), push: await evaluate(rectOfText('Push Notifications')),
};
await scrollBody(700); await sleep(300);
await shot('profile-mid');
geometry.profile.garage = await evaluate(rectOfText('My Garage')); geometry.profile.addVehicle = await evaluate(rectOfText('+ ADD VEHICLE')); geometry.profile.vin = await evaluate(rectOfText('VIN: F12345XXXXXX')); geometry.profile.status = await evaluate(rectOfText('1 Active Recall'));
await scrollBody(9999); await sleep(300);
await shot('profile-bottom');
geometry.profile.concierge = await evaluate(rectOfText('Concierge Support')); geometry.profile.startChat = await evaluate(rectOfText('Start Chat')); geometry.profile.activity = await evaluate(rectOfText('Recent Activity')); geometry.profile.danger = await evaluate(rectOfText('Danger Zone')); geometry.profile.delete = await evaluate(rectOfText('Delete Account'));
await scrollBody(0); await sleep(200);
await clickText('Biometric Login'); await sleep(400);
await shot('profile-toggle');
await clickText('Biometric Login'); await sleep(300);
await clickText('Membership'); await sleep(600);
await shot('membership');
geometry.membership = { caption: await evaluate(rectOfText('MEMBERSHIP')), title: await evaluate(rectOfText('Select your protection level')), standard: await evaluate(rectOfText('Standard')), price0: await evaluate(rectOfText('$0')), recommend: await evaluate(rectOfText('Recommend')), plusCta: await evaluate(rectOfText('Upgrade to Plus')) };
await scrollBody(9999, true); await sleep(300);
await shot('membership-bottom');
geometry.membership.proCurrent = await evaluate(rectOfText('Current plan')); geometry.membership.billed = await evaluate(rectOfText('Billed monthly. Cancel any time from this screen.'));
await clickPill('Upgrade to Plus'); await sleep(500);
await shot('membership-plus');
await clickIcon('ri-close-line'); await sleep(500);
await shot('profile-plus');
await clickText('Membership'); await sleep(500);
await scrollBody(9999, true); await sleep(300);
await clickText('Upgrade to Pro'); await sleep(300);
await clickIcon('ri-close-line'); await sleep(2500);

// ---------- CHAT ----------
await scrollBody(9999); await sleep(300);
await clickPill('Start Chat'); await sleep(900);
await shot('chat-typing');
geometry.chat = { title: await evaluate(rectOfText('Aegis Concierge')), status: await evaluate(rectOfText('Typing…')), replay: await evaluate(rectOfText('Replay')), avatar: await evaluate(rectOfIcon('ri-customer-service-2-fill')), send: await evaluate(rectOfIcon('ri-send-plane-fill')) };
await sleep(2400);
await shot('chat-2');
geometry.chat.bubble1 = await evaluate(rectOfText("Good afternoon, Alexander. I'm your Aegis concierge. I can see the open recall on your Model S Plaid — would you like me to handle it?"));
geometry.chat.bubble2 = await evaluate(rectOfText('Yes please. What does the repair actually involve?'));
await sleep(9000);
await shot('chat-full');
await evaluate(`(()=>{const i=document.querySelector('input[placeholder="Ask the concierge…"]');i.focus();return 1})()`);
await cdp.send('Input.insertText', { text: 'Can you send the driver details now?' });
await sleep(300);
await shot('chat-draft');
await clickIcon('ri-send-plane-fill'); await sleep(600);
await shot('chat-sent-typing');
await sleep(1500);
await shot('chat-sent');
await clickIcon('ri-close-line'); await sleep(500);

writeFileSync(`${OUT}/app-geometry.json`, JSON.stringify(geometry, null, 2));
console.log('done');
ws.close(); chrome.kill(); server.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold the dir */ }
process.exit(0);
