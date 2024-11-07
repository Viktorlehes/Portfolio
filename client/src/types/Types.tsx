export interface Token {
    id: number,
    symbol: string,
    name: string,
    price: number,
    last_updated: number,
  }
  
  export interface Wallet {
    walletAddress: string;
    tokens: Token[];
    name: string;
    color: string;
  }

  export interface DashboardContext {
    wallets: Wallet[];
    onAddWallet: (wallet: Wallet) => void;
    onUpdateWallet: (wallet: Wallet) => void;
    onDeleteWallet: (address: string) => void;
  }