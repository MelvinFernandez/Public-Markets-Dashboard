import { NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "node:child_process";

const QuerySchema = z.object({ symbols: z.string().transform((s) => s.split(",").filter(Boolean)) });

async function trySpawn(cmd: string, args: string[], cwd: string) {
  return await new Promise<{ ok: boolean; out: string; err: string; code: number }>((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => resolve({ ok: code === 0, out, err, code: code ?? -1 }));
    p.on("error", (e) => resolve({ ok: false, out: "", err: String(e), code: -1 }));
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ symbols: url.searchParams.get("symbols") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const symbols = parsed.data.symbols;
  if (!symbols.length) return NextResponse.json({ data: [], updatedAt: Date.now() });
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
    const run = await trySpawn(c.cmd, [...c.extraArgs, "scripts/yfinance_quotes.py", ...symbols], cwd);
    if (run.ok) {
      try {
        const data = JSON.parse(run.out);
        return NextResponse.json({ data, updatedAt: Date.now() });
      } catch {
        lastErr = `Invalid JSON from yfinance (${c.cmd}). stdout: ${run.out?.slice(0, 2000)}`;
        break;
      }
    }
    lastErr = `${c.cmd} failed (code ${run.code}). stderr: ${run.err?.slice(0, 2000)}`;
  }

  return NextResponse.json({ error: lastErr || "Failed to execute yfinance" }, { status: 500 });
}


