import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Merco-Arrival-Origin/1.0';

interface NominatimResult {
  display_name: string;
  place_id: number;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    state_district?: string;
    country?: string;
  };
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Origin/location input with OpenStreetMap Nominatim search (India only).
 * Typing shows a dropdown of suggestions like "Bangalore, Karnataka, India".
 * No API key required.
 */
export default function LocationSearchInput({
  value,
  onChange,
  placeholder = 'Type location in India (city, district, state)…',
  className,
  id,
  disabled = false,
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestAtRef = useRef(0);
  const MIN_REQUEST_INTERVAL_MS = 1100; // Nominatim: max 1 request per second

  const updateDropdownPos = useCallback(() => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const now = Date.now();
      const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAtRef.current));
      const doFetch = () => {
        lastRequestAtRef.current = Date.now();
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        const params = new URLSearchParams({
          q: query.trim(),
          format: 'json',
          addressdetails: '1',
          limit: '8',
          countrycodes: 'in', // India only
        });
        fetch(`${NOMINATIM_URL}?${params}`, {
          signal: abortRef.current.signal,
          headers: { 'Accept': 'application/json', 'Accept-Language': 'en', 'User-Agent': USER_AGENT },
        })
          .then(res => res.json())
          .then((data: NominatimResult[]) => {
            setSuggestions(data);
            setOpen(data.length > 0);
            updateDropdownPos();
          })
          .catch(() => setSuggestions([]))
          .finally(() => {
            setLoading(false);
            abortRef.current = null;
          });
      };
      if (wait > 0) setTimeout(doFetch, wait);
      else doFetch();
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, updateDropdownPos]);

  const handleSelect = (displayName: string) => {
    onChange(displayName);
    setQuery(displayName);
    setOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      updateDropdownPos();
      setOpen(true);
    }
  };

  // Close dropdown on scroll or resize so it doesn't stay stuck on screen (fixed position doesn't follow input)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-[1]" />
      <input
        ref={inputRef}
        type="text"
        id={id}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full h-11 rounded-xl bg-background border border-input text-sm pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching…</span>
      )}

      {open && suggestions.length > 0 && createPortal(
        <div
          role="listbox"
          className="fixed z-[9999] bg-card border border-border/50 rounded-xl shadow-2xl max-h-52 overflow-y-auto py-1"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: Math.max(dropdownPos.width, 280),
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              role="option"
              onMouseDown={e => { e.preventDefault(); handleSelect(s.display_name); }}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground">{s.display_name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
