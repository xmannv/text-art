/**
 * BitmapIt renderer — creates various bitmap text art styles.
 * Uses the BitmapFontGenerator from bitmapit with different character sets
 * to create multiple unique "fonts" from the same bitmap data.
 */
import { defaultFont, BitmapFontGenerator } from 'bitmapit';

/**
 * Bitmap font style definitions — same base font, different rendering characters.
 * This creates visually distinct styles from a single bitmap font.
 */
export const BITMAP_STYLES = [
  { name: 'bitmap-block',     displayName: 'Bitmap Block',     onChar: '█', offChar: ' ' },
  { name: 'bitmap-hash',      displayName: 'Bitmap Hash',      onChar: '#', offChar: ' ' },
  { name: 'bitmap-dot',       displayName: 'Bitmap Dot',       onChar: '●', offChar: '·' },
  { name: 'bitmap-star',      displayName: 'Bitmap Star',      onChar: '★', offChar: '·' },
  { name: 'bitmap-at',        displayName: 'Bitmap @',         onChar: '@', offChar: ' ' },
  { name: 'bitmap-slash',     displayName: 'Bitmap Slash',     onChar: '/', offChar: ' ' },
  { name: 'bitmap-zero-one',  displayName: 'Bitmap Binary',    onChar: '1', offChar: '0' },
  { name: 'bitmap-braille',   displayName: 'Bitmap Braille',   onChar: '⣿', offChar: '⠀' },
  { name: 'bitmap-shade',     displayName: 'Bitmap Shade',     onChar: '░', offChar: ' ' },
  { name: 'bitmap-cross',     displayName: 'Bitmap Cross',     onChar: '╬', offChar: ' ' },
] as const;

export type BitmapStyleName = typeof BITMAP_STYLES[number]['name'];

export const BITMAP_STYLE_NAMES = BITMAP_STYLES.map(s => s.name);

// Create a singleton generator instance with default font loaded
let generator: BitmapFontGenerator | null = null;

function getGenerator(): BitmapFontGenerator {
  if (!generator) {
    generator = new BitmapFontGenerator({ width: 8, height: 8, spacing: 1 });
    // Load all characters from the default font
    for (const [char, pattern] of Object.entries(defaultFont)) {
      generator.defineCharacter(char, pattern as boolean[][]);
    }
  }
  return generator;
}

/**
 * Render text using a bitmap style.
 */
export function renderBitmap(text: string, styleName: string): string | null {
  const style = BITMAP_STYLES.find(s => s.name === styleName);
  if (!style) return null;

  try {
    const gen = getGenerator();
    const bitmap = gen.generateText(text);
    if (!bitmap || bitmap.length === 0) return null;

    const result = gen.toAscii(bitmap, {
      on: style.onChar,
      off: style.offChar,
    });
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Get display name for a bitmap style.
 */
export function getBitmapDisplayName(styleName: string): string {
  const style = BITMAP_STYLES.find(s => s.name === styleName);
  return style?.displayName || styleName;
}
