import { useEffect, useState } from 'react';
import { contactPortalApi, type ContactPortalPurchase } from '@/services/api/contactPortal';

const ContactPortalPurchasesPage = () => {
  const [purchases, setPurchases] = useState<ContactPortalPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await contactPortalApi.getPurchases(50);
        if (!cancelled) {
          setPurchases(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load purchases');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">My Purchases</h2>
        <p className="text-xs text-muted-foreground">
          Stock purchases where you are recorded as vendor.
        </p>
      </header>

      {isLoading && <p className="text-xs text-muted-foreground">Loading purchases…</p>}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!isLoading && !error && purchases.length === 0 && (
        <p className="text-xs text-muted-foreground">No purchases found.</p>
      )}

      <ul className="space-y-2 text-xs">
        {purchases.map(p => (
          <li
            key={p.purchase_id}
            className="rounded-xl border border-emerald-100/70 dark:border-emerald-900/50 bg-white/80 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-foreground">
                Purchase #{p.purchase_id}
              </p>
              <p className="text-muted-foreground">
                Date: {p.purchase_date || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                ₹{Math.abs(p.total_amount ?? 0).toLocaleString()}
              </p>
              {p.trader_id && (
                <p className="text-[10px] text-muted-foreground">
                  Trader #{p.trader_id}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ContactPortalPurchasesPage;

