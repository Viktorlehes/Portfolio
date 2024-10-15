import React from 'react';

const Temp: React.FC = () => {
  return (
	<div>
	  <iframe
		src="https://app.uniswap.org/#/swap?outputCurrency=0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
		height="660px"
		width="100%"
		style={
			{border: 0,
			margin: '0 auto',
			display: 'block',
			borderRadius: '10px',
			maxWidth: '600px',
			minWidth: '300px'}
		}
/>
	</div>
  );
};

export default Temp;