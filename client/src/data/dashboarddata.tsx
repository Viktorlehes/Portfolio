export interface Asset {
  name: string;
  value: number;
  color: string;
}

export interface Catagory {
  name: string;
  average_price_change: string;
  crypto_names: string[];
}

export interface CryptoCategory {
  category: string;
  topGainers: string[];
  change1h: string;
  change24h: string;
  change7d: string;
  marketCap: string;
  volume24h: string;
  numberOfCoins: number;
}

export interface Datapoint {
  name: string;
  Coinbase?: number;
  Nexo?: number;
  Uniswap?: number;
  Total?: number;
}

export interface AssetOverview {
  name: string;
  totalValue: string;
  value: string;
  change24h: string;
  change7d: string;
}

// Test data
export const testCategories: CryptoCategory[] = [
  {
    category: "Layer 1 (L1)",
    topGainers: ["ETH", "SOL", "ADA"],
    change1h: "-0.1%",
    change24h: "0.2%",
    change7d: "1.9%",
    marketCap: "$1,789,392,773,866",
    volume24h: "$49,727,744,647",
    numberOfCoins: 186
  },
  {
    category: "Proof of Work (PoW)",
    topGainers: ["BTC", "LTC", "DOGE"],
    change1h: "-0.1%",
    change24h: "-0.0%",
    change7d: "2.4%",
    marketCap: "$1,273,999,622,962",
    volume24h: "$28,725,729,859",
    numberOfCoins: 170
  },
  {
    category: "DeFi",
    topGainers: ["UNI", "AAVE", "COMP"],
    change1h: "0.3%",
    change24h: "1.5%",
    change7d: "3.2%",
    marketCap: "$98,392,773,866",
    volume24h: "$5,727,744,647",
    numberOfCoins: 120
  },
  {
    category: "NFT",
    topGainers: ["AXS", "MANA", "SAND"],
    change1h: "-0.2%",
    change24h: "-1.0%",
    change7d: "-2.5%",
    marketCap: "$45,392,773,866",
    volume24h: "$2,727,744,647",
    numberOfCoins: 80
  },
  {
    category: "Metaverse",
    topGainers: ["ENJ", "THETA", "GALA"],
    change1h: "0.1%",
    change24h: "0.8%",
    change7d: "1.1%",
    marketCap: "$23,392,773,866",
    volume24h: "$1,727,744,647",
    numberOfCoins: 60
  },
];