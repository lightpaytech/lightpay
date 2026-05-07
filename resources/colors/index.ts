import { padToEven } from '@ethereumjs/util'

import type { ColorwayPalette } from '../../main/store/state'

// VAULT Design System — LightPay color palette
// Primary: Emerald #10b981 | Background: Deep Navy #060d17
const light: ColorwayPalette = {
  accent1: { r: 5,   g: 150, b: 105 },  // Mainnet   — Emerald-600
  accent2: { r: 234, g: 88,  b: 12  },  // Testnets  — Orange-600
  accent3: { r: 192, g: 38,  b: 211 },  // Default   — Fuchsia-600
  accent4: { r: 220, g: 38,  b: 38  },  // Optimism  — Rose-600
  accent5: { r: 6,   g: 182, b: 212 },  // Gnosis    — Cyan-500
  accent6: { r: 124, g: 58,  b: 237 },  // Polygon   — Violet-600
  accent7: { r: 14,  g: 165, b: 233 },  // Arbitrum  — Sky-500
  accent8: { r: 79,  g: 70,  b: 229 },  // Other     — Indigo-600
}

const dark: ColorwayPalette = {
  accent1: { r: 16,  g: 185, b: 129 },  // Mainnet   — Emerald-500
  accent2: { r: 251, g: 146, b: 60  },  // Testnets  — Orange-400
  accent3: { r: 232, g: 121, b: 249 },  // Default   — Fuchsia-400
  accent4: { r: 244, g: 63,  b: 94  },  // Optimism  — Rose-500
  accent5: { r: 34,  g: 211, b: 238 },  // Gnosis    — Cyan-400
  accent6: { r: 167, g: 139, b: 250 },  // Polygon   — Violet-400
  accent7: { r: 56,  g: 189, b: 248 },  // Arbitrum  — Sky-400
  accent8: { r: 99,  g: 102, b: 241 },  // Other     — Indigo-500
}

const colorways: Record<Colorway, ColorwayPalette> = { light, dark }

function toHex(color: number) {
  return padToEven(color.toString(16))
}

export function getColor(key: keyof ColorwayPalette, colorway: Colorway) {
  const palette = colorways[colorway] || colorways[Colorway.light]
  const color = palette[key] || palette.accent1
  return { ...color, hex: `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}` }
}

export enum Colorway {
  light = 'light',
  dark = 'dark'
}

export { light as LIGHT, dark as DARK }
