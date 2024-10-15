import requests
from bs4 import BeautifulSoup
import re
# Step 1: Send a GET request to the URL
url = 'https://coinmarketcap.com/'  # Replace with the target URL
response = requests.get(url)

# Step 2: Check if the request was successful
if response.status_code == 200:
    # Step 3: Parse the content with BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')

    # Step 4: Find the desired data (adjust selectors as needed)
    # Example: Find all <h2> tags
    data = ''
    for scrape_data in soup.find_all('div', 'global-stats'):
        data += scrape_data.get_text()

        # Extract Cryptos
    cryptos_match = re.search(r'Cryptos:\s*([\d.]+[MK]?)', data)
    cryptos = cryptos_match.group(1) if cryptos_match else None

    # Extract Exchanges
    exchanges_match = re.search(r'Exchanges:\s*(\d+)', data)
    exchanges = exchanges_match.group(1) if exchanges_match else None

    # Extract Market Cap with 24h change
    market_cap_match = re.search(r'Market Cap:\s*\$([\d.]+[TBM]?)\s*([\d.]+)%', data)
    market_cap_value = market_cap_match.group(1) if market_cap_match else None
    market_cap_change = market_cap_match.group(2) if market_cap_match else None

    # Extract 24h Volume with 24h change
    vol_24h_match = re.search(r'24h Vol:\s*\$([\d.]+[TBM]?)\s*([\d.]+)%', data)
    vol_24h_value = vol_24h_match.group(1) if vol_24h_match else None
    vol_24h_change = vol_24h_match.group(2) if vol_24h_match else None

    # Extract Dominance BTC and ETH
    dominance_btc_match = re.search(r'BTC:\s*([\d.]+)%', data)
    dominance_btc = dominance_btc_match.group(1) if dominance_btc_match else None

    dominance_eth_match = re.search(r'ETH:\s*([\d.]+)%', data)
    dominance_eth = dominance_eth_match.group(1) if dominance_eth_match else None

    # Extract ETH Gas
    eth_gas_match = re.search(r'ETH Gas:\s*([\d.]+)\s*Gwei', data)
    eth_gas = eth_gas_match.group(1) if eth_gas_match else None

    # Extract Fear & Greed
    fear_greed_match = re.search(r'Fear & Greed:\s*(\d+)/100', data)
    fear_greed = fear_greed_match.group(1) if fear_greed_match else None

    # Store extracted data in a dictionary with structured market_cap and 24h_vol
    crypto_info = {
        "cryptos": cryptos,
        "exchanges": exchanges,
        "market_cap": {
            "value": market_cap_value,
            "change": market_cap_change
        },
        "24h_vol": {
            "value": vol_24h_value,
            "change": vol_24h_change
        },
        "dominance_btc": dominance_btc,
        "dominance_eth": dominance_eth,
        "eth_gas": eth_gas,
        "fear_greed": fear_greed
    }

    # Print the results
    print(data)

else:
    print(f'Failed to retrieve data: {response.status_code}')