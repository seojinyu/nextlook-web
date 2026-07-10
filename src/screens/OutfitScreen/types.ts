import type { Clothing, WearLog } from '../../lib/types';

export interface OutfitEntry {
  log: WearLog;
  items: (Clothing & { signedUrl: string })[];
}

export type Item = Clothing & { signedUrl: string };
