// scripts/splash-refs.mjs — reference captures + DOM geometry of design/Splash.dc.html.
// Drives the locally installed Chrome over CDP (no npm Playwright, no Chromium download).
// Output: docs/reference/splash-<state>.png (430×932 @2x) and docs/reference/splash-geometry.json.
// Needs internet: the design loads fonts, Remixicon and React from CDNs.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4173;
const CDP_PORT = 9333;
const URL = `http://localhost:${PORT}/Splash.dc.html`;
const OUT = 'docs/reference';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- design server (scripts/serve-design.mjs) ---
const server = spawn(process.execPath, ['scripts/serve-design.mjs'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });

// --- Chrome ---
const profile = mkdtempSync(join(tmpdir(), 'splash-refs-'));
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
      if (m.id) {
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        if (!p) return;
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      } else this.listeners.forEach((l) => l(m));
    };
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id; this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method) { return new Promise((resolve) => this.listeners.push((m) => { if (m.method === method) resolve(m.params); })); }
}

const wsUrl = await targetUrl();
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
const cdp = new CDP(ws);

const evaluate = async (expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description));
  return r.result.value;
};
const shot = async (name) => {
  const before = await evaluate('performance.now()');
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const after = await evaluate('performance.now()');
  writeFileSync(`${OUT}/splash-${name}.png`, Buffer.from(data, 'base64'));
  return { before, after };
};
// React writes styles through the CSSOM, so style-attribute substring selectors are unreliable; match on element.style instead.
const R = '(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})';
const rect = (sel) => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?${R}(e):{missing:${JSON.stringify(sel)}}})()`;
const rectWhere = (pred, suffix = '') => `(()=>{const e=[...document.querySelectorAll('div')].find(e=>${pred})${suffix};return e?${R}(e):{missing:${JSON.stringify(pred)}}})()`;
const rectParentOf = (sel) => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?${R}(e.parentElement):{missing:${JSON.stringify(sel)}}})()`;
const rectOfText = (text) => `(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.textContent.trim()===${JSON.stringify(text)}){const r=n.parentElement.getBoundingClientRect();const cs=getComputedStyle(n.parentElement);return {x:r.x,y:r.y,w:r.width,h:r.height,lines:n.parentElement.getClientRects().length,font:cs.fontFamily,size:cs.fontSize,lh:cs.lineHeight,weight:cs.fontWeight,ls:cs.letterSpacing,color:cs.color}}}return null})()`;
const rectOfTextParent = (text) => `(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.textContent.trim()===${JSON.stringify(text)}){return ${R}(n.parentElement.parentElement)}}return null})()`;
// Word-break of a wrapped heading, measured on a clone in the same container (the original is left untouched).
const breaksOf = (text) => `(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.textContent.trim()===${JSON.stringify(text)}){const el=n.parentElement;const c=el.cloneNode(false);c.style.position='absolute';c.style.visibility='hidden';c.style.width=getComputedStyle(el).width;const words=${JSON.stringify(text)}.split(' ');c.innerHTML=words.map(x=>'<span>'+x+'</span>').join(' ');el.parentElement.appendChild(c);const tops=[...c.children].map(s=>s.offsetTop);c.remove();const lines=[];let cur=[];let last=tops[0];words.forEach((wd,i)=>{if(tops[i]!==last){lines.push(cur.join(' '));cur=[];last=tops[i]}cur.push(wd)});lines.push(cur.join(' '));return lines}}return null})()`;

await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: false });
const loaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.navigate', { url: URL });
await loaded;
await evaluate('document.fonts.ready.then(()=>1)');
for (let i = 0; i < 100 && !(await evaluate('!!document.querySelector(".ri-restart-line")')); i++) await sleep(100);
await evaluate(`Promise.all(['assets/crash-hero.jpg','assets/tile-1.jpg','assets/tile-2.jpg','assets/tile-3.jpg','assets/tile-4.jpg','assets/tile-5.jpg'].map(u=>new Promise(r=>{const i=new Image();i.onload=i.onerror=r;i.src=u})))`);
await sleep(1500);   // warm the HTTP cache (fonts, icons, tiles), then reload so the FIRST run of the timeline is captured clean

