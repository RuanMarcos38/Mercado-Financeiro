export type Candle = {
  symbol: string;
  timeframe: "1m" | "5m" | "10m" | "15m" | "1h" | "1d";
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
};

export type Quote = {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  changePct?: number;
  time: string;
  source: string;
  delayed: boolean;
};

export interface MarketDataProvider {
  id: string;
  kind: "official" | "licensed" | "broker";
  getQuote(symbol: string): Promise<Quote>;
  getCandles(symbol: string, timeframe: Candle["timeframe"], limit: number): Promise<Candle[]>;
}
