import { useEffect, useState } from 'react';
import { useContactAuth } from '@/context/ContactAuthContext';
import { contactPortalApi, type ContactPortalStatement } from '@/services/api/contactPortal';

const ContactPortalStatementsPage = () => {
  const { isGuest } = useContactAuth();
  const [statements, setStatements] = useState<ContactPortalStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isGuest) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await contactPortalApi.getStatements(100);
        if (!cancelled) {
          setStatements(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load statements');
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
  }, [isGuest]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">Account Statements</h2>
        <p className="text-xs text-muted-foreground">
          {isGuest
            ? 'Statements are only available after you register or log in with a contact account.'
            : 'AR/AP documents across all traders where you are the contact.'}
        </p>
      </header>

      {isGuest && (
        <p className="text-xs text-muted-foreground">
          Guest sessions cannot view statements. Please register to see your account activity.
        </p>
      )}
      {isLoading && !isGuest && (
        <p className="text-xs text-muted-foreground">Loading statements…</p>
      )}
      {error && !isGuest && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!isGuest && !isLoading && !error && statements.length === 0 && (
        <p className="text-xs text-muted-foreground">No statements found.</p>
      )}

      {!isGuest && (
        <ul className="space-y-2 text-xs">
          {statements.map(s => (
            <li
              key={s.document_id}
              className="rounded-xl border border-emerald-100/70 dark:border-emerald-900/50 bg-white/80 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {s.reference_number || s.document_id}
                </p>
                <p className="text-muted-foreground">
                  {s.type || 'AR/AP'} · {s.document_date || '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ₹{Math.abs(s.outstanding_balance ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.status || 'OPEN'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ContactPortalStatementsPage;

