// import React from "react";
// import { PieChart, Pie, Cell } from "recharts";
// import { components } from "../../../types/api-types";

// type Wallet = components["schemas"]["Wallet"];

// interface tokenPieChartBreakdownProps {
//     wallets: Wallet[];
// }

// const TokenPieChartBreakdown: React.FC<tokenPieChartBreakdownProps> = ({
//     wallets,
// }) => {

//     const presetColors: string[] = ["#f2901f", "#1fbdf2", "#f21f1f", "#1ff24f", "#f21ff2"]

//     let totalValuePerAsset = Object.values(wallets.reduce((acc, wallet) => {
//         wallet.tokens?.forEach(token => {
//             const tokenData = token.token_data ? token.token_data : token.zerion_data;
//             if (tokenData) {
//                 if (!acc[tokenData.name]) {
//                     acc[tokenData.name] = { name: tokenData.name, value: 0 };
//                 }
//                 acc[tokenData.name].value += tokenData.value;
//             }
//         });
//         return acc;
//     }, {} as Record<string, { name: string, value: number }>));

//     totalValuePerAsset = totalValuePerAsset.sort((a, b) => b.value - a.value);

//     const topFourAssets = totalValuePerAsset.slice(0, 4);
//     const otherAssetsValue = totalValuePerAsset.slice(4).reduce((acc, asset) => acc + asset.value, 0);

//     if (otherAssetsValue > 0) {
//         topFourAssets.push({ name: "Other", value: otherAssetsValue });
//     }

//     totalValuePerAsset = topFourAssets;

//     return (
//         <div className="token-pie-chart-wrapper" style={{display: "flex", alignItems:"center"}}>
//         <div className="chart-container">
//             <PieChart width={200} height={200}>
//                 <Pie
//                     data={totalValuePerAsset}
//                     cx={100}
//                     cy={100}
//                     innerRadius={60}
//                     outerRadius={80}
//                     fill="#8884d8"
//                     paddingAngle={5}
//                     dataKey="value"
//                 >
//                     {totalValuePerAsset.map((asset, index) => (
//                         <Cell key={`cell-${index}`} textRendering={asset.name} fill={presetColors[index]} />
//                     ))}
//                 </Pie>
//             </PieChart>
//             <div className="total-value" style={{fontWeight:"500"}}>
//                 <p>Asset Distribution</p>
//             </div>
//         </div>

//             <div style={{marginLeft:"10px", padding:"10px", borderRadius: "8px", boxShadow:"0 4px 6px rgba(0, 0, 0, 0.1)" }}>
//                 {totalValuePerAsset.map((asset, index) => (
//                     <div key={index} className="asset-value">
//                         <div className="asset-color" style={{ backgroundColor: presetColors[index] }}></div>
//                         <p className="asset-name">{asset.name}</p>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };
// export default TokenPieChartBreakdown;
