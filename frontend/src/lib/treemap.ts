function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace("#", "");
  if (hex.length === 3) {
    return [
      Number.parseInt(hex[0] + hex[0], 16),
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

/** WCAG relative luminance for hex colors. */
export function relativeLuminance(value: string): number {
  const rgb = parseHex(value);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick a readable label color for a treemap cell fill. */
export function treemapTextColor(fill: string): "#ffffff" | "#101014" {
  return relativeLuminance(fill) > 0.46 ? "#101014" : "#ffffff";
}

export interface TreemapLabelLayout {
  showLabel: boolean;
  showSprite: boolean;
  showPercent: boolean;
}

/** Hide labels that would be clipped instead of drawing tiny unreadable text. */
export function treemapLabelLayout(
  width: number,
  height: number,
  hasSprite: boolean,
): TreemapLabelLayout {
  return {
    showLabel: width >= 52 && height >= 26,
    showSprite: hasSprite && width >= 76 && height >= 48,
    showPercent: width >= 58 && height >= 44,
  };
}
