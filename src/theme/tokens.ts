import { Easing } from 'react-native-reanimated';

export const color = {
  blue: '#0CB8E9', blueDeep: '#0F638F', blueInk: '#0B4E73',
  red: '#D0021B', amber: '#c98a1f', amberBright: '#ffb741', teal: '#01a08c',
  ink: '#17161A', ink2: '#3a3941', ink3: '#57565e', ink4: '#63626a', ink5: '#6b6a72', ink7: '#9a99a2',
  bar: '#17181A', surface: '#FFFFFF', sunken: '#F2F1EE', sunken2: '#EDECE8', input: '#F7F6F4',
  disabled: '#E7E6E3', disabledInk: '#9a99a2', handle: '#dcdbd8', shellDark: '#232228', splash: '#08080A',
  textOnDark: '#F4F3F5',
  hair: 'rgba(0,0,0,0.09)', hair08: 'rgba(0,0,0,0.08)', hair07: 'rgba(0,0,0,0.07)', hair13: 'rgba(0,0,0,0.13)',
  hair14: 'rgba(0,0,0,0.14)', tint02: 'rgba(0,0,0,0.02)', tint05: 'rgba(0,0,0,0.05)',
  scrim: 'rgba(23,22,26,0.28)',
  // Slice 2 — Splash.dc.html
  tileA: '#111116', tileB: '#0C0C10', tilePhoto: '#0E0E12', markInk: '#08222E', authBlueInk: '#04222C', authError: '#FF8A94', warning: '#E8A317',
  // Slice 3 — app tabs
  infoBg: '#E7F1F7', dangerBg: '#FBE9EB', dangerEdge: '#F0B9C0', dangerInk: '#7a5257',
  warnBadgeBg: '#FBE9CB', warnBadgeInk: '#7A5307', ink8: '#a3a2aa',
  hair10: 'rgba(0,0,0,0.10)', hair12: 'rgba(0,0,0,0.12)', hair20: 'rgba(0,0,0,0.20)', tint06: 'rgba(0,0,0,0.06)',
  chatTop: '#18181B', chatBottom: '#09090B', chatBubble: 'rgba(39,39,42,0.9)', chatField: 'rgba(39,39,42,0.5)',
  chatEdge: 'rgba(255,255,255,0.10)', chatHair: 'rgba(255,255,255,0.06)', chatDim: 'rgba(255,255,255,0.42)',
  chatMuted: 'rgba(255,255,255,0.6)', chatSendOff: 'rgba(255,255,255,0.3)', chatPlaceholder: 'rgba(255,255,255,0.45)', chatInk: '#F4F4F5',
  mapInk: 'rgba(23,22,26,0.25)', mapInk2: 'rgba(23,22,26,0.20)', mapInk3: 'rgba(23,22,26,0.10)', mapTint: 'rgba(23,22,26,0.05)',
  pinHalo: 'rgba(15,99,143,0.45)', doneRing: 'rgba(15,99,143,0.28)', doneGlow: 'rgba(15,99,143,0.14)',
} as const;

export const font = {
  sans300: 'Geist_300Light', sans400: 'Geist_400Regular', sans500: 'Geist_500Medium', sans600: 'Geist_600SemiBold',
  mono400: 'GeistMono_400Regular', mono500: 'GeistMono_500Medium',
  serif400: 'InstrumentSerif_400Regular',
} as const;

export const ease = {
  standard: [0.2, 0.8, 0.2, 1], hump: [0.2, 0.9, 0.2, 1], sheet: [0.2, 0.85, 0.2, 1],
  gauge: [0.43, 0.13, 0.23, 0.96], press: [0.4, 0, 0.2, 1], cssEaseOut: [0, 0, 0.58, 1],
  // Slice 2 — CSS `ease`, `ease-in-out`, and the bubble pop's cubic-bezier(.2,.9,.25,1)
  css: [0.25, 0.1, 0.25, 1], inOut: [0.42, 0, 0.58, 1], bubble: [0.2, 0.9, 0.25, 1],
  // Slice 3 — cubic-bezier(.22,1,.36,1) (article swipe, chat bubbles)
  swipe: [0.22, 1, 0.36, 1],
} as const;
export const bez = (e: readonly [number, number, number, number]) => Easing.bezier(e[0], e[1], e[2], e[3]);

export const dur = {
  press: 150, fade: 200, dim: 250, sheet: 280, color: 300, screen: 340, health: 500, hump: 550, bar: 800,
  gauge: 1400, toast: 2200, metalIdle: 7000, metalPressed: 2333, blob: 5000, ripple: 600,
  // Slice 3
  swipe: 360, snap: 300, leave: 380, toggle: 220, tilt: 120, strip: 500, bubbleIn: 350, dotBob: 800, hubAuto: 5000, shine: 4000, filter: 200, map: 350, chatReply: 1400,
} as const;

export const blur = { face: 55, scrim: 7 } as const;   // tuned in Task 22

export const layout = { card: 318, railGap: 14, humpW: 61, humpH: 13.7, bezelBaked: 768, blobBaked: 210, blobBleed: 48, shineBaked: 1024 } as const;
