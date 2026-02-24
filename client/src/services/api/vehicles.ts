import type { Vehicle } from '@/types/models';
import { delay, getStore, setStore, id, now } from '../storage';

export const vehicleApi = {
  async list(): Promise<Vehicle[]> {
    await delay(150);
    return getStore<Vehicle>('mkt_vehicles');
  },

  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    await delay();
    const item: Vehicle = {
      ...data,
      vehicle_id: id(),
      created_at: now(),
    } as Vehicle;
    const list = getStore<Vehicle>('mkt_vehicles');
    list.push(item);
    setStore('mkt_vehicles', list);
    return item;
  },
};

