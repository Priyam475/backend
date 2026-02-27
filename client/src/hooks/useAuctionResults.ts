import { useState, useEffect, useCallback } from 'react';
import { fetchAllAuctionResults, type AuctionResultDTO } from '@/services/api';

/**
 * Thin compatibility layer for pages that previously used getStore('mkt_auction_results').
 * Returns the same array shape (AuctionResultDTO[]) so UI needs minimal changes.
 */
export function useAuctionResults(): {
  auctionResults: AuctionResultDTO[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [auctionResults, setAuctionResults] = useState<AuctionResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAllAuctionResults();
      setAuctionResults(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load auction results'));
      setAuctionResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { auctionResults, loading, error, refetch };
}
