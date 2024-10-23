import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { components } from "../../../types/api-types";

type Wallet = components["schemas"]["Wallet"];

interface tokenPieChartBreakdownProps {
  wallets: Wallet[];
}

const TokenPieChartBreakdown: React.FC<tokenPieChartBreakdownProps> = ({
  wallets,
}) => {

    console.log(wallets);
    

  const walletData = wallets.map((wallet) => ({
    name: wallet.name,
    color: wallet.color,
    value: wallet["tokens"].reduce((sum, token) => sum + token.value, 0),
  }));

  console.log(walletData);
  

  return (
    <div className="chart-container">
   
      <PieChart width={200} height={200}>
        <Pie
          data={walletData}
          cx={100}
          cy={100}
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {wallets.map((wallet, index) => (
            <Cell key={`cell-${index}`} fill={wallet.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="total-value">
        <p>Wallet Distribution</p>
      </div>
    </div>
  );
};
export default TokenPieChartBreakdown;
