import { z } from 'zod'

/** RGB component values (0–255 each) */
const ColorSchema = z.object({
  b: z.number(),
  g: z.number(),
  r: z.number()
})

/** Fixed background and text colors for dark/light theme modes */
export const ColorwayPrimarySchema = z.object({
  dark: z.object({
    background: z.literal('rgb(26, 22, 28)'),
    text: z.literal('rgb(241, 241, 255)')
  }),
  light: z.object({
    background: z.literal('rgb(240, 230, 243)'),
    text: z.literal('rgb(20, 40, 60)')
  })
})

/** Eight named accent slots used for chain and account color theming */
export const ColorwayPaletteSchema = z.object({
  accent1: ColorSchema,
  accent2: ColorSchema,
  accent3: ColorSchema,
  accent4: ColorSchema,
  accent5: ColorSchema,
  accent6: ColorSchema,
  accent7: ColorSchema,
  accent8: ColorSchema
})

export type ColorwayPalette = z.infer<typeof ColorwayPaletteSchema>

/** Type guard — narrows unknown to ColorwayPalette */
export function validateColorwayPalette(obj: unknown): obj is ColorwayPalette {
  return ColorwayPaletteSchema.safeParse(obj).success
}
