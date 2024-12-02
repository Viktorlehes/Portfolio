from pydantic import BaseModel
from typing import Optional, Literal
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from collections import defaultdict

# Pydantic Models
class MetricItem(BaseModel):
    text: str
    change: str
    value: str
    sub_text: Optional[str] = None

class CoinglassMetrics(BaseModel):
    open_interest: MetricItem
    futures_volume: MetricItem
    liquidations_24h: MetricItem
    total_options_open_interest: MetricItem
    btc_long_short_ratio: MetricItem
    btc_dominance: MetricItem

    class Config:
        allow_population_by_field_name = True

class APIResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    data: Optional[CoinglassMetrics] = None
    error: Optional[str] = None

# Scraping Functions
def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def scrape_metric(driver, wait, selector: str, include_subtext: bool = False) -> Optional[MetricItem]:
    try:
        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        parts = element.text.split("\n")
        
        if include_subtext:
            return MetricItem(
                text=parts[0],
                sub_text=parts[1],
                change=parts[2],
                value=parts[3]
            )
        else:
            return MetricItem(
                text=parts[0],
                change=parts[1],
                value=parts[2]
            )
    except Exception as e:
        print(f"Error scraping metric with selector {selector}: {str(e)}")
        return None

async def scrape_coinglass() -> APIResponse:
    driver = setup_driver()
    metrics = {}
    
    try:
        driver.get('https://www.coinglass.com/')
        wait = WebDriverWait(driver, 10)
        
        selectors = {
            'open_interest': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(1) > div:nth-child(1)",
            'futures_volume': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(2) > div:nth-child(1)",
            'liquidations_24h': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(3) > div:nth-child(1)",
            'total_options_open_interest': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(4) > div:nth-child(1)",
            'btc_long_short_ratio': "div.MuiGrid-grid-xs-3:nth-child(4) > div:nth-child(1) > a:nth-child(1) > div:nth-child(1)",
            'btc_dominance': "div.MuiGrid-grid-xs-3:nth-child(1) > div:nth-child(1) > a:nth-child(3) > div:nth-child(1)"
        }
        
        # Scrape each metric
        for key, selector in selectors.items():
            include_subtext = key == 'btc_long_short_ratio'
            metric = scrape_metric(driver, wait, selector, include_subtext)
            if metric:
                metrics[key] = metric
            else:
                # Provide default values if scraping fails
                metrics[key] = MetricItem(
                    text="N/A",
                    change="0%",
                    value="0",
                    sub_text="N/A" if include_subtext else None
                )

        coinglass_metrics = CoinglassMetrics(**metrics)
        return APIResponse(
            status="success",
            message="Data scraped successfully",
            data=coinglass_metrics
        )

    except Exception as e:
        error_message = str(e)
        print(f"Error during scraping: {error_message}")
        return APIResponse(
            status="error",
            message="Failed to scrape data",
            error=error_message
        )
    finally:
        driver.quit()


if __name__ == "__main__":
    import asyncio
    result = asyncio.run(scrape_coinglass())
    print(result.model_dump_json(indent=2))