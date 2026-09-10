// scripts/emu-splash-shots.mjs — timed emulator captures of the Splash for docs/reference/emu-splash-<state>.png.
// For each timed state it taps REPLAY, sleeps ON THE DEVICE (so host latency does not skew the timing), then screencaps.
// Usage: node scripts/emu-splash-shots.mjs <replayX> <replayY> [state ...]   (tap point in device px; default = every timed state)
// The auth states are captured by hand (adb shell input tap/text) because their tap points depend on the keyboard.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SDK = process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const ADB = join(SDK, 'platform-tools', 'adb.exe');
const OUT = 'docs/reference';
mkdirSync(OUT, { recursive: true });

const [rx, ry, ...only] = process.argv.slice(2);
if (!rx || !ry) { console.error('usage: node scripts/emu-splash-shots.mjs <replayX> <replayY> [state ...]'); process.exit(1); }

// state → seconds after REPLAY (matches the design references in splash-geometry.json)
const STATES = { 'marquee-0s': 0.35, 'marquee-1s': 1.0, 'marquee-2s': 2.0, 'marquee-2.6s': 2.6, photo: 3.2, bubble: 4.6, fade: 6.8, 'auth-email': 8.3, 'replay-0.3s': 0.3 };
const wanted = only.length ? only : Object.keys(STATES);
const adb = (...args) => execFileSync(ADB, args, { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, MSYS_NO_PATHCONV: '1' } });

for (const state of wanted) {
  const delay = STATES[state];
  if (delay === undefined) { console.error('unknown state', state); continue; }
  // replay-0.3s must start from the auth screen: wait out a full run first
  if (state === 'replay-0.3s') { adb('shell', `input tap ${rx} ${ry}; sleep 8.5`); }
  const remote = `/sdcard/emu-splash-${state}.png`;
  adb('shell', `input tap ${rx} ${ry}; sleep ${delay}; screencap -p ${remote}`);
  adb('pull', remote, `${OUT}/emu-splash-${state}.png`);
  adb('shell', `rm ${remote}`);
  console.log(`emu-splash-${state}.png  (REPLAY + ${delay}s)`);
}
