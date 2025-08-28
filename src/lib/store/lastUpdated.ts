"use client";

import { create } from "zustand";

export type DatasetKey =
  | "quotes"
  | "earnings"
  | "eps"
  | "insiders"
  | "deals"
  | "sectors"
  | "news"
  | "sentiment";

type LastUpdatedState = {
  lastUpdatedByKey: Partial<Record<DatasetKey, number>>;
  setUpdated: (key: DatasetKey, timeMs?: number) => void;
  setMany: (entries: Partial<Record<DatasetKey, number>>) => void;
  latestUpdatedAt: () => number | null;
};

export const useLastUpdatedStore = create<LastUpdatedState>((set, get) => ({
  lastUpdatedByKey: {},
  setUpdated: (key, timeMs) =>
    set((s) => ({
      lastUpdatedByKey: { ...s.lastUpdatedByKey, [key]: timeMs ?? Date.now() },
    })),
  setMany: (entries) =>
    set((s) => ({ lastUpdatedByKey: { ...s.lastUpdatedByKey, ...entries } })),
  latestUpdatedAt: () => {
    const values = Object.values(get().lastUpdatedByKey);
    if (!values.length) return null;
    return Math.max(...values);
  },
}));


