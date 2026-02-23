declare module 'bitmapit' {
  export const defaultFont: Record<string, boolean[][]>;

  export class BitmapFontGenerator {
    constructor(options?: {
      width?: number;
      height?: number;
      spacing?: number;
      onChar?: string;
      offChar?: string;
      color?: string;
      backgroundColor?: string;
    });
    defineCharacter(char: string, pattern: boolean[][]): void;
    generateText(text: string): boolean[][];
    toAscii(bitmap: boolean[][], options?: { on?: string; off?: string }): string;
    toHtml(bitmap: boolean[][], options?: { on?: string; off?: string; color?: string; backgroundColor?: string }): string;
    setDimensions(width: number, height: number): void;
    setSpacing(spacing: number): void;
    createText(text: string, options?: { html?: boolean; on?: string; off?: string }): string;
  }
}
