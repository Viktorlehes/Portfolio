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

export const data: Datapoint[] = [
  { name: "Jan 1", Coinbase: 8000, Nexo: 12000, Uniswap: 6000, Total: 26000 },
  { name: "Jan 15", Coinbase: 8500, Nexo: 12500, Uniswap: 6200, Total: 27200 },
  { name: "Jan 30", Coinbase: 9000, Nexo: 13000, Uniswap: 6400, Total: 28400 },

  { name: "Feb 1", Coinbase: 9100, Nexo: 23000, Uniswap: 7000, Total: 39100 },
  { name: "Feb 14", Coinbase: 9500, Nexo: 24000, Uniswap: 7300, Total: 40800 },
  { name: "Feb 28", Coinbase: 10000, Nexo: 25000, Uniswap: 7600, Total: 42600 },

  { name: "Mar 1", Coinbase: 14000, Nexo: 13000, Uniswap: 8000, Total: 35000 },
  { name: "Mar 15", Coinbase: 14500, Nexo: 13500, Uniswap: 8200, Total: 36200 },
  { name: "Mar 30", Coinbase: 15000, Nexo: 14000, Uniswap: 8500, Total: 37500 },

  { name: "Apr 1", Coinbase: 15500, Nexo: 25000, Uniswap: 8700, Total: 49200 },
  { name: "Apr 15", Coinbase: 16000, Nexo: 26000, Uniswap: 9000, Total: 51000 },
  { name: "Apr 30", Coinbase: 16500, Nexo: 27000, Uniswap: 9200, Total: 52700 },

  { name: "May 1", Coinbase: 17000, Nexo: 28000, Uniswap: 9500, Total: 54500 },
  { name: "May 15", Coinbase: 17500, Nexo: 29000, Uniswap: 9800, Total: 56300 },
  { name: "May 31", Coinbase: 18000, Nexo: 30000, Uniswap: 10000, Total: 58000 },

  { name: "Jun 1", Coinbase: 18500, Nexo: 31000, Uniswap: 10300, Total: 59800 },
  { name: "Jun 15", Coinbase: 19000, Nexo: 32000, Uniswap: 10500, Total: 61500 },
  { name: "Jun 30", Coinbase: 19500, Nexo: 33000, Uniswap: 10800, Total: 63300 },

  { name: "Jul 1", Coinbase: 20000, Nexo: 34000, Uniswap: 11000, Total: 65000 },
  { name: "Jul 15", Coinbase: 20500, Nexo: 35000, Uniswap: 11200, Total: 66700 },
  { name: "Jul 30", Coinbase: 21000, Nexo: 36000, Uniswap: 11500, Total: 68500 },

  { name: "Aug 1", Coinbase: 21500, Nexo: 37000, Uniswap: 11700, Total: 70200 },
  { name: "Aug 15", Coinbase: 22000, Nexo: 38000, Uniswap: 12000, Total: 72000 },
  { name: "Aug 31", Coinbase: 22500, Nexo: 39000, Uniswap: 12200, Total: 73700 },

  { name: "Sep 1", Coinbase: 23000, Nexo: 40000, Uniswap: 12500, Total: 75500 },
  { name: "Sep 12", Coinbase: 19000, Nexo: 55500, Uniswap: 9000, Total: 83500 },
  { name: "Sep 15", Coinbase: 23500, Nexo: 41000, Uniswap: 12700, Total: 77200 },
  { name: "Sep 30", Coinbase: 24000, Nexo: 42000, Uniswap: 13000, Total: 79000 },

  { name: "Oct 1", Coinbase: 24500, Nexo: 43000, Uniswap: 13200, Total: 80700 },
  { name: "Oct 15", Coinbase: 25000, Nexo: 44000, Uniswap: 13500, Total: 82500 },
  { name: "Oct 31", Coinbase: 25500, Nexo: 45000, Uniswap: 13700, Total: 84200 },

  { name: "Nov 1", Coinbase: 26000, Nexo: 46000, Uniswap: 14000, Total: 86000 },
  { name: "Nov 15", Coinbase: 26500, Nexo: 47000, Uniswap: 14300, Total: 87800 },
  { name: "Nov 30", Coinbase: 27000, Nexo: 48000, Uniswap: 14500, Total: 89500 },

  { name: "Dec 1", Coinbase: 27500, Nexo: 49000, Uniswap: 14800, Total: 91300 },
  { name: "Dec 15", Coinbase: 28000, Nexo: 50000, Uniswap: 15000, Total: 93000 },
  { name: "Dec 31", Coinbase: 28500, Nexo: 51000, Uniswap: 15300, Total: 94800 },
];

