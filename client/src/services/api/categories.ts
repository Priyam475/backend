import type { BusinessCategory } from '@/types/models';
import { delay, getStore } from '../storage';

export const categoryApi = {
  async list(): Promise<BusinessCategory[]> {
    await delay(100);
    return getStore<BusinessCategory>('mkt_categories');
  },
};

