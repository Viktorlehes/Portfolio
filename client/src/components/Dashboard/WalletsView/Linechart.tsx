import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Datapoint } from '../../../data/dashboarddata';


interface LinechartProps {
    data: Datapoint[];
}

function getWidth() {
    return document.documentElement.clientWidth - 280
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
            <Line type="monotone" dataKey="Total" stroke='#000100' />
        </LineChart>
    );
}

export default Linechart;