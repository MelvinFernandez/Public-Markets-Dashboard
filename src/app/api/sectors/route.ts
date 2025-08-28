/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

const SECTORS = ["XLK", "XLF", "XLY", "XLE", "XLV", "XLI", "XLU", "XLB", "XLRE", "XLC"];

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

export async function GET() {
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
    const run = await trySpawn(c.cmd, [...c.extraArgs, "scripts/yfinance_quotes.py", ...SECTORS], cwd);
    if (run.ok) {
      try {
        const arr = JSON.parse(run.out);
        const data = Array.isArray(arr) ? arr : [];
        return NextResponse.json({ data, updatedAt: Date.now() });
      } catch {
        lastErr = `Invalid JSON from yfinance sectors (${c.cmd}). stdout: ${run.out?.slice(0, 2000)}`;
        break;
      }
    }
    lastErr = `${c.cmd} failed (code ${run.code}). stderr: ${run.err?.slice(0, 2000)}`;
  }

  return NextResponse.json({ error: lastErr || "Failed to execute yfinance" }, { status: 500 });
}


