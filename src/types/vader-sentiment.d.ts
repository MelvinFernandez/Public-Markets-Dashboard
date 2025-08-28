declare module 'vader-sentiment' {
  export class SentimentAnalyzer {
    getSentiment(text: string): {
      compound: number;
      positive: number;
      negative: number;
      neutral: number;
    };
  }
}
