import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import './DefiPositions.css';
import { formatCurrency, formatNumber } from '../../../utils/calc';
import { ExtendedDefiPosition } from '../../../pages/Defi/Defi';

interface ProtocolGroupProps {
    protocol: string;
    positions: ExtendedDefiPosition[];
    icon?: string;
    totalValue: number;
    protocolLink: string;
}

const ProtocolGroup: React.FC<ProtocolGroupProps> = ({
    protocol,
    positions,
    icon,
    totalValue,
    protocolLink
}) => {

    const navigate = useNavigate();
    const onViewWallet = (address: string) => {
        navigate(`/dashboard/wallet/${address}`);
    };

    const groupedPositionNames = positions.reduce((acc, position) => {
        const positionName = position.position_name;
        if (!acc[positionName]) {
            acc[positionName] = {
                positions: [],
            };
        }
        acc[positionName].positions.push(position);
        return acc;

    }, {} as Record<string, { positions: ExtendedDefiPosition[] }>);

    return (
        <div className="protocol-container">
            <div className="protocol-header">
                <div className="protocol-title">
                    <div className="token-icon">
                        <img src={icon} alt={protocol} />
                    </div>
                    <div className="protocol-name">{protocol}</div>
                    <div className='section-total'>{formatCurrency(totalValue, 2, 2)}</div>
                </div>
                {protocolLink && (
                    <a
                        href={protocolLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="protocol-link"
                    >
                        Manage Positions <ArrowUpRight size={16} />
                    </a>
                )}
            </div>
            {Object.entries(groupedPositionNames).map(([positionName, { positions }]) => (
                <div className="assets-table">
                    <div>
                        <div className="position-name">{positionName}</div>
                    </div>
                    <div className="table-header">
                        <div className="col-asset">POSITION</div>
                        <div className="col-type">TYPE</div>
                        <div className="col-balance">BALANCE</div>
                        <div className="col-value">VALUE</div>
                    </div>

                    {positions.map((position) => (
                        <div 
                        key={position.id} 
                        className="table-row"
                        onClick={() => onViewWallet(position.walletAddress)}
                        >
                            <div className="col-asset">
                                <div className="asset-info">
                                    <div className="token-icon">
                                        <img src={position.icon} alt={position.name} />
                                    </div>
                                    <div className="token-details">
                                        <div className="token-name">{position.name}</div>
                                        <div className="token-chain">{position.chain}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-type">
                                <div className="position-type">
                                    {position.position_type}
                                </div>
                            </div>

                            <div className="col-balance">
                                {formatNumber(position.quantity.float, 2, 4)} {position.symbol}
                            </div>

                            <div className="col-value">
                                <div className={`value-info ${position.position_type === 'loan' ? 'loan-value' : ''}`}>
                                    <div>{formatCurrency(position.value, 2, 2)}</div>
                                    {position.changes.absolute_1d !== 0 && (
                                        <div className={`change-value ${position.changes.absolute_1d >= 0 ? 'positive' : 'negative'}`}>
                                            {position.changes.absolute_1d > 0 ? '+' : ''}
                                            {formatCurrency(position.changes.absolute_1d, 2, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const DefiPositions: React.FC<{ positions: ExtendedDefiPosition[], displayTotal?: boolean }> = ({ positions, displayTotal = true }) => {
    const groupedPositions = positions.reduce((acc, position) => {
        const protocol = position.protocol;
        if (!acc[protocol]) {
            acc[protocol] = {
                positions: [],
                totalValue: 0,
                icon: position.protocol_icon,
                protocolLink: position.protocol_link
            };
        }
        acc[protocol].positions.push(position);
        acc[protocol].totalValue += position.position_type != 'loan' ? position.value : -position.value;
        return acc;
    }, {} as Record<string, { positions: ExtendedDefiPosition[], totalValue: number, icon: string, protocolLink: string }>);

    const totalValue = Object.values(groupedPositions).reduce((sum, group) => sum + group.totalValue, 0);

    const sortedGroups = Object.fromEntries(
        Object.entries(groupedPositions).sort(([, a], [, b]) => b.totalValue - a.totalValue)
    );
    
    return (
        <div className="assets-section">
            {displayTotal &&
            <div className="section-header">
                    <div className="section-title">
                        <h2>DeFi Positions</h2>
                        <div className="section-total">{formatCurrency(totalValue, 2, 2)}</div>
                    </div>
            </div>
            }

            {Object.entries(sortedGroups).map(([protocol, { positions, totalValue, icon, protocolLink }]) => (
                <ProtocolGroup
                    key={protocol}
                    protocol={protocol}
                    positions={positions}
                    icon={icon}
                    totalValue={totalValue}
                    protocolLink={protocolLink}
                />
            ))}
        </div>
    );
};

export default DefiPositions;