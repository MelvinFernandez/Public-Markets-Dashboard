import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { LruCache } from "@/lib/cache";

const TEN_MINUTES = 10 * 60 * 1000;
const sentimentCache = new LruCache<unknown>(64);

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
    // Try multiple Python command variations for Windows compatibility
    // On Windows, "python" usually works, "python3" often doesn't
    const pythonCommands = [process.env.PYTHON_PATH, "python", "py", "python3"].filter(Boolean);
    const pythonPath = pythonCommands[0] || "python";
    const scriptPath = "scripts/sentiment_analysis.py";
    
    let args: string[];
    if (tickers) {
      args = [scriptPath, "--multi", tickers, limit.toString()];
    } else {
      args = [scriptPath, ticker!, limit.toString()];
    }

    // Execute Python script for sentiment analysis
    try {
      const result = await new Promise<string>((resolve, reject) => {
        console.log(`Executing: ${pythonPath} ${args.join(' ')}`);
        const child = spawn(pythonPath, args, { cwd: process.cwd() });
        let stdout = "";
        let stderr = "";

        // Set a timeout for the Python script
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("Python script timed out after 30 seconds"));
        }, 30000);

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("error", (error) => {
          clearTimeout(timeout);
          console.error(`Failed to start Python process: ${error.message}`);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        child.on("close", (code) => {
          clearTimeout(timeout);
          console.log(`Python process exited with code: ${code}`);
          if (code === 0) {
            resolve(stdout);
          } else {
            console.error(`Python stderr: ${stderr}`);
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          }
        });
      });

    // Clean the result and validate it's JSON
    const cleanResult = result.trim();
    if (!cleanResult) {
      throw new Error("Python script returned empty result");
    }
    
    // Check if the result starts with an error message
    if (cleanResult.startsWith("Error:") || cleanResult.startsWith("Traceback")) {
      throw new Error(`Python script error: ${cleanResult}`);
    }
    
    let data;
    try {
      data = JSON.parse(cleanResult);
    } catch (parseError) {
      console.error("JSON parse error. Raw output:", cleanResult);
      throw new Error(`Invalid JSON from Python script: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
      sentimentCache.set(cacheKey, data, TEN_MINUTES);
      
      return NextResponse.json(data);
    } catch (pythonError) {
      console.error("Python execution failed:", pythonError);
      
      // Return a fallback response instead of throwing
      const fallbackData = {
        ticker: ticker || tickers?.split(',')[0] || 'UNKNOWN',
        score: 50.0,
        breadth: 50.0,
        count: 0,
        publishers: 0,
        lowSample: true,
        asOf: new Date().toISOString(),
        articles: [],
        articles_full: [],
        error: "Sentiment analysis temporarily unavailable"
      };
      
      if (tickers) {
        // Portfolio fallback
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
          error: "Portfolio sentiment analysis temporarily unavailable"
        });
      }
      
      sentimentCache.set(cacheKey, fallbackData, TEN_MINUTES);
      return NextResponse.json(fallbackData);
    }
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze sentiment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


