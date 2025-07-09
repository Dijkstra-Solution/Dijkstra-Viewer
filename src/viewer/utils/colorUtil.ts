export function HexToRGB(hex: string) {
  if (hex.startsWith('#')) {
    hex = hex.slice(1)
  }
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return { r: r, g: g, b: b }
}

export function HexToRGBNormalized(hex: string) {
  const rgb = HexToRGB(hex)
  return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 }
}
