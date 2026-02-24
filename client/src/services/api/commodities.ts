import type { Commodity } from '@/types/models';
import { delay, getStore, setStore, id, now } from '../storage';

export const commodityApi = {
  async list(): Promise<Commodity[]> {
    await delay(150);
    return getStore<Commodity>('mkt_commodities');
  },

  async create(data: Partial<Commodity>): Promise<Commodity> {
    await delay();
    const item: Commodity = {
      ...data,
      commodity_id: id(),
      created_at: now(),
    } as Commodity;
    const list = getStore<Commodity>('mkt_commodities');
    list.push(item);
    setStore('mkt_commodities', list);
    return item;
  },

  async update(itemId: string, data: Partial<Commodity>): Promise<Commodity> {
    await delay();
    const list = getStore<Commodity>('mkt_commodities');
    const idx = list.findIndex(c => c.commodity_id === itemId);
    if (idx === -1) throw new Error('Commodity not found');
    list[idx] = { ...list[idx], ...data };
    setStore('mkt_commodities', list);
    return list[idx];
  },

  async remove(itemId: string): Promise<void> {
    await delay();
    const list = getStore<Commodity>('mkt_commodities').filter(c => c.commodity_id !== itemId);
    setStore('mkt_commodities', list);
  },
};

