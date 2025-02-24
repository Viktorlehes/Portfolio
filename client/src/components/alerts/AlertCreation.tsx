import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader } from 'lucide-react';
import debounce from 'lodash/debounce';
import { components } from '../../types/api-types';
import { CreateAlertData } from '../../pages/Alerts/Alerts';

type Token = components["schemas"]["UnifiedToken"];

interface AlertCreationProps {
  onCreateAlert: (alert: CreateAlertData) => Promise<number | null>;
  fetchAssets: (query: string) => Promise<Token[]>;
}

const AlertCreation: React.FC<AlertCreationProps> = ({
  onCreateAlert,
  fetchAssets
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Token | null>(null);
  const [alertType, setAlertType] = useState<'price' | 'change'>('price');
  const [threshold, setThreshold] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null)

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchAssets(term) as Token[];
        if (results.length === 0) {
          setError('No assets found');
        }
        setSearchResults(results);
      } catch (err) {
        setError('Error searching assets');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [fetchAssets]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const handleCreateAlert = async () => {
    if (!selectedAsset || !threshold) return;

    let alert: CreateAlertData = {
      id: selectedAsset.cmc_id,
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      base_price: selectedAsset.price_data.price,
    };

    if (alertType === 'price') {
      if (Number(threshold) > selectedAsset.price_data.price) {
        const response = await onCreateAlert({
          ...alert,
          upper_target_price: Number(threshold),
        });
        if (response && response == 403) {
          setSubmitError("Verify your account before creating alert")
        } else if (response) {
          setSubmitError("Something went wrong")
        }
      } else {
        const response = await onCreateAlert({
          ...alert,
          lower_target_price: Number(threshold),
        });
        if (response && response == 403) {
          setSubmitError("Verify your account before creating alert")
        } else if (response) {
          setSubmitError("Something went wrong")
        }
      }
    } else {
      const response = await onCreateAlert({
        ...alert,
        percent_change_threshold: Number(threshold),
      });
      if (response && response == 403) {
        setSubmitError("Verify your account before creating alert")
      } else if (response) {
        setSubmitError("Something went wrong")
      }
    }

    setSelectedAsset(null);
    setThreshold('');
    setSearchTerm('');
  };

  const handleAssetSelect = (asset: Token) => {
    setSelectedAsset(asset);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (alertType === 'change') {
      const numValue = Number(value);
      if (numValue <= 100 && numValue >= -100) {
        setThreshold(value);
      }
    } else {
      setThreshold(value);
    }
  };

  const getPresetButtons = () => {
    if (!selectedAsset) return null;
    
    const currentPrice = selectedAsset.price_data.price;
    
    if (alertType === 'price') {
      const presets = [
        { label: '-10%', value: (currentPrice * 0.9).toFixed(2) },
        { label: '-5%', value: (currentPrice * 0.95).toFixed(2) },
        { label: '+5%', value: (currentPrice * 1.05).toFixed(2) },
        { label: '+10%', value: (currentPrice * 1.1).toFixed(2) }
      ];

      return (
        <div className="preset-buttons">
          {presets.map(preset => (
            <button
              key={preset.label}
              type="button"
              className="preset-button"
              onClick={() => setThreshold(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      );
    }

    const changePresets = ['-10', '-5', '+5', '+10'];
    return (
      <div className="preset-buttons">
        {changePresets.map(preset => (
          <button
            key={preset}
            type="button"
            className="preset-button"
            onClick={() => setThreshold(preset.startsWith('+') ? preset.slice(1) : preset)}
          >
            {preset}%
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="ac-creation-wrapper">
      <div className="ac-creation-header">
        <h1>Create Alert</h1>
      </div>
      
      <div className="ac-creation-form">
        <div className="form-group">
          <label>Select Asset</label>
          {!selectedAsset ? (
            <div className="search-container">
              <Search className="search-icon" />
              <input
                className="search-input"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          ) : (
            <div className="search-result-item">
              <div>
                <span className="asset-symbol">{selectedAsset.symbol}</span>
                {(selectedAsset.symbol != selectedAsset.name) && <span className="asset-name"> - {selectedAsset.name}</span>}
                <span className="asset-name"> {`$${selectedAsset.price_data.price.toFixed(2)}`}</span>
              </div>
              <button 
                className="ac-change-button"
                onClick={() => setSelectedAsset(null)}
              >
                Change
              </button>
            </div>
          )}

          {searchTerm.length >= 2 && !selectedAsset && (
            <div className={!isLoading ? "search-results" : "search-results-loading"}>
              {isLoading ? (
                <div className="loading-spinner">
                  <Loader className="animate-spin" />
                </div>
              ) : error ? (
                <div className="search-result-item">{error}</div>
              ) : (
                searchResults.map((asset) => (
                  <div
                    key={asset.id}
                    className="search-result-item"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <span className="asset-symbol">{asset.symbol}</span>
                    <span className="asset-name">{asset.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Alert Type</label>
          <div className="alert-type-selector">
            <button
              className={`type-button ${alertType === 'price' ? 'active' : ''}`}
              onClick={() => {
                setAlertType('price')
                setThreshold('');
            }}
            >
              Price Alert
            </button>
            <button
              className={`type-button ${alertType === 'change' ? 'active' : ''}`}
              onClick={() => {
                setAlertType('change')
                setThreshold('');
            }}
            >
              Change Alert
            </button>
          </div>
        </div>

        <div className="form-group">
          {selectedAsset && (
            <label>Current Price: ${selectedAsset.price_data.price.toFixed(2)}</label>
          )}
          <div className="input-with-symbol">
            {alertType === 'price' ? <span className="currency-symbol">$</span>
            : <span className="currency-symbol">%</span> }
            <input
              type="number"
              className={`threshold-input ${alertType === 'price' ? 'with-currency' : 'with-percent'}`}
              placeholder={alertType === 'price' ? 'Target Price' : 'Threshold'}
              value={threshold}
              onChange={handleThresholdChange}
            />
          </div>
          {selectedAsset && getPresetButtons()}
          {submitError ? <span className='submit-error'>{submitError}</span> : null}
        </div>

        <button
          className="create-alert-button"
          onClick={handleCreateAlert}
          disabled={!selectedAsset || !threshold}
        >
          Create Alert
        </button>
      </div>
    </div>
  );
};

export default AlertCreation;