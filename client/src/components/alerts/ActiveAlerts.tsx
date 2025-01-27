import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { components } from '../../types/api-types';

type Alert = components["schemas"]["Alert"];

interface ActiveAlertsProps {
  alerts: Alert[];
  isNull: boolean;
  error: Number | null;
  onDeleteAlert: (alertId: string) => void;
}

const ActiveAlerts: React.FC<ActiveAlertsProps> = ({ alerts, isNull, error, onDeleteAlert }) => {
  const [mode, setMode] = useState<'asset' | 'wallet'>('asset');
  const [errorElement, setErrorElement] = useState<JSX.Element | null>(null);

  const formatAlertDetails = (alert: Alert) => {
    if (alert.upper_target_price || alert.lower_target_price) {
      const triggerPrice = alert.upper_target_price ? alert.upper_target_price : alert.lower_target_price as number;
      return `Target: $${triggerPrice.toLocaleString()}`;
    } else {
      // const basePrice = alert.base_price as number;
      // const basePriceStr = basePrice.toFixed(basePrice >= 1000 ? 1 : 2).toLocaleString();
      return `${alert.percent_change_threshold}%`;
    }
  };

  useEffect(() => {
    if (error) {
      let element = <></>
      switch (error) {
        case 404:
          element = <div className="error-message">
            <p>Error: {error.toString()}</p>
            <p>User not found</p>
          </div>
          break;
        case 403:
          element = <div className="">
          <p>Visit <a referrerPolicy='no-referrer' target='_blank' href="https://t.me/MatrixFinAlertsBot">Telegram Bot🤖</a> and verify your account to create Alerts!</p>
          </div>
          break;
        case 204:
          element = <div className="error-message">
            <p>No Active Alerts</p>
          </div>
          break;
        default:
          element = <div className="error-message">
            <p>Error: {error.toString()}</p>
          </div>
          break;
    }
    setErrorElement(element);
    }
    console.log(error);
    
  }, [error]);

  return (
    <div className="aa-alerts-wrapper">
      <div className="aa-alerts-header">
        <h1>Active Alerts</h1>
        <div className="mode-selector">
          <button 
            className={`mode-button ${mode === 'asset' ? 'active' : ''}`}
            onClick={() => setMode('asset')}
          >
            Asset Mode
          </button>
          <button 
            className={`mode-button ${mode === 'wallet' ? 'active' : ''}`}
            onClick={() => setMode('wallet')}
          >
            Wallet Mode
          </button>
        </div>
      </div>

      {mode === 'wallet' ? (
        <div className="coming-soon">
          <p>Wallet Mode Coming Soon</p>
        </div>
      ) : (
        <div className="aa-alerts-container">
          {(isNull || alerts.length == 0) ? (
           <div>{ error ? errorElement : <div className="no-alerts">No Active Alerts</div> }</div>
          ) : (
            <div className="alerts-grid">
              {alerts.map((alert) => (
                <div key={alert._id} className="alert-card">
                  <button
                    className="delete-button"
                    onClick={() => onDeleteAlert(alert._id)}
                  >
                    <X size={16} />
                  </button>
                  <div className="alert-info">
                    <div className="alert-header">
                      <span className="alert-asset">
                        {alert.symbol.toUpperCase()}
                      </span>
                      <span className="alert-name">{alert.name}</span>
                    </div>
                    <div className="alert-details">
                      <span className="alert-type">
                        {alert.upper_target_price || alert.lower_target_price ? 'Price Alert' : 'Change Alert'}
                      </span>
                      <span className="alert-target">
                        {formatAlertDetails(alert)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveAlerts;