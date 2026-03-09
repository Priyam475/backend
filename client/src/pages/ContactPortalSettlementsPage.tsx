import { useEffect, useState } from 'react';
import { contactPortalApi, type ContactPortalStatement } from '@/services/api/contactPortal';

const ContactPortalSettlementsPage = () => {
  const [settlements, setSettlements] = useState<ContactPortalStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await contactPortalApi.getSettlements(100);
        if (!cancelled) {
          setSettlements(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load settlements');
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
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Settlements (Patti)</h2>
        <p className="text-xs text-muted-foreground">
          This view is based on AP (payable) AR/AP documents linked to you. Future versions will
          align directly with Patti and settlement tables.
        </p>
      </header>

      {isLoading && <p className="text-xs text-muted-foreground">Loading settlements…</p>}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!isLoading && !error && settlements.length === 0 && (
        <p className="text-xs text-muted-foreground">No settlements found.</p>
      )}

      <ul className="space-y-2 text-xs">
        {settlements.map(s => (
          <li
            key={s.document_id}
            className="rounded-xl border border-emerald-100/70 dark:border-emerald-900/50 bg-white/80 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-foreground">
                {s.reference_number || s.document_id}
              </p>
              <p className="text-muted-foreground">
                {s.document_date || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                ₹{Math.abs(s.original_amount ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Outstanding: ₹{Math.abs(s.outstanding_balance ?? 0).toLocaleString()} ({s.status || 'OPEN'})
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ContactPortalSettlementsPage;

