import { useState, useRef, useCallback, useEffect, memo } from 'react';

interface FontCardProps {
  fontName: string;
  renderKey: string;
  text: string;
  renderFn: (text: string, font: string) => string | null;
  featured?: boolean;
  source: 'figlet' | 'cfonts' | 'bitmap';
  animationDelay?: number;
}

export const FontCard = memo(function FontCard({
  fontName,
  renderKey,
  text,
  renderFn,
  featured,
  source,
  animationDelay = 0,
}: FontCardProps) {
  const [copied, setCopied] = useState(false);
  const [rendered, setRendered] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy rendering
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render when visible or text changes
  useEffect(() => {
    if (!isVisible) return;
    try {
      const result = renderFn(text, renderKey);
      setRendered(result);
      setError(false);
    } catch {
      setRendered(null);
      setError(true);
    }
  }, [isVisible, text, fontName, renderFn]);

  const handleCopy = useCallback(() => {
    if (!rendered) return;
    navigator.clipboard.writeText(rendered).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rendered]);

  return (
    <div
      ref={cardRef}
      className="group rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm
                 shadow-lg shadow-black/20 hover:border-indigo-500/30 hover:bg-white/[0.06]
                 hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden
                 animate-[fadeInUp_0.4s_ease_forwards] opacity-0"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-400 truncate">{fontName}</span>
          {featured && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                           bg-indigo-500/15 border border-indigo-500/25 rounded text-indigo-300">
              ★ Featured
            </span>
          )}
          <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded
            ${source === 'cfonts'
              ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300'
              : source === 'bitmap'
              ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
              : 'bg-sky-500/10 border border-sky-500/20 text-sky-400/70'
            }`}>
            {source === 'cfonts' ? 'cfonts' : source === 'bitmap' ? 'Bitmap' : 'FIGlet'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                     transition-all duration-200 cursor-pointer border
                     ${copied
                       ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                       : 'bg-white/5 border-white/[0.08] text-gray-400 hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-indigo-300'
                     }`}
        >
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>

      {/* Preview */}
      <div className="px-4 py-3 overflow-x-auto overflow-y-hidden
                      [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
        {!isVisible ? (
          <span className="text-gray-600 font-mono text-xs italic">Loading...</span>
        ) : error ? (
          <span className="text-red-400/60 font-mono text-[11px] italic">Could not render with this font</span>
        ) : rendered ? (
          <pre className="font-mono text-xs leading-tight whitespace-pre text-gray-200 m-0 tabular-nums"
               style={{ tabSize: 8 }}>
            {rendered}
          </pre>
        ) : (
          <span className="text-gray-600 font-mono text-xs italic">Rendering...</span>
        )}
      </div>
    </div>
  );
});
