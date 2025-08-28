/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { LruCache } from "@/lib/cache";

const TEN_MINUTES = 10 * 60 * 1000;
const sentimentCache = new LruCache<unknown>(64);

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const tickers = searchParams.get("tickers");
  const limit = parseInt(searchParams.get("limit") || "30");
  const force = searchParams.get("force") === "true";

  if (!ticker && !tickers) {
    return NextResponse.json({ error: "Missing ticker or tickers parameter" }, { status: 400 });
  }

  const cacheKey = `sentiment:${ticker || tickers}:${limit}`;
  
  if (!force) {
    const cached = sentimentCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
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
    let lastStdout = "";
    let lastStderr = "";
    
    for (const c of candidates) {
      const args = tickers 
        ? [...c.extraArgs, "scripts/sentiment_analysis.py", "--multi", tickers, String(limit)]
        : [...c.extraArgs, "scripts/sentiment_analysis.py", ticker!, String(limit)];
      
      console.log(`Trying command: ${c.cmd} ${args.join(' ')}`);
      
      const run = await trySpawn(c.cmd, args, cwd);
      if (run.ok) {
        try {
          const result = JSON.parse(run.out);
          sentimentCache.set(cacheKey, result, TEN_MINUTES);
          return NextResponse.json(result);
        } catch (parseError) {
          lastErr = `Invalid JSON from sentiment analysis (${c.cmd}). stdout: ${run.out?.slice(0, 2000)}`;
          lastStdout = run.out;
          lastStderr = run.err;
          console.error(`JSON parse error for ${c.cmd}:`, parseError);
          console.error(`stdout:`, run.out);
          console.error(`stderr:`, run.err);
          break;
        }
      }
      lastErr = `${c.cmd} failed (code ${run.code}). stderr: ${run.err?.slice(0, 2000)}`;
      lastStdout = run.out;
      lastStderr = run.err;
      console.error(`Command ${c.cmd} failed:`, { code: run.code, stdout: run.out, stderr: run.err });
    }

    // Log the complete error for debugging
    console.error("All Python commands failed. Last error:", lastErr);
    console.error("Last stdout:", lastStdout);
    console.error("Last stderr:", lastStderr);

    // Return fallback data on error
    if (tickers) {
      const tickerList = tickers.split(',');
      return NextResponse.json({
        tickers: tickerList,
        combined_score: 50.0,
        combined_breadth: 50.0,
        total_articles: 0,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map(t => ({
          ticker: t,
          score: 50.0,
          breadth: 50.0,
          count: 0,
          publishers: 0,
          lowSample: true
        })),
        articles: [],
        error: lastErr || "Sentiment analysis temporarily unavailable"
      });
    } else {
      return NextResponse.json({
        ticker: ticker!,
        score: 50.0,
        breadth: 50.0,
        count: 0,
        publishers: 0,
        lowSample: true,
        asOf: new Date().toISOString(),
        articles: [],
        articles_full: [],
        error: lastErr || "Sentiment analysis temporarily unavailable"
      });
    }
    
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    
    // Return fallback data on error
    if (tickers) {
      const tickerList = tickers.split(',');
      return NextResponse.json({
        tickers: tickerList,
        combined_score: 50.0,
        combined_breadth: 50.0,
        total_articles: 0,
        asOf: new Date().toISOString(),
        individual_scores: tickerList.map(t => ({
          ticker: t,
          score: 50.0,
          breadth: 50.0,
          count: 0,
          publishers: 0,
          lowSample: true
        })),
        articles: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    } else {
      return NextResponse.json({
        ticker: ticker!,
        score: 50.0,
        breadth: 50.0,
        count: 0,
        publishers: 0,
        lowSample: true,
        asOf: new Date().toISOString(),
        articles: [],
        articles_full: [],
        error: "Sentiment analysis temporarily unavailable"
      });
    }
  }
}


