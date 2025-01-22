import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_bot_logger():
    # Create logs directory if it doesn't exist
    os.makedirs('logs/bot', exist_ok=True)
    
    # Set up logger
    logger = logging.getLogger('bot_logger')
    logger.setLevel(logging.INFO)
    
    # Create handlers
    # File handler with rotation
    file_handler = RotatingFileHandler(
        f'logs/bot/bot_{datetime.now().strftime("%Y-%m-%d")}.log',
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    
    # Create formatters and add it to handlers
    file_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_format = logging.Formatter(
        '%(asctime)s - BOT - %(levelname)s - %(message)s'
    )
    
    file_handler.setFormatter(file_format)
    console_handler.setFormatter(console_format)
    
    # Add handlers to the logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Create logger instance
bot_logger = setup_bot_logger()