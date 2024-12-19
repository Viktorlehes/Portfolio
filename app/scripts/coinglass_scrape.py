from pydantic import BaseModel
from typing import Optional, Literal
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import os
import logging
import subprocess
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
import requests

from app.core.config import PROXY_USERNAME, PROXY_PASSWORD

# Set up logging
#logging.basicConfig(level=logging.INFO)
#logger = logging.getLogger(__name__)

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

    model_config = {
        'populate_by_name': True
    }

class APIResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    data: CoinglassMetrics
    error: Optional[str] = None

def verify_proxy_connection():
    """Verify proxy connection using requests library"""
    if not (PROXY_USERNAME and PROXY_PASSWORD):
        return False

    proxy_url = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@us-ca.proxymesh.com:31280"
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    try:
        response = requests.get('https://api.ipify.org?format=json', 
                              proxies=proxies, 
                              timeout=10)
        if response.status_code == 200:
            #logger.info(f"Proxy connection verified. IP: {response.json().get('ip')}")
            return True
    except Exception as e:
        #logger.error(f"Proxy verification failed: {str(e)}")
        print(f"Proxy verification failed: {str(e)}")    
    return False

def get_chrome_debug_info():
    """Get Chrome and ChromeDriver version information for debugging"""
    debug_info = {}
    try:
        chrome_version = subprocess.check_output(['google-chrome', '--version']).decode()
        chromedriver_version = subprocess.check_output(['chromedriver', '--version']).decode()
        chrome_path = subprocess.check_output(['which', 'google-chrome']).decode()
        chromedriver_path = subprocess.check_output(['which', 'chromedriver']).decode()
        
        debug_info.update({
            "chrome_version": chrome_version.strip(),
            "chromedriver_version": chromedriver_version.strip(),
            "chrome_path": chrome_path.strip(),
            "chromedriver_path": chromedriver_path.strip()
        })
    except Exception as e:
        debug_info["error"] = str(e)
    
    return debug_info

def is_production():
    """Check if running in production environment"""
    return os.getenv('SCRAPE_RAILWAY_ENVIRONMENT') == 'production'

def setup_driver():
    """Initialize and configure Chrome WebDriver based on environment"""
    #logger.info("Setting up Chrome driver...")
    
    chrome_options = Options()
    
    # Basic Chrome options
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--disable-extensions')
    
    # Configure proxy if available and verified
    if PROXY_USERNAME and PROXY_PASSWORD:
        if verify_proxy_connection():
            proxy_url = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@us-ca.proxymesh.com:31280"
            chrome_options.add_argument(f'--proxy-server={proxy_url}')
            #logger.info("Proxy configuration added")
            print("Proxy configuration added")
        #logger.warning("Proxy verification failed, continuing without proxy")
    
    # Set user agent
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    
    try:
        if os.getenv('RAILWAY_ENVIRONMENT') == 'production':
            chrome_options.binary_location = "/usr/bin/google-chrome-stable"
            service = Service('/usr/local/bin/chromedriver')
            #logger.info("Using production Chrome configuration")
        else:
            service = Service(ChromeDriverManager().install())
            #logger.info("Using local development Chrome configuration")
        
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        #logger.info("Chrome driver setup successful")
        return driver
        
    except Exception as e:
        #logger.error(f"Error creating Chrome driver: {str(e)}")
        debug_info = get_chrome_debug_info()
        print(f"Chrome debug info: {debug_info}")
        #logger.error(f"Chrome debug info: {debug_info}")
        raise


def scrape_metric(driver, wait, selector: str, include_subtext: bool = False) -> Optional[MetricItem]:
    """Scrape a single metric from the page"""
    try:
        #logger.info(f"Scraping metric with selector: {selector}")
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
    except TimeoutException:
        #logger.error(f"Timeout waiting for element: {selector}")
        return None
    except Exception as e:
        #logger.error(f"Error scraping metric with selector {selector}: {str(e)}")
        return None

async def scrape_coinglass() -> APIResponse:
    """Main scraping function for Coinglass metrics"""
    driver = None
    try:
        #logger.info("Starting Coinglass scraping...")
        driver = setup_driver()
        
        #logger.info("Navigating to Coinglass...")
        driver.get('https://www.coinglass.com/')
        wait = WebDriverWait(driver, 15)
        
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        driver.implicitly_wait(5)
        
        # Define selectors
        selectors = {
            'open_interest': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(1) > div:nth-child(1)",
            'futures_volume': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(2) > div:nth-child(1)",
            'liquidations_24h': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(3) > div:nth-child(1)",
            'total_options_open_interest': "div.MuiGrid-grid-xs-3:nth-child(2) > div:nth-child(1) > a:nth-child(4) > div:nth-child(1)",
            'btc_long_short_ratio': "div.MuiGrid-grid-xs-3:nth-child(4) > div:nth-child(1) > a:nth-child(1) > div:nth-child(1)",
            'btc_dominance': "div.MuiGrid-grid-xs-3:nth-child(1) > div:nth-child(1) > a:nth-child(3) > div:nth-child(1)"
        }
        
        # Scrape metrics
        metrics = {}
        for key, selector in selectors.items():
            include_subtext = key == 'btc_long_short_ratio'
            try:
                # Try to find element first
                element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                # If found, scrape the metric
                metric = scrape_metric(driver, wait, selector, include_subtext)
                if metric:
                    metrics[key] = metric
                    #logger.info(f"Successfully scraped {key}")
                else:
                    raise Exception("Failed to parse metric data")
            except Exception as e:
                #logger.warning(f"Failed to scrape {key}: {str(e)}, using default values")
                metrics[key] = MetricItem(
                    text="N/A",
                    change="0%",
                    value="0",
                    sub_text="N/A" if include_subtext else None
                )

        coinglass_metrics = CoinglassMetrics(**metrics)
        #logger.info("Scraping completed successfully")
        
        return coinglass_metrics

    except WebDriverException as e:
        error_message = f"WebDriver error: {str(e)}"
        #logger.error(error_message)
        return None
    except Exception as e:
        error_message = str(e)
        #logger.error(f"Error during scraping: {error_message}")
        return None
    finally:
        if driver:
            try:
                driver.quit()
                #logger.info("Chrome driver closed successfully")
            except Exception as e:
               #logger.error(f"Error closing driver: {str(e)}")
               print(f"Error closing driver: {str(e)}")

if __name__ == "__main__":
    import asyncio
    result = asyncio.run(scrape_coinglass())
    print(result.model_dump_json(indent=2))