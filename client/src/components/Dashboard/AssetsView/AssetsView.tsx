import React, { useState, useEffect, useMemo, useRef } from "react";
import "./AssetsView.css";
import MetricCard from "../../overview/MetricCard";
import AssetList from "./AssetList";
import { components } from "../../../types/api-types";
import AssetOverviewSidebar from "../AssetsView/AssetOverviewSidebar";
import { Settings2, CirclePlus } from "lucide-react";
import TokenPriceChart from "./TokenPriceChart";
import { ChartData } from "./TokenPriceChart";

type Wallet = components['schemas']['Wallet']

interface AssetViewProps {
  wallets: Wallet[];
}

export interface Asset {
  name: string;
  value: number;
  change: number;
  amount: number;
  price: number;
  icon: string;
  symbol: string;
  fungible_id: string;
}

const AssetsView: React.FC<AssetViewProps> = ({ wallets }) => {
  const [showZeroValues, setShowZeroValues] = useState(false);
  const [assetCharts, setAssetCharts] = useState<Record<string, ChartData>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const { totalValueArray, largest4Assets } = useMemo(() => {
    const totalValuePerAsset = wallets.reduce((acc, wallet) => {
      wallet.tokens?.forEach(token => {
        const tokenData = token.token_data || token.zerion_data;
        if (!acc[tokenData.name]) {
          acc[tokenData.name] = {
            value: 0,
            change24h: 0,
            amount: 0,
            price: 0,
            icon: token.zerion_data.icon || '',
            symbol: tokenData.symbol,
            fungible_id: token.zerion_data.fungible_id,
            changeCount: 0 // Add a counter for number of changes
          };
        }
        acc[tokenData.name].value += tokenData.value;
        acc[tokenData.name].change24h += token.zerion_data.changes.percent_1d;
        acc[tokenData.name].changeCount += 1; // Increment counter when adding a change
        acc[tokenData.name].amount += token.zerion_data.quantity.float;
        acc[tokenData.name].price = token.zerion_data.price;
      });
      return acc;
    }, {} as Record<string, {
      value: number,
      change24h: number,
      amount: number,
      price: number,
      icon: string,
      symbol: string,
      fungible_id: string,
      changeCount: number // Add to type definition
    }>);
  
    let allAssets: Asset[] = Object.entries(totalValuePerAsset)
      .map(([name, data]) => ({
        name,
        value: data.value,
        change: data.changeCount > 0 ? data.change24h / data.changeCount : 0, 
        amount: data.amount,
        price: data.price,
        icon: data.icon,
        symbol: data.symbol,
        fungible_id: data.fungible_id
      }))
      .filter(asset => showZeroValues || asset.value >= 0.1)
      .sort((a, b) => b.value - a.value);
  
    const top4 = allAssets.slice(0, 4);
    const rest = allAssets.slice(4);
    return {
      totalValueArray: rest,
      largest4Assets: top4
    };
  }, [wallets, showZeroValues]);

  useEffect(() => {
    const fetchChart = async (fungible_id: string) => {
      // If we're already fetching this chart or have it, skip
      if (fetchingRef.current.has(fungible_id) || assetCharts[fungible_id]) {
        return;
      }

      fetchingRef.current.add(fungible_id);
      
      try {
        const response = await fetch('http://127.0.0.1:8000/dashboard/charts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fungible_id }),
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const chartData = await response.json();
        setAssetCharts(prev => ({
          ...prev,
          [fungible_id]: chartData
        }));
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        fetchingRef.current.delete(fungible_id);
      }
    };

    const fetchMissingCharts = () => {
      largest4Assets.forEach(asset => {
        if (!assetCharts[asset.fungible_id] && !fetchingRef.current.has(asset.fungible_id)) {
          fetchChart(asset.fungible_id);
        }
      });
    };

    fetchMissingCharts();
  }, [wallets, largest4Assets]); 

  return (
    <div className="asset-overview-wrapper">
      <div className="main-content">
        <div className="asset-nav">
          <h2>Main Assets</h2>
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
              value={String(asset.value.toFixed(2))}
              change={`${String(asset.change.toFixed(2))}%`}
              amount={String(asset.amount.toFixed(3))}
              Chart={assetCharts[asset.fungible_id] ? 
                <TokenPriceChart chartData={assetCharts[asset.fungible_id]} /> : 
                null}
              icon={asset.icon ? <img src={asset.icon} alt={asset.name} className="icon" /> : null}
            />
          ))}
        </div>
        <AssetList 
          assets={totalValueArray}
        />
      </div>
      <div className="asset-overview-sidebar">
        <AssetOverviewSidebar assets={totalValueArray} />
      </div>
    </div>
  );
};

export default AssetsView;