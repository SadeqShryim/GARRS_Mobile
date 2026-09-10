// Verbatim from design/Splash.dc.html — the script constants (TILES, GLYPHS) and every copy string in the template.
export const TILES = [
  require('../assets/images/tile-1.jpg'),
  require('../assets/images/tile-2.jpg'),
  require('../assets/images/tile-3.jpg'),
  require('../assets/images/tile-4.jpg'),
  require('../assets/images/tile-5.jpg'),
] as const;
export const HERO = require('../assets/images/crash-hero.jpg');
export const HERO_SIZE = { width: 720, height: 1542 } as const;

export const GLYPHS: readonly (readonly [string, string])[] = [
  ['alarm-warning-fill', '#D0021B'], ['oil-fill', '#D0021B'],
  ['temp-hot-fill', '#E8A317'], ['battery-2-charge-fill', '#D0021B'],
  ['steering-2-fill', '#E8A317'], ['shield-flash-fill', '#D0021B'],
  ['error-warning-fill', '#E8A317'], ['drop-fill', '#E8A317'],
  ['car-fill', '#D0021B'], ['disc-line', '#E8A317'],
  ['fire-fill', '#D0021B'], ['lightbulb-flash-fill', '#E8A317'],
];

export const COPY = {
  mark: 'RECALL HUB',
  replay: 'REPLAY',
  bubble: 'Did you f*cking check?',
  brand: 'Recall Hub',
  // Source: 'Get started with Recall Hub' with text-wrap: balance — breaks after "started" at 430 (splash-geometry.json).
  emailTitle: 'Get started\nwith Recall Hub',
  continueWith: 'Continue with',
  google: 'Google',
  apple: 'Apple',
  or: 'OR',
  emailPlaceholder: 'Email',
  pwTitle: 'Create your password',
  pwSub: 'At least 6 characters. ',
  pwPlaceholder: 'Password',
  cfTitle: 'One last step',
  cfSub: 'Confirm your password to continue',
  cfPlaceholder: 'Confirm password',
  error: 'Passwords do not match.',
  back: 'Go back',
  footer: 'Already have an account? ',
  signIn: 'Sign in',
} as const;
