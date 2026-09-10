// scripts/emu-app-shots.mjs — drive the booted emulator through a list of steps and save screenshots as
// docs/reference/emu-app-<name>.png. Steps are CLI arguments, one per step:
//   "tap X Y"                 adb shell input tap (device px)
//   "swipe X1 Y1 X2 Y2 [ms]"  adb shell input swipe
//   "back"                    hardware back
//   "text STRING"             adb shell input text (spaces become %s)
//   "enter"                   keyevent 66
//   "sleep MS"                wait
//   "shot NAME"               screencap → docs/reference/emu-app-NAME.png
// Example: node scripts/emu-app-shots.mjs "tap 324 2336" "sleep 800" "shot recalls-open"
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const ADB = process.env.ADB ?? `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const OUT = 'docs/reference';
mkdirSync(OUT, { recursive: true });
const sh = (...args) => execFileSync(ADB, ['shell', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const step of process.argv.slice(2)) {
  const [cmd, ...rest] = step.trim().split(/\s+/);
  switch (cmd) {
    case 'tap': sh('input', 'tap', rest[0], rest[1]); break;
    case 'swipe': sh('input', 'swipe', rest[0], rest[1], rest[2], rest[3], rest[4] ?? '300'); break;
    case 'back': sh('input', 'keyevent', '4'); break;
    case 'enter': sh('input', 'keyevent', '66'); break;
    case 'text': sh('input', 'text', rest.join('%s')); break;
    case 'sleep': await sleep(Number(rest[0])); break;
    case 'shot': {
      const png = execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
      writeFileSync(`${OUT}/emu-app-${rest[0]}.png`, png);
      console.log('shot', rest[0]);
      break;
    }
    default: throw new Error('unknown step: ' + step);
  }
}
