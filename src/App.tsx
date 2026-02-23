import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import figlet from 'figlet';
import { FIGLET_FONT_NAMES, FEATURED_FONTS } from './assets/fonts';
import { CFONTS_NAMES } from './assets/cfonts-data';
import { renderCfonts, getCfontsDisplayName } from './cfonts-renderer';
import { BITMAP_STYLES, BITMAP_STYLE_NAMES, renderBitmap } from './bitmap-renderer';
import { FontCard } from './FontCard';

type FontModule = { default: string };
type LibraryFilter = 'all' | 'figlet' | 'cfonts' | 'bitmap';

function App() {
  const [text, setText] = useState('Hello');
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const loadedFontsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [debouncedText, setDebouncedText] = useState('Hello');

  // Debounce text input
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedText(text), 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [text]);

  // Pre-register all figlet font modules via Vite glob import (bundled at build time)
  const fontModules = import.meta.glob<FontModule>(
    '/node_modules/figlet/importable-fonts/*.js'
  );

  // Load all figlet fonts on mount
  useEffect(() => {
    let cancelled = false;
    const BATCH_SIZE = 20;

    async function loadFontBatch(batch: string[]) {
      const promises = batch.map(async (fontName) => {
        try {
          // Find the matching glob entry for this font
          const key = `/node_modules/figlet/importable-fonts/${fontName}.js`;
          const loader = fontModules[key];
          if (!loader) {
            console.warn(`Font module not found: ${fontName}`);
            return;
          }
          const module = await loader();
          figlet.parseFont(fontName, module.default);
          loadedFontsRef.current.add(fontName);
        } catch (e) {
          console.warn(`Failed to load font: ${fontName}`, e);
        }
      });
      await Promise.all(promises);
    }

    async function loadAllFonts() {
      // Load featured fonts first
      await loadFontBatch([...FEATURED_FONTS]);
      if (cancelled) return;
      setLoadedFonts(new Set(loadedFontsRef.current));
      setLoadingProgress(FEATURED_FONTS.length);

      // Load remaining figlet fonts in batches
      const remaining = FIGLET_FONT_NAMES.filter(
        f => !FEATURED_FONTS.includes(f as typeof FEATURED_FONTS[number])
      );
      for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = remaining.slice(i, i + BATCH_SIZE);
        await loadFontBatch(batch);
        if (cancelled) return;
        setLoadedFonts(new Set(loadedFontsRef.current));
        setLoadingProgress(FEATURED_FONTS.length + i + batch.length);
      }
      setIsLoading(false);
    }

    loadAllFonts();
    return () => { cancelled = true; };
  }, []);

  // Render function for figlet
  const renderFiglet = useCallback((inputText: string, font: string): string | null => {
    if (!loadedFontsRef.current.has(font)) return null;
    try {
      return figlet.textSync(inputText, { font: font as string });
    } catch {
      return null;
    }
  }, []);

  // Render function for cfonts
  const renderCfontsFont = useCallback((inputText: string, font: string): string | null => {
    return renderCfonts(inputText, font as typeof CFONTS_NAMES[number]);
  }, []);

  // Render function for bitmap
  const renderBitmapFont = useCallback((inputText: string, style: string): string | null => {
    return renderBitmap(inputText, style);
  }, []);

  // Combined font list with source info
  type FontEntry = { name: string; renderKey: string; source: 'figlet' | 'cfonts' | 'bitmap'; featured: boolean; displayName: string };

  const displayedFonts = useMemo<FontEntry[]>(() => {
    let entries: FontEntry[] = [];

    // Add figlet fonts
    if (libraryFilter === 'all' || libraryFilter === 'figlet') {
      const loadedArr = Array.from(loadedFonts);
      entries.push(...loadedArr.map(name => ({
        name,
        renderKey: name,
        source: 'figlet' as const,
        featured: FEATURED_FONTS.includes(name as typeof FEATURED_FONTS[number]),
        displayName: name,
      })));
    }

    // Add cfonts fonts (always available, no loading needed)
    if (libraryFilter === 'all' || libraryFilter === 'cfonts') {
      entries.push(...CFONTS_NAMES.map(name => ({
        name,
        renderKey: name,
        source: 'cfonts' as const,
        featured: false,
        displayName: getCfontsDisplayName(name),
      })));
    }

    // Add bitmap styles (always available)
    if (libraryFilter === 'all' || libraryFilter === 'bitmap') {
      entries.push(...BITMAP_STYLES.map(s => ({
        name: s.name,
        renderKey: s.name,
        source: 'bitmap' as const,
        featured: false,
        displayName: s.displayName,
      })));
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e => e.displayName.toLowerCase().includes(q) || e.source.includes(q));
    }

    // Sort: featured first, then alphabetical
    entries.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      // Group cfonts together at the end if showing all
      if (libraryFilter === 'all') {
        if (a.source !== b.source) return a.source === 'figlet' ? -1 : 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return entries;
  }, [loadedFonts, search, libraryFilter]);

  const totalFiglet = FIGLET_FONT_NAMES.length;
  const totalCfonts = CFONTS_NAMES.length;
  const totalBitmap = BITMAP_STYLE_NAMES.length;
  const totalFonts = totalFiglet + totalCfonts + totalBitmap;
  const progressPercent = Math.round((loadingProgress / totalFiglet) * 100);

  const filterButtons: { key: LibraryFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalFonts },
    { key: 'figlet', label: 'FIGlet', count: totalFiglet },
    { key: 'cfonts', label: 'cfonts', count: totalCfonts },
    { key: 'bitmap', label: 'Bitmap', count: totalBitmap },
  ];

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/75 backdrop-blur-xl saturate-150
                         border-b border-white/[0.06] px-4 md:px-6">
        <div className="flex items-center gap-4 h-16 max-w-[2000px] mx-auto">
          {/* Logo — cfonts tiny style */}
          <div className="shrink-0 hidden md:block">
            <pre className="font-mono text-[11px] leading-[1.2] tracking-normal
                          text-white
                          select-none m-0"
            >{`▀█▀ █▀▀ ▀▄▀ ▀█▀   ▄▀█ █▀█ ▀█▀\n █  ██▄ █ █  █    █▀█ █▀▄  █`}</pre>
          </div>
          {/* Mobile fallback */}
          <span className="md:hidden text-lg font-bold tracking-tight
                         bg-gradient-to-r from-indigo-300 to-indigo-500 bg-clip-text text-transparent
                         whitespace-nowrap shrink-0">
            ✦ Text Art
          </span>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {/* Text input */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">✎</span>
              <input
                type="text"
                placeholder="Type your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-lg
                          text-gray-200 text-sm outline-none
                          focus:border-indigo-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/20
                          placeholder:text-gray-600 transition-all duration-200"
              />
            </div>
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">⌕</span>
              <input
                type="text"
                placeholder="Search fonts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                spellCheck={false}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-lg
                          text-gray-200 text-sm outline-none
                          focus:border-indigo-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/20
                          placeholder:text-gray-600 transition-all duration-200"
              />
            </div>
          </div>

          {/* Library Filter Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1 shrink-0">
            {filterButtons.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setLibraryFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
                  ${libraryFilter === key
                    ? 'bg-indigo-500/25 text-indigo-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
              >
                {label}
                <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 text-sm text-gray-500 whitespace-nowrap">
            <span className="text-indigo-300 font-semibold">{displayedFonts.length}</span>
            <span>of {totalFonts} fonts</span>
            {isLoading && <span className="text-xs">({progressPercent}%)</span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-6 py-6">
        <div className="max-w-[2000px] mx-auto">
        {loadedFonts.size === 0 && libraryFilter !== 'cfonts' ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
            <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500
                           rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading {totalFiglet} FIGlet fonts...</p>
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : displayedFonts.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 text-gray-600">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg">No fonts match "{search}"</p>
          </div>
        ) : (
          /* Font Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
            {displayedFonts.map((entry, i) => (
              <FontCard
                key={`${entry.source}-${entry.name}`}
                fontName={entry.displayName}
                renderKey={entry.renderKey}
                text={debouncedText || 'Hello'}
                renderFn={entry.source === 'figlet' ? renderFiglet : entry.source === 'cfonts' ? renderCfontsFont : renderBitmapFont}
                featured={entry.featured}
                source={entry.source}
                animationDelay={Math.min(i * 15, 300)}
              />
            ))}
          </div>
        )}
        </div>
      </main>
    </>
  );
}

export default App;
