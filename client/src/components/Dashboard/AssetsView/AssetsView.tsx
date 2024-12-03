import React, { useState, useEffect, useMemo, useRef } from "react";
import "./AssetsView.css";
import MetricCard from "../../overview/MetricCard";
import AssetList from "./AssetList";
import { components } from "../../../types/api-types";
import AssetOverviewSidebar from "./AssetOverviewSidebar";
import { Settings2, CirclePlus } from "lucide-react";
import TokenPriceChart from "./TokenPriceChart";
import { ChartData } from "./TokenPriceChart";
import { formatCurrency, formatPercent } from "../../../utils/calc";
import { CircleDollarSign } from 'lucide-react';
import LoadingOverlay from "../../Default/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import { getCachedData, isDataExpired } from "../../../utils/api";
import { api } from "../../../utils/api";

type Wallet = components['schemas']['Wallet'];
type FullToken = components['schemas']['FullToken'];

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_KEYS = {
  CHARTS: 'assetCharts'
} as const;

const API_ENDPOINTS = {
  CHARTS: '/dashboard/charts'
} as const;

interface AssetViewProps {
  wallets: Wallet[] | null;
  isLoading: boolean;
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

const AssetsView: React.FC<AssetViewProps> = ({ wallets, isLoading }) => {
  const [showZeroValues, setShowZeroValues] = useState(false);
  const fetchingRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const [chartState, setChartState] = useState<CachedData<Record<string, ChartData>>>(() => {
    const cachedCharts = getCachedData(CACHE_KEYS.CHARTS);
    return {
      data: cachedCharts?.data || {},
      timestamp: cachedCharts?.timestamp || 0 // Ensure timestamp is always a number
    };
  });

  const getValue = (token: FullToken): number => {
    try {
      return token.token_data?.value || token.zerion_data.value || 0;
    } catch (error) {
      console.error('Error getting token value:', error);
      return 0;
    }
  };

  const getChange = (token: FullToken): number => {
    try {
      return token.token_data?.change24h || token.zerion_data.changes.percent_1d || 0;
    } catch (error) {
      console.error('Error getting token change:', error);
      return 0;
    }
  };

  const { totalValueArray, largest4Assets } = wallets ? useMemo(() => {
    const totalValuePerAsset = wallets.reduce((acc, wallet) => {
      wallet.tokens?.forEach(token => {
        const tokenData = token.token_data ? token.token_data : token.zerion_data;
        if (!acc[tokenData.name]) {
          acc[tokenData.name] = {
            value: 0,
            lastValue: 0, // To store previous value for absolute change
            tokens: [], // Store all instances of this token
            amount: 0,
            price: 0,
            icon: token.zerion_data.icon || '',
            symbol: tokenData.symbol,
            fungible_id: token.zerion_data.fungible_id,
            percentChange: getChange(token) // Store the original percent change
          };
        }

        const value = getValue(token);
        acc[tokenData.name].value += value;
        acc[tokenData.name].tokens.push(token);
        acc[tokenData.name].amount += token.zerion_data.quantity.float;
        acc[tokenData.name].price = token.zerion_data.price;
        acc[tokenData.name].lastValue += value / (1 + (getChange(token) / 100));
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
      .map(([name, data]) => {
        // Calculate absolute change
        const absoluteChange = data.value - data.lastValue;

        // Get the original percentage change from the token data
        return {
          name,
          value: data.value,
          change: data.percentChange, // Use original percentage change
          absoluteChange, // Use calculated absolute change
          amount: data.amount,
          price: data.price,
          icon: data.icon,
          symbol: data.symbol,
          fungible_id: data.fungible_id
        };
      })
      .filter(asset => showZeroValues || asset.value >= 0.1)
      .sort((a, b) => b.value - a.value);

    const top4 = allAssets.slice(0, 4);
    const rest = allAssets.slice(4);
    return {
      totalValueArray: rest,
      largest4Assets: top4
    };
  }, [wallets, showZeroValues]) : { totalValueArray: [], largest4Assets: [] };

  useEffect(() => {
    const fetchChart = async (fungible_id: string) => {
      if (fetchingRef.current.has(fungible_id) || chartState.data[fungible_id]) {
        return;
      }

      fetchingRef.current.add(fungible_id);

      try {
        const chartData = await api.post(
          API_ENDPOINTS.CHARTS,  // Update this path to match your API_ENDPOINTS.CHARTS
          { fungible_id }
        );

        setChartState(prev => {
          const newState = {
            data: {
              ...prev.data,
              [fungible_id]: chartData
            },
            timestamp: Date.now()
          };

          // Cache the updated charts data
          localStorage.setItem(CACHE_KEYS.CHARTS, JSON.stringify(newState));

          return newState;
        }
        );
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        fetchingRef.current.delete(fungible_id);
      }
    };

    const fetchMissingCharts = async () => {
      // Check if cache is expired (every 5 minutes)
      const shouldRefetch = isDataExpired(chartState.timestamp || 0);

      largest4Assets.forEach(asset => {
        if ((!chartState.data[asset.fungible_id] || shouldRefetch) &&
          !fetchingRef.current.has(asset.fungible_id)) {
          fetchChart(asset.fungible_id);
        }
      });
    };

    fetchMissingCharts();
    const intervalId = setInterval(() => {
      fetchMissingCharts();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(intervalId);
  }, [largest4Assets, chartState.timestamp]);

  const handleAssetClick = (assetId: string, assetName: string, isFungible: boolean, navigate: ReturnType<typeof useNavigate>) => {
    const searchParams = new URLSearchParams({
      name: assetName,
      fungible: isFungible.toString(),
    });

    navigate(`/Dashboard/asset/${assetId}?${searchParams.toString()}`);
  };

  return (
    <div className="asset-overview-wrapper">
      <div>
        <div className="asset-nav">
          <h2>Liquid Assets</h2>
          <div className="asset-nav-controls">
            <div className="toggle-container">
              <span className="toggle-label">Show 0</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showZeroValues}
                  onChange={() => setShowZeroValues(!showZeroValues)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <CirclePlus className="nav-icon" />
            <Settings2 className="nav-icon" />
          </div>
        </div>
        <div className="main-assets-dashboard-grid">
          {largest4Assets.map((asset) => (
            <MetricCard
              key={asset.fungible_id}
              title={asset.name}
              value={formatCurrency(asset.value, 2, 2)}
              change={formatPercent(asset.change)}
              amount={`${asset.amount.toFixed(3)} ${asset.symbol}`}
              absoluteChange={formatCurrency(asset.absoluteChange, 2, 2)}
              Chart={chartState.data[asset.fungible_id] ?
                <TokenPriceChart chartData={chartState.data[asset.fungible_id]} /> :
                null}
              icon={asset.icon ? <img src={asset.icon} alt={asset.name} className="icon" /> : <CircleDollarSign />}
              handleClick={() => handleAssetClick(asset.fungible_id, asset.name, true, navigate)}
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
      {isLoading && !wallets &&
        (
          <LoadingOverlay message="Loading Asset Data..." />
        )
      }

    </div>
  );
};

export default AssetsView;