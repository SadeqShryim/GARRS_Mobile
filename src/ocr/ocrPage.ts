// The OCR page: one self-contained HTML document that runs tesseract.js inside the hidden WebView (spec §7).
// Hermes has no WebAssembly and no Web Workers, so the engine lives in the WebView's Chromium/WebKit instead.
//
// Two shape constraints on this file:
//  - the page is assembled from an array of lines joined with '\n', so nothing inside it can collide with a TS
//    template literal (no backticks, no dollar-brace), and the page source stays readable line by line;
//  - the page script is ES5-flavoured (var, function, .then) because it is parsed by the WebView, not by Metro.
//
// Message protocol (page -> app, every message JSON-stringified through window.ReactNativeWebView.postMessage):
//   { type: 'ready' }                                     the worker is created and parameterised
//   { type: 'progress', status, progress }                 forwarded from the tesseract logger, progress 0-1
//   { type: 'result', id, text, symbols: [{ t, c }], ms }  one recognise finished
//   { type: 'error', id?, message }                        id present -> that request failed; absent -> the engine did
// app -> page (via injectJavaScript): window.__ocr.recognize(id, 'data:image/jpeg;base64,...')

export const TESSERACT_JS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
export const TESSERACT_WORKER_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js';
// Single-file core build: the wasm is embedded, so the blob worker can pull it in with one importScripts.
export const TESSERACT_CORE_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js';
// best-int 'eng' (3 MB) — same reads as the 11 MB default across all 16 lab plates (spec §3).
export const TESSERACT_LANG_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int';
// VIN alphabet: no I, O or Q. Same string as VIN_CHARS in src/lib/vin.ts (kept local so this file has no imports).
export const VIN_WHITELIST = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

const q = (s: string) => JSON.stringify(s);

const LINES: string[] = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />',
  '<title>ocr</title>',
  '</head>',
  '<body style="margin:0;background:#171619">',

  // 1. Bootstrap. Runs before tesseract exists: defines the protocol helpers, the recognise queue and window.__ocr,
  //    so a recognise injected while the model is still downloading is held rather than lost.
  '<script>',
  '(function () {',
  '  var WORKER_PATH = ' + q(TESSERACT_WORKER_URL) + ';',
  '  var CORE_PATH = ' + q(TESSERACT_CORE_URL) + ';',
  '  var LANG_PATH = ' + q(TESSERACT_LANG_PATH) + ';',
  '  var WHITELIST = ' + q(VIN_WHITELIST) + ';',
  '  var worker = null;      // set once createWorker + setParameters resolve',
  '  var queued = null;      // at most one { id, dataUrl } waiting for the worker',
  '  var broken = false;     // the CDN script failed to load, or the worker never came up',
  '  function post(m) {',
  '    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {',
  '      window.ReactNativeWebView.postMessage(JSON.stringify(m));',
  '    }',
  '  }',
  '  function fail(id, message) {',
  '    var m = { type: "error", message: message };',
  '    if (typeof id === "number") { m.id = id; }',
  '    post(m);',
  '  }',
  '  function reason(e, dflt) { return (e && e.message) ? String(e.message) : dflt; }',
  '  function symbolsOf(data) {',
  '    var out = [];',
  '    var blocks = (data && data.blocks) || [];',
  '    for (var b = 0; b < blocks.length; b++) {',
  '      var paras = blocks[b].paragraphs || [];',
  '      for (var p = 0; p < paras.length; p++) {',
  '        var lines = paras[p].lines || [];',
  '        for (var l = 0; l < lines.length; l++) {',
  '          var words = lines[l].words || [];',
  '          for (var w = 0; w < words.length; w++) {',
  '            var syms = words[w].symbols || [];',
  '            for (var s = 0; s < syms.length; s++) {',
  '              out.push({ t: syms[s].text, c: syms[s].confidence });',
  '            }',
  '          }',
  '        }',
  '      }',
  '    }',
  '    return out;',
  '  }',
  '  function run(id, dataUrl) {',
  '    var t0 = Date.now();',
  '    worker.recognize(dataUrl, {}, { text: true, blocks: true }).then(function (r) {',
  '      var d = (r && r.data) || {};',
  '      post({ type: "result", id: id, text: d.text || "", symbols: symbolsOf(d), ms: Date.now() - t0 });',
  '    })["catch"](function (e) { fail(id, reason(e, "recognize")); });',
  '  }',
  '  window.__ocr = {',
  '    recognize: function (id, dataUrl) {',
  '      try {',
  '        if (broken) { fail(id, "engine"); return; }',
  '        if (!worker) {',
  '          if (queued) { fail(queued.id, "superseded"); }',
  '          queued = { id: id, dataUrl: dataUrl };',
  '          return;',
  '        }',
  '        run(id, dataUrl);',
  '      } catch (e) { fail(id, reason(e, "recognize")); }',
  '    }',
  '  };',
  '  window.__ocrLoadError = function () {',
  '    if (broken) { return; }',
  '    broken = true;',
  '    fail(null, "load");',
  '    if (queued) { var pend = queued; queued = null; fail(pend.id, "load"); }',
  '  };',
  '  window.__ocrBoot = function () {',
  '    if (broken) { return; }',
  '    if (typeof Tesseract === "undefined") { window.__ocrLoadError(); return; }',
  '    try {',
  '      Tesseract.createWorker("eng", 1, {',
  '        workerPath: WORKER_PATH,',
  '        corePath: CORE_PATH,',
  '        langPath: LANG_PATH,',
  '        workerBlobURL: true,',
  '        logger: function (m) { post({ type: "progress", status: m && m.status, progress: m && m.progress }); }',
  '      }).then(function (w) {',
  '        return w.setParameters({ tessedit_char_whitelist: WHITELIST, tessedit_pageseg_mode: "7" }).then(function () {',
  '          worker = w;',
  '          post({ type: "ready" });',
  '          if (queued) { var pend = queued; queued = null; run(pend.id, pend.dataUrl); }',
  '        });',
  '      })["catch"](function (e) { broken = true; fail(null, reason(e, "worker")); });',
  '    } catch (e) { broken = true; fail(null, reason(e, "worker")); }',
  '  };',
  '}());',
  '</script>',

  // 2. The engine itself. Classic scripts execute in order, so the boot call below runs after this one resolves —
  //    or, when the CDN is unreachable, right after onerror has already flagged the page as broken.
  '<script src="' + TESSERACT_JS_URL + '" onerror="window.__ocrLoadError()"></script>',
  '<script>window.__ocrBoot();</script>',
  '</body>',
  '</html>',
];

export const OCR_PAGE: string = LINES.join('\n');
