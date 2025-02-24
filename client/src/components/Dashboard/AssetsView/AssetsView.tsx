import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./AssetsView.css";
import MetricCard from "../../overview/MetricCard";
import AssetList from "./AssetList";
import { components } from "../../../types/api-types";
import AssetOverviewSidebar from "./AssetOverviewSidebar";
import TokenPriceChart from "./TokenPriceChart";
import { ChartData } from "./TokenPriceChart";
import { formatCurrency, formatPercent } from "../../../utils/calc";
import { CircleDollarSign } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { isDataExpired } from "../../../utils/api";
import { api, ENDPOINTS } from "../../../utils/api";
import { Loader } from "lucide-react";

type Wallet = components['schemas']['UnifiedWallet'];

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface AssetViewProps {
  wallets: Wallet[];
  isNull: boolean;
}

export interface Asset {
  name: string;
  value: number;
  change: number;
  absoluteChange: number;
  amount: number;
  price: number;
  icon: string;
  symbol: string;
  fungible_id: string;
}

type ChartState = CachedData<{
  [fungible_id: string]: {
    data: ChartData | null;
    error: string;
    isLoading?: boolean;
  };
}>;

const AssetsView: React.FC<AssetViewProps> = ({ wallets, isNull }) => {
  const showZeroValues = true;
  const navigate = useNavigate();

  const [chartState, setChartState] = useState<ChartState>({
    data: {},
    timestamp: 0 
  });

  const { totalValueArray, largest4Assets } = !isNull ? useMemo(() => {
    const totalValuePerAsset = wallets.reduce((acc, wallet) => {
      wallet.tokens?.forEach(token => {
        if (!acc[token.name]) {
          acc[token.name] = {
            value: 0,
            lastValue: 0, 
            tokens: [], 
            amount: 0,
            price: 0,
            icon: token.icon || '',
            symbol: token.symbol,
            fungible_id: token.token_id,
            percentChange: token.price_24h_change 
          };
        }

        const value = token.value_usd;
        acc[token.name].value += value;
        acc[token.name].tokens.push(token);
        acc[token.name].amount += token.amount;
        acc[token.name].price = token.price_usd;
        acc[token.name].lastValue += value / (1 + (token.price_24h_change / 100));
      });
      return acc;
    }, {} as Record<string, {
      value: number,
      lastValue: number,
      tokens: any[],
      amount: number,
      price: number,
      icon: string,
      symbol: string,
      fungible_id: string,
      percentChange: number
    }>);

    let allAssets: Asset[] = Object.entries(totalValuePerAsset)
      .map(([name, data]) => ({
        name,
        value: data.value,
        change: data.percentChange,
        absoluteChange: data.value - data.lastValue,
        amount: data.amount,
        price: data.price,
        icon: data.icon,
        symbol: data.symbol,
        fungible_id: data.fungible_id
      }))
      .filter(asset => showZeroValues || asset.value >= 0.1)
      .sort((a, b) => b.value - a.value);

    return {
      totalValueArray: allAssets.slice(4),
      largest4Assets: allAssets.slice(0, 4)
    };
  }, [wallets, showZeroValues]) : { totalValueArray: [], largest4Assets: [] };

  const fetchChart = useCallback(async (fungible_id: string) => {
    setChartState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [fungible_id]: {
          ...prev.data[fungible_id],
          isLoading: true
        }
      }
    }));

    try {
      const response = await api.post<ChartData, object>(ENDPOINTS.CHARTS.endpoint, {fungible_id});
      
      setChartState(prev => ({
        data: {
          ...prev.data,
          [fungible_id]: {
            data: response.success ? response.data! : null,
            error: response.success ? "" : response.error!,
            isLoading: false
          }
        },
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartState(prev => ({
        data: {
          ...prev.data,
          [fungible_id]: {
            data: null,
            error: 'Error fetching chart data',
            isLoading: false
          }
        },
        timestamp: Date.now()
      }));
    }
  }, []);

  useEffect(() => {
    const fetchMissingCharts = async () => {
      const shouldRefetch = isDataExpired(chartState.timestamp || 0);
      
      largest4Assets.forEach(asset => {
        const currentData = chartState.data[asset.fungible_id];
        if (!currentData || shouldRefetch) {
          fetchChart(asset.fungible_id);
        }
      });
    };

    fetchMissingCharts();
    const intervalId = setInterval(fetchMissingCharts, 300000);
    return () => clearInterval(intervalId);
  }, [largest4Assets, chartState.timestamp, fetchChart]);

  const handleAssetClick = useCallback((assetId: string, navigate: ReturnType<typeof useNavigate>) => {
    navigate(`/Dashboard/asset/${assetId}`);
  }, []);

  const renderChart = (asset: Asset) => {
    const chartData = chartState.data[asset.fungible_id];
    
    if (!chartData) {
      return null;
    }

    if (chartData.isLoading) {
      return <div className="search-results-loading"><div className="loading-spinner"><Loader className="animate-spin" /></div></div>;
    }

    if (!chartData.data || chartData.error) {
    return null;
    }

    return <TokenPriceChart chartData={chartData.data} />;
  };

  return (
    <div className="asset-overview-wrapper">
      <div>
        <div className="main-assets-dashboard-grid">
          {largest4Assets.map((asset) => (
            <MetricCard
              key={asset.fungible_id}
              title={asset.name}
              value={formatCurrency(asset.value, 2, 2)}
              change={formatPercent(asset.change)}
              amount={`${asset.amount.toFixed(3)} ${asset.symbol}`}
              absoluteChange={formatCurrency(asset.absoluteChange, 2, 2)}
              Chart={renderChart(asset)}
              icon={asset.icon ? <img src={asset.icon} alt={asset.name} className="icon" /> : <CircleDollarSign />}
              handleClick={() => handleAssetClick(asset.fungible_id, navigate)}
            />
          ))}
        </div>
        <AssetList
          assets={totalValueArray}
          handleClick={handleAssetClick}
          navigate={navigate}
        />
      </div>
      <div className="asset-overview-sidebar">
        <AssetOverviewSidebar assets={[...largest4Assets, ...totalValueArray]} />
      </div>
    </div>
  );
};

export default AssetsView;