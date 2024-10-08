import React from 'react';

interface PieChartProps {
  value1: number;
  value2: number;
}

const PieChart: React.FC<PieChartProps> = ({ value1, value2 }) => {
  const styles = `
    .pie-chart-container {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: conic-gradient(
        #e5727f 0deg ${value1 * 3.6}deg,
        #8dba69 ${value1 * 3.6}deg 360deg
      );
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .pie-chart-label {
      position: absolute;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: #000000;
    }
    .label-1 {
      top: 45%;
      left: 40%;
      transform: translate(-50%, -50%);
    }
    .label-2 {
      top: 20%;
      right: 20%;
    }
  `;

  return (
    <div style={{ padding: '20px' }}>
      <style>{styles}</style>
      <div className="pie-chart-container">
        <span className="pie-chart-label label-1">{value2}%</span>
        <span className="pie-chart-label label-2">{value1}%</span>
      </div>
    </div>
  );
};

export default PieChart;


// import React from 'react';
// import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

// interface PieChartProps {
//   value1: number;
//   value2: number;
// }

// const CustomPieChart: React.FC<PieChartProps> = ({ value1, value2 }) => {
//   const data = [
//     { name: 'Value 1', value: value1 },
//     { name: 'Value 2', value: value2 },
//   ];

//   const COLORS = ['#8dba69', '#e5727f'];

//   return (
//     <ResponsiveContainer width="100%" height={250}>
//       <PieChart>
//         <Pie
//           data={data}
//           cx="50%"
//           cy="50%"
//           innerRadius={60}
//           outerRadius={80}
//           fill="#8884d8"
//           paddingAngle={0}
//           dataKey="value"
//         >
//           {data.map((_, index) => (
//             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//           ))}
//           <Label
//             value={`${value1} / ${value2}`}
//             position="center"
//             fill="#000000"
//             style={{
//               fontSize: '20px',
//               fontWeight: 'bold'
//             }}
//           />
//         </Pie>
//       </PieChart>
//     </ResponsiveContainer>
//   );
// };

// export default CustomPieChart;