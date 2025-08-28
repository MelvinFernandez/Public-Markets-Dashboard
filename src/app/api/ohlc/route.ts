/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { LruCache, devFileCache } from "@/lib/cache";

const cache = new LruCache<{ data: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>; updatedAt: number; marketClosed: boolean }>(100);

function keyFor(params: URLSearchParams) {
  return `ohlc:${params.get("ticker")}:${params.get("range")}:${params.get("interval")}`;
}

async function trySpawn(cmd: string, args: string[], cwd: string) {
  return await new Promise<{ ok: boolean; out: string; err: string; code: number }>((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let out = "";
    let err = "";
    p.stdout.on("data", (d: any) => (out += d.toString()));
    p.stderr.on("data", (d: any) => (err += d.toString()));
    p.on("close", (code: any) => resolve({ ok: code === 0, out, err, code: code ?? -1 }));
    p.on("error", (e: any) => resolve({ ok: false, out: "", err: String(e), code: -1 }));
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim().toUpperCase();
  const range = (url.searchParams.get("range") || "1mo").toLowerCase();
  const interval = (url.searchParams.get("interval") || (range === "1d" ? "5m" : "1d")).toLowerCase();
  const force = url.searchParams.get("force") === "true";
  
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  // Cache: 15s for intraday (1d), 30s for hourly, 60s for daily+ (more aggressive refresh)
  const ttl = interval.endsWith("m") ? (range === "1d" ? 15_000 : 30_000) : 60_000;
  const cacheKey = keyFor(url.searchParams);
  
  if (!force) {
    const mem = cache.get(cacheKey);
    if (mem) return NextResponse.json(mem);
    const file = devFileCache.read<{ data: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>; updatedAt: number; marketClosed: boolean }>(cacheKey);
    if (file) {
      cache.set(cacheKey, file, ttl);
      return NextResponse.json(file);
    }
  }

  // Map range->days for our Python script
  const days = range === "1d" ? 1 : range === "1w" ? 7 : range === "1mo" ? 30 : 365;

  const cwd = process.cwd();
  const candidates: Array<{ cmd: string; extraArgs: string[] }> = (
    [
      process.env.PYTHON_PATH ? { cmd: process.env.PYTHON_PATH, extraArgs: [] } : undefined,
      process.platform === 'win32' ? { cmd: 'py', extraArgs: ['-3'] } : undefined,
      process.platform === 'win32' ? { cmd: 'py', extraArgs: [] } : undefined,
      { cmd: 'python3', extraArgs: [] },
      { cmd: 'python', extraArgs: [] },
    ].filter(Boolean) as Array<{ cmd: string; extraArgs: string[] }>
  );

  let lastErr = "";
  for (const c of candidates) {
    const run = await trySpawn(c.cmd, [...c.extraArgs, "scripts/yfinance_history.py", ticker, String(days)], cwd);
    if (run.ok) {
      try {
        const arr = JSON.parse(run.out);
        const data = Array.isArray(arr) ? arr.map((d: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }) => ({ t: d.timestamp, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume })) : [];
        const payload = { data, updatedAt: Date.now(), marketClosed: false };
        cache.set(cacheKey, payload, ttl);
        devFileCache.write(cacheKey, payload);
        return NextResponse.json(payload);
      } catch {
        lastErr = `Invalid JSON from yfinance history (${c.cmd}). stdout: ${run.out?.slice(0, 2000)}`;
        break;
      }
    }
    lastErr = `${c.cmd} failed (code ${run.code}). stderr: ${run.err?.slice(0, 2000)}`;
  }

  return NextResponse.json({ error: lastErr || "Failed to execute yfinance" }, { status: 500 });
}


