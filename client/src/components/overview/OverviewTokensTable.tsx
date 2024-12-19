import React from 'react';
import { TokenTableRow } from './TokenTableRow';
import './OverviewTokensTable.css';
import { components } from '../../types/api-types';
import { RefreshCcw } from 'lucide-react';

type TokenOverviewResponse = components['schemas']['TokenOverviewData'];

interface OverviewTokensTableProps {
  tokens: TokenOverviewResponse[] | null;
  isNull: boolean;
  reFetch: () => void;
}

export const OverviewTokensTable: React.FC<OverviewTokensTableProps> = ({ tokens, isNull, reFetch }) => {  

  const latestUpdate =() => {
    if (!isNull && tokens && tokens[0] && tokens[0].lastUpdated) {    
      const date = new Date(tokens[0].lastUpdated);
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      const swedishLocalTime = new Intl.DateTimeFormat("sv-SE", options).format(date);
      return swedishLocalTime;
    }
  };

  return (
    <div className="table-container">
      <div className='catagories-container-edit'>
        <div className='catagories-container-title'>Tokens by Market Cap</div>
        <div className='categories-container-options'>
          <div className='catagories-container-update'>Last updated: {latestUpdate()}</div>
          <RefreshCcw className={!isNull ? 'refresh-icon': 'refresh-icon refreshing'} onClick={() => reFetch()} />
        </div>
      </div>
      <div className="table-scroll">
        <table className="tokens-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Price</th>
              <th>24h%</th>
              <th>7d%</th>
              <th>Vol</th>
              <th>Vol 24h%</th>
              <th>Market Cap</th>
              <th>Inflow 24h</th>
            </tr>
          </thead>
          <tbody>
            {!isNull && tokens?.map((token, index) => (
              <TokenTableRow key={index} data={token} rank={index + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};