const geometry = {
  note: 'All values in CSS px of the 430×932 frame. Rects are {x,y,w,h}. Frames are seconds since the timeline started (the screenshot was taken between t_before and t_after). Captured on a REPLAY run (transitions snapped off for the restart) because the source runtime does not attach the row refs on its first run — on a fresh load the rows never scroll, only the wrap scales and blurs.',
  frames: {},
};

// --- reload (assets now cached), let the first run finish, then capture a clean REPLAY run ---
const reloaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.reload');
await reloaded;
// In the source runtime the row refs are only attached after the first run has re-rendered, so on the very first run the
// rows never scroll (only the wrap scales and blurs). Let the first run finish, snap every CSS transition off so the auth
// layer does not linger, tap REPLAY, then restore the transitions two frames later. The captured run is the scrolling
// marquee the code intends.
for (let i = 0; i < 100 && !(await evaluate('!!document.querySelector(".ri-restart-line")')); i++) await sleep(50);
await sleep(8600);
await evaluate("window.__tr=[...document.querySelectorAll('div')].map(d=>[d,d.style.transition]);window.__tr.forEach(([d])=>{d.style.transition='none'});1");
const t0 = await evaluate("(()=>{document.querySelector('.ri-restart-line').parentElement.click();const n=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__tr.forEach(([d,t])=>{d.style.transition=t})}));return n})()");
const at = async (sec) => { const now = await evaluate('performance.now()'); const wait = t0 + sec * 1000 - now; if (wait > 0) await sleep(wait); };
const stamp = (r) => ({ t_before: +((r.before - t0) / 1000).toFixed(3), t_after: +((r.after - t0) / 1000).toFixed(3) });

await at(0.35); geometry.frames['marquee-0s'] = stamp(await shot('marquee-0s'));
geometry.mark = { tile: await evaluate(rectParentOf('.ri-shield-check-fill')), icon: await evaluate(rect('.ri-shield-check-fill')), caption: await evaluate(rectOfText('RECALL HUB')) };
geometry.replay = { pill: await evaluate(rectParentOf('.ri-restart-line')), icon: await evaluate(rect('.ri-restart-line')), label: await evaluate(rectOfText('REPLAY')) };
geometry.marquee = await evaluate(`(()=>{const els=[...document.querySelectorAll('div[style*="will-change"]')];return els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,transform:e.style.transform,filter:e.style.filter,children:e.children.length}})})()`);
geometry.tile0 = await evaluate(rectWhere("e.style.width==='168px'"));
await at(1.0); geometry.frames['marquee-1s'] = stamp(await shot('marquee-1s'));
await at(2.0); geometry.frames['marquee-2s'] = stamp(await shot('marquee-2s'));
await at(2.6); geometry.frames['marquee-2.6s'] = stamp(await shot('marquee-2.6s'));
geometry.marqueeAt26 = await evaluate(`(()=>{const e=document.querySelector('div[style*="will-change"]');return {transform:e.style.transform,filter:e.style.filter}})()`);
await at(3.2); geometry.frames['photo'] = stamp(await shot('photo'));
await at(4.6); geometry.frames['bubble'] = stamp(await shot('bubble'));
geometry.bubble = {
  box: await evaluate(rectWhere("e.style.borderBottomLeftRadius==='9px'")),
  text: await evaluate(rectOfText('Did you f*cking check?')),
  highlight: await evaluate(rectWhere("e.style.borderBottomLeftRadius==='9px'", '.firstElementChild')),
};
await at(6.8); geometry.frames['fade'] = stamp(await shot('fade'));
await at(8.3); geometry.frames['auth-email'] = stamp(await shot('auth-email'));

// --- auth geometry, email step ---
geometry.auth = {};
geometry.auth.header = { tile: await evaluate(rectWhere("e.style.width==='26px'")), title: await evaluate(rectOfText('Recall Hub')) };
geometry.auth.email = {
  heading: await evaluate(rectOfText('Get started with Recall Hub')),
  headingBreaks: await evaluate(breaksOf('Get started with Recall Hub')),
  continueWith: await evaluate(rectOfText('Continue with')),
  google: await evaluate(rectOfText('Google')), googlePill: await evaluate(rectParentOf('svg[viewBox="0 0 64 64"]')), googleMark: await evaluate(rect('svg[viewBox="0 0 64 64"]')),
  apple: await evaluate(rectOfText('Apple')), applePill: await evaluate(rectParentOf('.ri-apple-fill')), appleIcon: await evaluate(rect('.ri-apple-fill')),
  or: await evaluate(rectOfText('OR')), orRow: await evaluate(rectOfTextParent('OR')),
  emailField: await evaluate(rect('#sp-em')), emailFieldBox: await evaluate(rectParentOf('#sp-em')),
  mailIcon: await evaluate(rect('.ri-mail-line')),
  footer: await evaluate(rectOfText('Sign in')), footerLine: await evaluate(rectOfTextParent('Sign in')),
};

// type an email → arrow appears
await evaluate(`document.getElementById('sp-em').focus()`);
await cdp.send('Input.insertText', { text: 'sam@recallhub.app' });
await sleep(400);
geometry.frames['auth-email-filled'] = stamp(await shot('auth-email-filled'));
geometry.auth.email.arrow = await evaluate(rect('[aria-label="Continue"]'));
geometry.auth.email.arrowIcon = await evaluate(rect('[aria-label="Continue"] > i'));

// → password step
await evaluate(`document.querySelector('[aria-label="Continue"]').click()`);
await sleep(800);
geometry.frames['auth-password'] = stamp(await shot('auth-password'));
geometry.auth.password = {
  heading: await evaluate(rectOfText('Create your password')),
  headingBreaks: await evaluate(breaksOf('Create your password')),
  sub: await evaluate(rectOfText('At least 6 characters. sam@recallhub.app')),
  emailField: await evaluate(rect('#sp-em')),
  pwField: await evaluate(rect('#sp-pw')), pwFieldBox: await evaluate(rectParentOf('#sp-pw')),
  eye: await evaluate(rect('[aria-label="Show password"]')), eyeIcon: await evaluate(rect('[aria-label="Show password"] > i')),
  goBack: await evaluate(rectOfText('Go back')), goBackIcon: await evaluate(rect('.ri-arrow-left-line')),
};
await evaluate(`document.getElementById('sp-pw').focus()`);
await cdp.send('Input.insertText', { text: 'hunter22' });
await sleep(400);
geometry.frames['auth-password-filled'] = stamp(await shot('auth-password-filled'));
await evaluate(`document.querySelector('[aria-label="Show password"]').click()`);
await sleep(300);
geometry.frames['auth-password-eye'] = stamp(await shot('auth-password-eye'));

// → confirm step
await evaluate(`document.querySelector('#sp-pw ~ [aria-label="Continue"]').click()`);
await sleep(800);
geometry.frames['auth-confirm'] = stamp(await shot('auth-confirm'));
geometry.auth.confirm = {
  heading: await evaluate(rectOfText('One last step')),
  sub: await evaluate(rectOfText('Confirm your password to continue')),
  cfField: await evaluate(rect('#sp-cf')), cfFieldBox: await evaluate(rectParentOf('#sp-cf')),
};
await evaluate(`document.getElementById('sp-cf').focus()`);
await cdp.send('Input.insertText', { text: 'hunter2x' });
await sleep(300);
await evaluate(`document.querySelector('[aria-label="Finish"]').click()`);
await sleep(400);
geometry.frames['auth-confirm-error'] = stamp(await shot('auth-confirm-error'));
geometry.auth.confirm.error = await evaluate(rectOfText('Passwords do not match.'));
geometry.auth.confirm.goBack = await evaluate(rectOfText('Go back'));

// --- REPLAY: the previous state cross-fades out while the marquee restarts (auth .8 s, photo .32 s, blobs .9 s) ---
{
  const r0 = await evaluate(`(()=>{document.querySelector('.ri-restart-line').parentElement.click();return performance.now()})()`);
  await sleep(300);
  const r = await shot('replay-0.3s');
  geometry.frames['replay-0.3s'] = { t_before: +((r.before - r0) / 1000).toFixed(3), t_after: +((r.after - r0) / 1000).toFixed(3), note: 'captured after tapping REPLAY on the auth screen — the auth layer is still fading out' };
}

writeFileSync(`${OUT}/splash-geometry.json`, JSON.stringify(geometry, null, 2));
console.log('wrote', Object.keys(geometry.frames).length, 'captures and splash-geometry.json');

ws.close();
chrome.kill();
server.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold the dir */ }
process.exit(0);
