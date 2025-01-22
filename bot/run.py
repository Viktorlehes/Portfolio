import asyncio
import sys
from bot.bot import CryptoBot
from logger import bot_logger
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv()

def run_bot_with_restart():
    """Run the bot with retries"""
    max_retries = 5
    retry_count = 0
    retry_delay = 60  # seconds

    while retry_count < max_retries:
        try:
            # Create new bot instance
            bot = CryptoBot()
            
            # Create and set new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run the bot
            loop.run_until_complete(bot.run())
            
        except Exception as e:
            retry_count += 1
            bot_logger.error(f"Bot crashed with error: {e}", exc_info=True)
            
            if retry_count < max_retries:
                bot_logger.info(f"Restarting bot in {retry_delay} seconds... (Attempt {retry_count}/{max_retries})")
                import time
                time.sleep(retry_delay)
            else:
                bot_logger.critical("Max retries reached. Bot shutting down.")
                sys.exit(1)
        finally:
            loop.close()

if __name__ == "__main__":
    try:
        run_bot_with_restart()
    except KeyboardInterrupt:
        bot_logger.info("Bot stopped by user")
        sys.exit(0)
    except Exception as e:
        bot_logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)