export const assetOverviewPortfolio: Asset[] = [
  { name: "Cardano", value: 1500, color: "#f59e0b" },
  { name: "Polkadot", value: 3000, color: "#ec4899" },
  { name: "Avalanche", value: 1200, color: "#ef4444" },
  { name: "Binance Coin", value: 20000, color: "#eab308" },
  { name: "Ripple", value: 1500, color: "#3b82f6" },
  { name: "Dogecoin", value: 1200, color: "#a3e635" },
  { name: "Fantom", value: 2500, color: "#9333ea" },
  { name: "Algorand", value: 1200, color: "#06b6d4" },
]

export const assetsPortfolio1: Asset[] = [
  { name: "Bitcoin", value: 50000, color: "#8b5cf6" }, // Larger than 30% of total
  { name: "Ethereum", value: 25000, color: "#10b981" },
  { name: "Cardano", value: 1500, color: "#f59e0b" },
  { name: "Solana", value: 4000, color: "#6366f1" },
  { name: "Polkadot", value: 3000, color: "#ec4899" },
  { name: "Avalanche", value: 1200, color: "#ef4444" },
];

export const assetsPortfolio2: Asset[] = [
  { name: "Litecoin", value: 35000, color: "#f97316" }, // Larger than 30% of total
  { name: "Binance Coin", value: 20000, color: "#eab308" },
  { name: "Ripple", value: 1500, color: "#3b82f6" },
  { name: "Dogecoin", value: 1200, color: "#a3e635" },
  { name: "Polygon", value: 2500, color: "#8b5cf6" },
  { name: "Stellar", value: 1100, color: "#6366f1" },
];

export const assetsPortfolio3: Asset[] = [
  { name: "Cosmos", value: 40000, color: "#14b8a6" }, // Larger than 30% of total
  { name: "Tezos", value: 1500, color: "#ef4444" },
  { name: "VeChain", value: 1300, color: "#d946ef" },
  { name: "Aave", value: 5000, color: "#22c55e" },
  { name: "Fantom", value: 2500, color: "#9333ea" },
  { name: "Algorand", value: 1200, color: "#06b6d4" },
];

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
  {
    category: "Stablecoins",
    topGainers: ["USDT", "USDC", "DAI"],
    change1h: "-0.0%",
    change24h: "-0.1%",
    change7d: "0.0%",
    marketCap: "$153,392,773,866",
    volume24h: "$10,727,744,647",
    numberOfCoins: 20
  },
  {
    category: "Privacy Coins",
    topGainers: ["XMR", "ZEC", "DASH"],
    change1h: "-0.3%",
    change24h: "-1.2%",
    change7d: "-0.5%",
    marketCap: "$5,392,773,866",
    volume24h: "$1,727,744,647",
    numberOfCoins: 30
  },
  {
    category: "Gaming",
    topGainers: ["SAND", "AXS", "GALA"],
    change1h: "-0.4%",
    change24h: "-2.0%",
    change7d: "-1.8%",
    marketCap: "$10,392,773,866",
    volume24h: "$3,727,744,647",
    numberOfCoins: 50
  }
];

export const testAssetOverviewData: AssetOverview[] = [
  { name: "Bitcoin", totalValue: "187234", value: "61034", change24h: "-6.78", change7d: "1.9" },
  { name: "Ethereum", totalValue: "119574", value: "2156", change24h: "-4.76", change7d: "2.5" },
  { name: "Cardano", totalValue: "6893", value: "0.337", change24h: "0.1", change7d: "0.9" },
  { name: "Solana", totalValue: "7954", value: "139", change24h: "0.3", change7d: "2.0" },
  { name: "Polkadot", totalValue: "4523", value: "4.01", change24h: "0.2", change7d: "1.5" },
  { name: "Avalanche", totalValue: "1235", value: "26.9", change24h: "0.0", change7d: "0.5" },
];