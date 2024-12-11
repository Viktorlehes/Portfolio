import React from 'react';
import { TokenTableRow } from './TokenTableRow';
import './OverviewTokensTable.css';
import { components } from '../../types/api-types';

type TokenOverviewResponse = components['schemas']['TokenOverviewData'];

interface OverviewTokensTableProps {
  tokens: TokenOverviewResponse[];
  isNull: boolean;
}

export const OverviewTokensTable: React.FC<OverviewTokensTableProps> = ({ tokens, isNull }) => {  

  const latestUpdate =() => {
    if (!isNull ? tokens[0].lastUpdated : null) {    
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
        <div className='catagories-container-update'>Last updated: {latestUpdate()}</div>
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