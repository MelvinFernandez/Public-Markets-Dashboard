// Simple in-memory LRU cache with optional file persistence for development.
import fs from "fs";
import path from "path";

type CacheEntry<T> = { value: T; expiresAt: number };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class LruCache<T> {
  private maxEntries: number;
  private store: Map<string, CacheEntry<T>> = new Map();

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const devFileCache = {
  read<T>(filename: string): T | null {
    try {
      const filePath = path.join(process.cwd(), "tmp", sanitizeFilename(filename));
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  write<T>(filename: string, data: T): void {
    try {
      const folder = path.join(process.cwd(), "tmp");
      fs.mkdirSync(folder, { recursive: true });
      const filePath = path.join(folder, sanitizeFilename(filename));
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // ignore
    }
  },
};


