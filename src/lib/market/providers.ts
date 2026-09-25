import type { Candle, MarketDataProvider, Quote } from "./types";

const notConfigured = (provider:string):never => {
  throw new Error(`${provider} não configurado. Defina URL/token autorizado no ambiente.`);
};

export class B3Provider implements MarketDataProvider {
  id = "b3";
  kind = "licensed" as const;
  async getQuote(_symbol:string):Promise<Quote>{
    if(!process.env.B3_MARKET_DATA_URL || !process.env.B3_MARKET_DATA_TOKEN) return notConfigured("B3 Market Data");
    return notConfigured("Adapter B3: implemente conforme contrato/feed adquirido");
  }
  async getCandles(_symbol:string,_timeframe:Candle["timeframe"],_limit:number):Promise<Candle[]>{
    return notConfigured("Adapter B3");
  }
}

export class CMEProvider implements MarketDataProvider {
  id = "cme";
  kind = "licensed" as const;
  async getQuote(_symbol:string):Promise<Quote>{
    if(!process.env.CME_API_URL || !process.env.CME_API_KEY) return notConfigured("CME");
    return notConfigured("Adapter CME: configure o produto/API contratado");
  }
  async getCandles(_symbol:string,_timeframe:Candle["timeframe"],_limit:number):Promise<Candle[]>{
    return notConfigured("Adapter CME");
  }
}

export class BrokerProvider implements MarketDataProvider {
  id = "broker";
  kind = "broker" as const;
  async getQuote(_symbol:string):Promise<Quote>{
    if(!process.env.BROKER_API_URL || !process.env.BROKER_API_KEY) return notConfigured("Broker");
    return notConfigured("Adapter Broker: somente API oficial/autorizada");
  }
  async getCandles(_symbol:string,_timeframe:Candle["timeframe"],_limit:number):Promise<Candle[]>{
    return notConfigured("Adapter Broker");
  }
}
