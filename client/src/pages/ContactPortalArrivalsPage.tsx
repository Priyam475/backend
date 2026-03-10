import { useEffect, useState } from 'react';
import { useContactAuth } from '@/context/ContactAuthContext';
import { contactPortalApi, type ContactPortalArrival } from '@/services/api/contactPortal';

const ContactPortalArrivalsPage = () => {
  const { isGuest } = useContactAuth();
  const [arrivals, setArrivals] = useState<ContactPortalArrival[]>([]);
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
        const data = await contactPortalApi.getArrivals(50);
        if (!cancelled) {
          setArrivals(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load arrivals');
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
        <h2 className="text-lg font-semibold text-foreground">My Arrivals</h2>
        <p className="text-xs text-muted-foreground">
          {isGuest
            ? 'Arrivals are only available after you register or log in with a contact account.'
            : 'Vehicles where you are recorded as seller or broker.'}
        </p>
      </header>

      {isGuest && (
        <p className="text-xs text-muted-foreground">
          Guest sessions cannot view arrival history. Please register to see your arrivals.
        </p>
      )}
      {isLoading && !isGuest && (
        <p className="text-xs text-muted-foreground">Loading arrivals…</p>
      )}
      {error && !isGuest && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!isGuest && !isLoading && !error && arrivals.length === 0 && (
        <p className="text-xs text-muted-foreground">No arrivals found.</p>
      )}

      {!isGuest && (
        <ul className="space-y-2">
          {arrivals.map(a => (
            <li
              key={a.seller_vehicle_id}
              className="rounded-xl border border-emerald-100/70 dark:border-emerald-900/50 bg-white/80 dark:bg-slate-900/80 px-4 py-3 text-xs flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-foreground">
                  Vehicle {a.vehicle_number || a.vehicle_id || a.seller_vehicle_id}
                </p>
                <p className="text-muted-foreground">
                  Arrival at {a.arrival_datetime || '—'}
                </p>
              </div>
              {a.trader_id && (
                <p className="text-[10px] text-muted-foreground text-right">
                  Trader #{a.trader_id}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ContactPortalArrivalsPage;

