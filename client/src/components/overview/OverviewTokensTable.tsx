import React from 'react';
import { TokenTableRow } from './TokenTableRow';
import './OverviewTokensTable.css';
import { components } from '../../types/api-types';

type TokenOverviewResponse = components['schemas']['TokenOverviewData'];

interface OverviewTokensTableProps {
  tokens: TokenOverviewResponse[] | null;
  isNull: boolean;
}

export const OverviewTokensTable: React.FC<OverviewTokensTableProps> = ({ tokens , isNull }) => {
  return (
    <div className="table-container">
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
              <TokenTableRow key={index} data={token} rank={index+1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};