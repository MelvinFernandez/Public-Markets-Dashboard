"use client";

import { ReactNode } from "react";
import { InlineBadge } from "@/components/ui/InlineBadge";

interface TokenData {
  sentiment: "up" | "down" | "flat";
  kind: string;
  symbol: string;
  display: string;
  meta?: string;
}

/**
 * Parse a token string like "[[UP:INDEX:^GSPC|S&P 500|+0.6%]]"
 */
function parseToken(token: string): TokenData | null {
  const match = token.match(/^\[\[([A-Z]+):([A-Z]+):([^|]+)\|([^|]+)(?:\|(.+))?\]\]$/);
  if (!match) return null;

  const [, sentiment, kind, symbol, display, meta] = match;
  return {
    sentiment: sentiment.toLowerCase() as "up" | "down" | "flat",
    kind,
    symbol,
    display,
    meta
  };
}

/**
 * Render narrative text with inline badges
 */
export function renderNarrative(input: string | string[]): ReactNode {
  // Convert input to array of paragraphs
  const paragraphs = typeof input === "string"
    ? input.split(/\n\s*\n/).filter(p => p.trim())
    : input;

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="leading-relaxed">
          {renderParagraph(paragraph)}
        </p>
      ))}
    </>
  );
}

/**
 * Render a single paragraph with tokens replaced by badges or HTML content
 */
function renderParagraph(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokenRegex = /\[\[[^\]]+\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add text before the token
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      // Check if the text contains HTML spans (from label function)
      if (beforeText.includes('<span')) {
        parts.push(<span key={`html-${match.index}`} dangerouslySetInnerHTML={{ __html: beforeText }} />);
      } else {
        parts.push(beforeText);
      }
    }

    // Parse and render the token
    const tokenData = parseToken(match[0]);
    if (tokenData) {
      if (tokenData.sentiment === "flat") {
        // For flat items, render as plain text to avoid extra spacing
        parts.push(tokenData.display);
      } else {
        parts.push(
          <InlineBadge
            key={`${tokenData.symbol}-${match.index}`}
            label={tokenData.display}
            meta={tokenData.meta}
            sentiment={tokenData.sentiment}
          />
        );
      }
    } else {
      // If token parsing fails, keep the original text
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last token
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    // Check if the remaining text contains HTML spans
    if (remainingText.includes('<span')) {
      parts.push(<span key={`html-end`} dangerouslySetInnerHTML={{ __html: remainingText }} />);
    } else {
      parts.push(remainingText);
    }
  }

  return parts;
}
