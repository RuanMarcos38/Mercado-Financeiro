export type SourceQuality = "official" | "public" | "delayed" | "imported" | "licensed";

export type SourceMeta = {
  id: string;
  label: string;
  quality: SourceQuality;
  realtime: boolean;
  cadence: string;
  description: string;
};

export const SOURCE_CATALOG: Record<string, SourceMeta> = {
  bcb: {
    id: "bcb",
    label: "Banco Central do Brasil",
    quality: "official",
    realtime: false,
    cadence: "conforme a série",
    description: "SGS/BCData, PTAX, Selic e séries macroeconômicas."
  },
  cvm: {
    id: "cvm",
    label: "CVM Dados Abertos",
    quality: "official",
    realtime: false,
    cadence: "diária/semanal conforme conjunto",
    description: "Companhias, documentos periódicos/eventuais e dados regulatórios."
  },
  imported: {
    id: "imported",
    label: "OHLCV importado",
    quality: "imported",
    realtime: false,
    cadence: "conforme arquivo enviado",
    description: "CSV/JSON fornecido pelo usuário ou por plataforma externa."
  },
  b3: {
    id: "b3",
    label: "B3 Market Data",
    quality: "licensed",
    realtime: true,
    cadence: "streaming",
    description: "Conector opcional de produção para cotações/licenciamento B3."
  },
  cme: {
    id: "cme",
    label: "CME Market Data",
    quality: "licensed",
    realtime: true,
    cadence: "streaming",
    description: "Conector opcional de produção para futuros globais."
  }
};

export function qualityPenalty(quality: SourceQuality) {
  switch (quality) {
    case "licensed": return 1;
    case "official": return 0.96;
    case "public": return 0.88;
    case "imported": return 0.84;
    case "delayed": return 0.78;
  }
}
