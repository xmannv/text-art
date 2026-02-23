/**
 * Lightweight browser-compatible cfonts renderer.
 * Renders text using pre-bundled cfonts font data (extracted at build time).
 * No Node.js dependencies — pure TypeScript.
 */
import { CFONTS_DATA, type CfontName } from './assets/cfonts-data';

interface CfontsFont {
  chars: Record<string, string[]>;
  lines: number;
  buffer: string[];
  letterspace: string[];
  letterspace_size: number;
  colors: number;
}

/**
 * Strip cfonts color placeholder tags like <c1>, </c1>, <c2>, </c2>, etc.
 */
function stripColorTags(str: string): string {
  return str.replace(/<\/?c\d+>/g, '');
}

/**
 * Render text using a cfonts font.
 * Returns plain text output (no ANSI/HTML — just characters).
 */
export function renderCfonts(text: string, fontName: CfontName): string | null {
  const font = CFONTS_DATA[fontName] as CfontsFont | undefined;
  if (!font) return null;

  const { chars, lines: lineCount, letterspace } = font;
  const input = text.toUpperCase();

  // Build output line by line
  const outputLines: string[] = Array.from({ length: lineCount }, () => '');

  for (let charIdx = 0; charIdx < input.length; charIdx++) {
    const ch = input[charIdx];
    const charData = chars[ch];

    if (!charData) {
      // Space or unsupported character — add spacing
      for (let line = 0; line < lineCount; line++) {
        const spacing = letterspace ? stripColorTags(letterspace[line] || '  ') : '  ';
        outputLines[line] += spacing;
      }
      continue;
    }

    for (let line = 0; line < lineCount; line++) {
      const lineStr = charData[line] || '';
      outputLines[line] += stripColorTags(lineStr);
    }

    // Add letter spacing between characters (not after last)
    if (charIdx < input.length - 1 && letterspace) {
      for (let line = 0; line < lineCount; line++) {
        outputLines[line] += stripColorTags(letterspace[line] || '');
      }
    }
  }

  // Trim trailing whitespace from each line
  const result = outputLines.map(line => line.replace(/\s+$/, '')).join('\n');
  return result || null;
}

/**
 * Get display name for a cfonts font (prettified).
 */
export function getCfontsDisplayName(fontName: CfontName): string {
  const names: Record<string, string> = {
    '3d': '3D',
    'block': 'Block',
    'chrome': 'Chrome',
    'console': 'Console',
    'grid': 'Grid',
    'huge': 'Huge',
    'pallet': 'Pallet',
    'shade': 'Shade',
    'simple': 'Simple',
    'simple3d': 'Simple 3D',
    'simpleBlock': 'Simple Block',
    'slick': 'Slick',
    'tiny': 'Tiny',
  };
  return names[fontName] || fontName;
}
