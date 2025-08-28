import { z } from "zod";

export type ApiResponse<T> = { data: T; updatedAt: number };

export const QuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  history: z.array(z.number()).default([]),
  updatedAt: z.number(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const EarningsCalendarItemSchema = z.object({
  symbol: z.string(),
  company: z.string().optional().default(""),
  date: z.string(),
  time: z.enum(["bmo", "amc", "dmh"]).optional().default("dmh"),
});
export type EarningsCalendarItem = z.infer<typeof EarningsCalendarItemSchema>;

export const EpsSurpriseSchema = z.object({
  period: z.string(),
  estimate: z.number().nullable(),
  actual: z.number().nullable(),
  surprise: z.number().nullable(),
});
export type EpsSurprise = z.infer<typeof EpsSurpriseSchema>;

export const Form4Schema = z.object({
  company: z.string(),
  symbol: z.string(),
  ownerName: z.string(),
  ownerRole: z.string().optional().default(""),
  transactionCode: z.string(),
  shares: z.number(),
  price: z.number().nullable(),
  filingUrl: z.string().url(),
  filingDate: z.string(),
});
export type Form4 = z.infer<typeof Form4Schema>;

export const DealItemSchema = z.object({
  announcedDate: z.string(),
  acquirer: z.string(),
  target: z.string(),
  valueUSD: z.number().nullable(),
  offerType: z.string().optional().default(""),
  premiumPercent: z.number().nullable(),
  sector: z.string().optional().default(""),
  status: z.string().optional().default("Announced"),
  sources: z.array(z.string().url()).default([]),
});
export type DealItem = z.infer<typeof DealItemSchema>;

export const SectorPriceSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  close: z.number(),
});
export type SectorPrice = z.infer<typeof SectorPriceSchema>;

export const NewsItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  source: z.string().optional().default(""),
  publishedAt: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  polarity: z.number().min(-1).max(1).optional().default(0),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const SentimentSchema = z.object({
  score: z.number().min(0).max(100),
  inputs: z.object({
    advDeclRatio: z.number().nullable().optional(),
    putCallRatio: z.number().nullable().optional(),
    sectorBreadth: z.number().nullable().optional(),
    newsPolarity: z.number().nullable().optional(),
  }),
  updatedAt: z.number(),
});
export type Sentiment = z.infer<typeof SentimentSchema>;


// Market data types for FMP API
export const MarketDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  marketCap: z.number(),
  dayHigh: z.number(),
  dayLow: z.number(),
  yearHigh: z.number(),
  yearLow: z.number(),
  priceAvg50: z.number(),
  priceAvg200: z.number(),
  timestamp: z.number(),
  data: z.array(z.object({
    timestamp: z.number(),
    close: z.number(),
  })).default([]),
});

export const SectorDataSchema = MarketDataSchema.extend({
  sector: z.string(),
  weight: z.number(),
});

export const ChartDataSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  date: z.string(),
  change: z.number(),
  changePercent: z.number(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;
export type SectorData = z.infer<typeof SectorDataSchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;


