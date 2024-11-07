import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { components } from "../../../types/api-types";

type Wallet = components["schemas"]["Wallet"];

interface walletPieChartBreakdownProps {
  wallets: Wallet[];
}

const walletPieChartBreakdown: React.FC<walletPieChartBreakdownProps> = ({
  wallets,
}) => {
  
  const walletData = wallets.map((wallet) => ({
    name: wallet.name,
    color: wallet.color,
    value: wallet.asset_total,
  }));

  return (
    <div className="dashboard-chart-container">
   
      <PieChart width={150} height={150}>
        <Pie
          data={walletData}
          cx={75}
          cy={75}
          innerRadius={45}
          outerRadius={60}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {wallets.map((wallet, index) => (
        <Cell key={`cell-${index}`} fill={wallet.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="total-value" style={{fontWeight:"500"}}> 
        <p>Wallet Distribution</p>
      </div>
    </div>
  );
};
export default walletPieChartBreakdown;
