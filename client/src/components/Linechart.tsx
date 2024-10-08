import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface FinancialData {
    name: string;
    Coinbase: number;
    Nexo: number;
    Uniswap: number;
}

interface LinechartProps {
    data: FinancialData[];
}

function getWidth() {
    const w1 = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
      ) * 0.8 
    
    const w2 = 1152; 
    return w1 < w2 ? w1 : w2;
}

const Linechart: React.FC<LinechartProps> = ({ data }) => {
    return (
        <LineChart width={getWidth()} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Coinbase" stroke="#8884d8" />
            <Line type="monotone" dataKey="Nexo" stroke="#ff7300" />
            <Line type="monotone" dataKey="Uniswap" stroke="#82ca9d" />
        </LineChart>
    );
}

export default Linechart;