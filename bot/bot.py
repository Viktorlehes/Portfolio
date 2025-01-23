import os
import re
import secrets
import asyncio
import aiohttp
from bot.config import Config
from bson import ObjectId
from pymongo import MongoClient
from bot.logger import bot_logger
from pymongo.database import Database
from telegram import Update, BotCommand
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Set
from datetime import datetime, timedelta, timezone
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler, Application

# States for conversation handler
WAITING_FOR_EMAIL = 1

@dataclass
class AlertUser:
    email: str
    telegram_chat_id: str
    verification_code: Optional[str] = None
    is_verified: bool = False
    _id: Optional[str] = field(default_factory=lambda: str(ObjectId()), repr=True)

    def to_dict(self):
        """Convert the dataclass to a MongoDB-compatible dictionary"""
        return {
            "_id": ObjectId(self._id) if self._id else ObjectId(),
            "email": self.email,
            "telegram_chat_id": self.telegram_chat_id,
            "verification_code": self.verification_code,
            "is_verified": self.is_verified
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create an AlertUser instance from a MongoDB document"""
        if data is None:
            return None
            
        if "_id" in data:
            data["_id"] = str(data["_id"])
            
        return cls(**data)
    
@dataclass
class Alert:
    cmc_id: int
    symbol: str
    name: str
    telegram_chat_id: str  # Changed from email to telegram_chat_id
    upper_target_price: Optional[float] = None
    lower_target_price: Optional[float] = None
    percent_change_threshold: Optional[float] = None
    base_price: Optional[float] = None
    last_checked_price: Optional[float] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _id: str = field(default_factory=lambda: str(ObjectId()), repr=True)

    def to_dict(self):
        """Convert the dataclass to a MongoDB-compatible dictionary"""
        return {
            "_id": ObjectId(self._id) if self._id else ObjectId(),
            "cmc_id": self.cmc_id,
            "telegram_chat_id": self.telegram_chat_id,
            "symbol": self.symbol,
            "name": self.name,
            "upper_target_price": self.upper_target_price,
            "lower_target_price": self.lower_target_price,
            "percent_change_threshold": self.percent_change_threshold,
            "base_price": self.base_price,
            "last_checked_price": self.last_checked_price,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create an Alert instance from a MongoDB document"""
        if data is None:
            return None
            
        if "_id" in data:
            data["_id"] = str(data["_id"])
            
        return cls(**data)

    def validate(self) -> bool:
        """Validate that the alert has valid price targets"""
        has_price_target = (
            self.upper_target_price is not None or 
            self.lower_target_price is not None
        )
        has_percent_threshold = self.percent_change_threshold is not None
        return has_price_target or has_percent_threshold

class DatabaseManager:
    def __init__(self, connection_string: str):
        self.client = MongoClient(connection_string)
        # Connect to the database collection crypto_bot_db
        self.db: Database = self.client.crypto_bot_db
        self.init_db()

    def init_db(self):
        # Create indexes for faster queries
        self.db.users.create_index("email", unique=True)
        self.db.users.create_index("telegram_chat_id")
        self.db.alerts.create_index([("email", 1), ("crypto", 1)])

    def save_user(self, user: AlertUser) -> str:
        user_dict = {
            "email": user.email,
            "telegram_chat_id": user.telegram_chat_id,
            "verification_code": user.verification_code,
            "is_verified": user.is_verified
        }
        
        if user._id:
            self.db.users.update_one(
                {"_id": ObjectId(user._id)},
                {"$set": user_dict}
            )
            return user._id
        else:
            result = self.db.users.update_one(
                {"email": user.email},
                {"$set": user_dict},
                upsert=True
            )
            return str(result.upserted_id) if result.upserted_id else None

    def get_user_by_chat_id(self, chat_id: str) -> Optional[AlertUser]:
        user_doc = self.db.users.find_one({"telegram_chat_id": chat_id})
        if user_doc:
            return AlertUser(
                email=user_doc["email"],
                telegram_chat_id=user_doc["telegram_chat_id"],
                verification_code=user_doc.get("verification_code"),
                is_verified=user_doc["is_verified"],
                _id=str(user_doc["_id"])
            )
        return None

    def get_user_by_email(self, email: str) -> Optional[AlertUser]:
        user_doc = self.db.users.find_one({"email": email})
        if user_doc:
            return AlertUser(
                email=user_doc["email"],
                telegram_chat_id=user_doc["telegram_chat_id"],
                verification_code=user_doc.get("verification_code"),
                is_verified=user_doc["is_verified"],
                _id=str(user_doc["_id"])
            )
        return None

    def save_alert(self, alert: Alert) -> str:
        alert_dict = {
            "cmc_id": alert.cmc_id,
            "telegram_chat_id": alert.telegram_chat_id,
            "symbol": alert.symbol,
            "name": alert.name,
            "upper_target_price": alert.upper_target_price,
            "lower_target_price": alert.lower_target_price,
            "percent_change_threshold": alert.percent_change_threshold,
            "base_price": alert.base_price,
            "last_checked_price": alert.last_checked_price,
            "created_at": alert.created_at
        }
        
        if alert._id:
            self.db.alerts.update_one(
                {"_id": ObjectId(alert._id)},
                {"$set": alert_dict}
            )
            return alert._id
        else:
            result = self.db.alerts.insert_one(alert_dict)
            return str(result.inserted_id)
        
    def delete_alert(self, alert_id: str) -> bool:
        """Delete an alert by its ID"""
        try:
            result = self.db.alerts.delete_one({"_id": ObjectId(alert_id)})
            return result.deleted_count > 0
        except Exception as e:
            bot_logger.error(f"Error deleting alert: {e}")
            return False
        
    def get_alerts_by_email(self, email: str) -> List[Alert]:
        alerts = []
        for alert_doc in self.db.alerts.find({"email": email}):
            alerts.append(Alert(
                email=alert_doc["email"],
                symbol=alert_doc["symbol"],
                name=alert_doc["name"],
                upper_target_price=alert_doc.get("upper_target_price"),
                lower_target_price=alert_doc.get("lower_target_price"),
                percent_change_threshold=alert_doc.get("percent_change_threshold"),
                base_price=alert_doc.get("base_price"),
                last_checked_price=alert_doc.get("last_checked_price"),
                created_at=alert_doc.get("created_at", datetime.now(timezone.utc)),
                _id=str(alert_doc["_id"])
            ))
        return alerts

    def get_all_active_alerts(self) -> List[Alert]:
        """Get all alerts for verified users"""
        verified_users = self.db.users.find({"is_verified": True})
        verified_telegram_ids = [user["telegram_chat_id"] for user in verified_users]
        
        alerts = []
        for alert_doc in self.db.alerts.find({"telegram_chat_id": {"$in": verified_telegram_ids}}):
            alerts.append(Alert(
                cmc_id=alert_doc["cmc_id"],
                symbol=alert_doc["symbol"],
                name=alert_doc["name"],
                upper_target_price=alert_doc.get("upper_target_price"),
                lower_target_price=alert_doc.get("lower_target_price"),
                percent_change_threshold=alert_doc.get("percent_change_threshold"),
                base_price=alert_doc.get("base_price"),
                telegram_chat_id=alert_doc["telegram_chat_id"],
                last_checked_price=alert_doc.get("last_checked_price"),
                created_at=alert_doc.get("created_at", datetime.now(timezone.utc)),
                _id=str(alert_doc["_id"])
            ))
        
        bot_logger.info(f"Active alerts: {len(alerts)}")    
        return alerts

class PriceMonitor:
    def __init__(self, cmc_api_key: str, check_interval: int = 60):
        self.api_key = cmc_api_key
        self.check_interval = check_interval  # seconds
        self.price_cache: Dict[str, Dict] = {}  # Store latest prices
        self.last_check: Dict[str, float] = {}  # Store last check time
        
    async def get_crypto_prices(self, cmc_ids: Set[int]) -> Dict[str, Dict]:
        """Fetch prices from CoinMarketCap API"""
        
        if not cmc_ids:
            return {}
        str_cmc_ids = [str(id) for id in cmc_ids]
        
        id_string = ",".join(str_cmc_ids)
        url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    url,
                    params={'id': id_string},
                    headers={'X-CMC_PRO_API_KEY': self.api_key}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('data', {})
                    else:
                        bot_logger.error(f"Error fetching prices: {response.status}")
                        return {}
            except Exception as e:
                bot_logger.error(f"Error in API request: {e}")
                return {}

class AlertHandler:
    def __init__(self, db_manager, bot_app, price_monitor: PriceMonitor):
        self.db = db_manager
        self.bot = bot_app
        self.price_monitor = price_monitor
        self.alert_cooldowns: Dict[str, datetime] = {}  # Track when alerts were last sent 
        
    def should_send_alert(self, alert_id: str) -> bool:
        """Check if enough time has passed since last alert"""
        if alert_id not in self.alert_cooldowns:
            return True
            
        cooldown_period = timedelta(minutes=5)  # Adjust as needed
        return datetime.now() - self.alert_cooldowns[alert_id] > cooldown_period
        
    def calculate_percent_change(self, current_price: float, base_price: float) -> float:
        """Calculate percentage change from base price"""
        if base_price == 0:
            return 0
        return ((current_price - base_price) / base_price) * 100
        
    async def process_price_alerts(self, id: int, price_data: Dict, alerts: List[Alert]) -> None:
        """Process alerts for a specific cryptocurrency"""
        current_price = price_data["quote"]["USD"]["price"]
        
        alerts_to_remove = []  # Track alerts that need to be removed
        
        for alert in alerts:
            alert_id = alert._id
            
            bot_logger.info(f"Processing alert {alert_id} for {alert.name}")
            
            if not self.should_send_alert(alert_id):
                continue
                
            should_notify = False
            message = ""
            is_reminder = False

            # Initialize base price if not set (should be set from client side)
            if alert.base_price is None:
                print("Warning: Base price not set for alert")
                alert.base_price = current_price
                self.db.save_alert(alert)

            # Handle price target alerts (upper and lower)
            if alert.upper_target_price or alert.lower_target_price:
                # Check if this is the first alert trigger
                if alert.last_checked_price is None:
                    if (alert.upper_target_price and current_price >= alert.upper_target_price):
                        message = (
                            f"🚀 Initial Price Alert: {alert.name} has reached ${current_price:,.2f}, "
                            f"above your target of ${alert.upper_target_price:,.2f}"
                        )
                        should_notify = True
                        alert.last_checked_price = current_price
                    elif (alert.lower_target_price and current_price <= alert.lower_target_price):
                        message = (
                            f"📉 Price Alert: {alert.name} has fallen to ${current_price:,.2f}, "
                            f"below your target of ${alert.lower_target_price:,.2f}"
                        )
                        should_notify = True
                        alert.last_checked_price = current_price
                
                # Handle reminder alert and mark for removal
                elif alert.last_checked_price is not None:
                    price_movement = current_price - alert.last_checked_price
                    
                    if (alert.upper_target_price and price_movement > 0) or \
                    (alert.lower_target_price and price_movement < 0):
                        is_reminder = True
                        message = (
                            f"⚠️ Final Reminder: {alert.name} price is now ${current_price:,.2f}\n"
                            f"This alert will be removed after this notification."
                        )
                        should_notify = True
                        alerts_to_remove.append(alert._id)

            # Handle percent change alerts
            elif alert.percent_change_threshold:
                percent_change = self.calculate_percent_change(current_price, alert.base_price)
                if abs(percent_change) >= alert.percent_change_threshold:
                    message = (
                        f"📊 Price Change Alert: {alert.name} has changed by {percent_change:.2f}% "
                        f"from ${alert.base_price:,.2f} to ${current_price:,.2f}, "
                        f"exceeding your {alert.percent_change_threshold}% threshold"
                    )
                    should_notify = True
                    # Reset base price after notification for percent change alerts
                    alert.base_price = current_price

            # Save alert changes if needed
            if should_notify and not is_reminder:
                self.db.save_alert(alert)

            # Send notification if needed
            if should_notify:
                try:
                    await self.bot.bot.send_message(
                        chat_id=alert.telegram_chat_id,
                        text=message
                    )
                    self.alert_cooldowns[alert_id] = datetime.now()
                    bot_logger.info(f"Alert sent for {alert.name} to {alert.telegram_chat_id}")
                except Exception as e:
                    bot_logger.error(f"Error sending alert: {e}")

        # Remove alerts that have sent their final reminder
        for alert_id in alerts_to_remove:
            try:
                self.db.delete_alert(alert_id)
                bot_logger.info(f"Alert {alert_id} removed after final reminder")
            except Exception as e:
                bot_logger.error(f"Error removing alert {alert_id}: {e}")
            
class CryptoBot:
    def __init__(self):
        Config.validate()
        self.telegram_token = Config.TELEGRAM_BOT_TOKEN
        self.mongodb_uri = Config.MONGODB_URI
        self.cmc_api_key = Config.CMC_API_KEY
        
        bot_logger.info("Initializing CryptoBot...")
        try:
            # Initialize database
            self.db = DatabaseManager(self.mongodb_uri)
            bot_logger.info("Database connected")
            
            # Initialize price monitoring components
            self.price_monitor = PriceMonitor(self.cmc_api_key)
            bot_logger.info("Price monitor initialized")
            
            # Initialize Telegram application
            self.app = ApplicationBuilder().token(self.telegram_token).build()
            bot_logger.info("Telegram application created")
            
            # Initialize alert handler
            self.alert_handler = AlertHandler(self.db, self.app, self.price_monitor)
            bot_logger.info("Alert handler initialized")
            
            # Setup handlers and commands
            self.setup_handlers()
            bot_logger.info("Handlers setup complete")
            self.app.post_init = self.setup_commands
            bot_logger.info("Commands setup complete")
            self.app.post_init = self.start_price_monitoring
            bot_logger.info("Handlers and commands setup complete")
            
        except Exception as e:
            bot_logger.error(f"Error initializing bot: {e}", exc_info=True)
            raise

    def setup_handlers(self):
        try:
            bot_logger.info("Setting up command handlers")
            
            # Create conversation handler
            conv_handler = ConversationHandler(
                entry_points=[CommandHandler("start", self.start)],
                states={
                    WAITING_FOR_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.process_email)]
                },
                fallbacks=[CommandHandler("cancel", self.cancel)]
            )
            
            # Add all handlers
            self.app.add_handler(conv_handler)
            self.app.add_handler(CommandHandler("verify", self.verify_code))
            self.app.add_handler(CommandHandler("status", self.status))
            self.app.add_handler(CommandHandler("menu", self.show_menu))
            
            # Add job for price checking
            # self.app.job_queue.run_repeating(
            #     self.check_prices_job,
            #     interval=60,  # Check every 60 seconds
            #     first=10,  # Start after 10 seconds to allow bot to fully initialize
            #     name='price_check',
            #     job_kwargs={'misfire_grace_time': 30}  # Allow job to be delayed up to 30 seconds
            # )
             
        except Exception as e:
            bot_logger.error(f"Error setting up handlers: {e}", exc_info=True)
            raise

    async def start_price_monitoring(self, application: Application) -> None:
        """Start the price monitoring in a background task"""
        bot_logger.info("Starting price monitoring task")
        while True:
            try:
                await self.check_prices_job(None)
                await asyncio.sleep(60)  # Wait for 60 seconds before next check
            except asyncio.CancelledError:
                break
            except Exception as e:
                bot_logger.error(f"Error in price monitoring: {e}")
                await asyncio.sleep(5)  # Short delay on error before retrying

    async def check_prices_job(self, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Job for checking prices and sending alerts"""
        try:
            # Get all active alerts
            alerts = self.db.get_all_active_alerts()
            if not alerts:
                return
            
            # Get unique cryptocurrencies to check
            crypto_ids = {alert.cmc_id for alert in alerts}
            
            # Fetch latest prices
            price_data = await self.alert_handler.price_monitor.get_crypto_prices(crypto_ids)
            
            bot_logger.info(f"Checking prices for {len(crypto_ids)} cryptocurrencies")
            
            # Process each cryptocurrency
            for id in crypto_ids:
                if id not in price_data:
                    continue
                    
                crypto_alerts = [alert for alert in alerts if alert.cmc_id == id]
                crypto_price_data = price_data[id]  # Get first quote for the symbol
                    
                await self.alert_handler.process_price_alerts(id, crypto_price_data, crypto_alerts)
                
        except Exception as e:
            bot_logger.error(f"Error in price check job: {e}", exc_info=True)

    async def setup_commands(self, application: Application) -> None:
        """Set up the commands menu in Telegram"""
        try:
            commands = [
                BotCommand("start", "Start the bot and register your email"),
                BotCommand("verify", "Verify your email with the code"),
                BotCommand("status", "Show your active alerts"),
                BotCommand("menu", "Show available commands"),
                BotCommand("cancel", "Cancel the current operation")
            ]
            await application.bot.set_my_commands(commands)
            bot_logger.info("Commands menu setup complete")
        except Exception as e:
            bot_logger.error(f"Error setting up commands: {e}", exc_info=True)

    async def show_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Show available commands and their descriptions"""
        
        chat_id = str(update.effective_chat.id)
        user = self.db.get_user_by_chat_id(chat_id)
        
        if not user:
            menu_text = (
                "🤖 *Available Commands:*\n\n"
                "• /start - Start the bot and register your email\n"
                "• /verify - Verify your email with the code\n"
                "• /menu - Show this menu\n"
                "• /cancel - Cancel the current operation\n\n"
                "📱 *How to use:*\n"
                "1. Use /start to register your email\n"
                "2. Verify your email with the code\n"
                "3. Set up alerts through the website\n"
                "4. Use /status to check your alerts"
            )
        else:    
            menu_text = (
                "🤖 *Available Commands:*\n\n"
                "• /menu - Show this menu\n"
                "• /status - Show your active alerts\n"
                "• /cancel - Cancel the current operation\n\n"
                "📱 *How to use:*\n"
                "1. Set up alerts through the website\n"
                "2. Use /status to check your alerts"
            )
        
        await update.message.reply_text(
            menu_text,
            parse_mode='Markdown'
        )

    # async def clear_chat(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    #     """Clear the chat and show active alerts"""
    #     chat_id = str(update.effective_chat.id)
    #     message_id = update.message.message_id
    #     user = self.db.get_user_by_chat_id(chat_id)
        
    #     # Delete the command message itself
    #     await update.message.delete()
        
    #     try:
    #         # Delete messages from newest to oldest (last 100 messages)
    #         for i in range(message_id, message_id - 100, -1):
    #             try:
    #                 await context.bot.delete_message(chat_id=chat_id, message_id=i)
    #             except Exception:
    #                 # Skip if message can't be deleted or doesn't exist
    #                 continue
                    
    #     except Exception as e:
    #         print(f"Error clearing chat: {e}")
        
    #     # Show welcome message and active alerts
    #     welcome_text = "🧹 Chat cleared! Here are your active alerts:\n\n"
    #     await context.bot.send_message(
    #         chat_id=chat_id,
    #         text=welcome_text
    #     )
        
    #     # Reuse status command to show alerts
    #     if user and user.is_verified:
    #         alerts = self.db.get_alerts_by_email(user.email)
    #         if not alerts:
    #             await context.bot.send_message(
    #                 chat_id=chat_id,
    #                 text="You don't have any active alerts.\n"
    #                      "Set up alerts through the website to receive notifications here."
    #             )
    #             return
            
    #         alert_messages = []
    #         for alert in alerts:
    #             msg = f"🔔 {alert.crypto}:\n"
    #             if alert.upper_target_price:
    #                 msg += f"  • Upper target: ${alert.upper_target_price:,.2f}\n"
    #             if alert.lower_target_price:
    #                 msg += f"  • Lower target: ${alert.lower_target_price:,.2f}\n"
    #             if alert.percent_change_threshold:
    #                 msg += f"  • Change threshold: {alert.percent_change_threshold}%\n"
    #                 if alert.base_price:
    #                     msg += f"  • Base price: ${alert.base_price:,.2f}\n"
    #             alert_messages.append(msg)
            
    #         await context.bot.send_message(
    #             chat_id=chat_id,
    #             text="Your active alerts:\n\n" + "\n".join(alert_messages)
    #         )

    def generate_verification_code(self) -> str:
        return secrets.token_hex(3)  # 6 character hex code

    def is_valid_email(self, email: str) -> bool:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return re.match(pattern, email) is not None

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        chat_id = str(update.effective_chat.id)
        user = self.db.get_user_by_chat_id(chat_id)
        
        if user and user.is_verified:
            await update.message.reply_text(
                f"Welcome back! You're already verified with email: {user.email}\n"
                "Use /status to see your current alerts."
            )
            return ConversationHandler.END
        
        await update.message.reply_text(
            "Welcome to the Crypto Alert Bot! 🤖\n"
            "Please enter your email address to get started."
        )
        return WAITING_FOR_EMAIL

    async def process_email(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        email = update.message.text.lower().strip()
        chat_id = str(update.effective_chat.id)
        
        if not self.is_valid_email(email):
            await update.message.reply_text(
                "That doesn't look like a valid email address. Please try again:"
            )
            return WAITING_FOR_EMAIL
        
        # Check if email exists in database
        existing_user = self.db.get_user_by_email(email)
        if existing_user and existing_user.is_verified:
            await update.message.reply_text(
                "This email is already registered with another Telegram account. "
                "Please use a different email address."
            )
            return WAITING_FOR_EMAIL
        
        # Generate verification code
        verification_code = self.generate_verification_code()
        
        # Save user data
        user = AlertUser(
            email=email,
            telegram_chat_id=chat_id,
            verification_code=verification_code,
            is_verified=False
        )
        self.db.save_user(user)
        
        # In a real application, send this code via email
        await update.message.reply_text(
            f"Great! I've generated a verification code for you: {verification_code}\n\n"
            "In a real application, this would be sent to your email.\n"
            "To verify your account, use the command:\n"
            "/verify <code>"
        )
        
        return ConversationHandler.END

    async def verify_code(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = str(update.effective_chat.id)
        user = self.db.get_user_by_chat_id(chat_id)
        
        if not user:
            await update.message.reply_text(
                "Please start the registration process first with /start"
            )
            return
            
        if user.is_verified:
            await update.message.reply_text("Your account is already verified!")
            return
            
        try:
            code = context.args[0]
        except (IndexError, ValueError):
            await update.message.reply_text(
                "Please provide the verification code:\n"
                "/verify <code>"
            )
            return
            
        if code == user.verification_code:
            user.is_verified = True
            user.verification_code = None
            self.db.save_user(user)
            
            await update.message.reply_text(
                "✅ Email verified successfully!\n"
                "You can now receive crypto alerts through this chat.\n"
                "Use /status to check your current alerts."
            )
        else:
            await update.message.reply_text(
                "❌ Invalid verification code. Please try again."
            )

    async def status(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        chat_id = str(update.effective_chat.id)
        user = self.db.get_user_by_chat_id(chat_id)
        
        if not user or not user.is_verified:
            await update.message.reply_text(
                "Please verify your account first.\n"
                "Use /start to begin the verification process."
            )
            return
        
        alerts = self.db.get_alerts_by_email(user.email)
        if not alerts:
            await update.message.reply_text(
                "You don't have any active alerts.\n"
                "Set up alerts through the Matrix.fin to receive notifications here."
            )
            return
        
        alert_messages = []
        for alert in alerts:
            msg = f"🔔 {alert.name} - {alert.symbol}:\n"
            if alert.upper_target_price:
                msg += f"  • Target: ${alert.upper_target_price:,.2f}\n"
            if alert.lower_target_price:
                msg += f"  • Target: ${alert.lower_target_price:,.2f}\n"
            if alert.percent_change_threshold:
                msg += f"  • Change threshold: {alert.percent_change_threshold}%\n"
                if alert.base_price:
                    msg += f"  • From: ${alert.base_price:,.2f}\n"
            alert_messages.append(msg)
        
        await update.message.reply_text(
            "Your active alerts:\n\n" + "\n".join(alert_messages)
        )

    async def cancel(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        await update.message.reply_text("Registration cancelled. Use /start to begin again.")
        return ConversationHandler.END

    def run(self) -> None:
        """Run the bot"""
        try:
            bot_logger.info("Starting bot...")
            self.app.run_polling(allowed_updates=Update.ALL_TYPES)
        except Exception as e:
            bot_logger.error(f"Error running bot: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    bot = CryptoBot()
    try:
        bot.run()
    except KeyboardInterrupt:
        print("Bot stopped by user")
    except Exception as e:
        print(f"Error occurred: {e}")
        
        
# Example of creating different types of alerts
# def create_upper_price_alert(email: str, crypto: str, target_price: float):
#     alert = Alert(
#         email=email,
#         crypto=crypto,
#         upper_target_price=target_price
#     )
#     db.save_alert(alert)

# def create_lower_price_alert(email: str, crypto: str, target_price: float):
#     alert = Alert(
#         email=email,
#         crypto=crypto,
#         lower_target_price=target_price
#     )
#     db.save_alert(alert)

# def create_percent_change_alert(email: str, crypto: str, threshold: float):
#     alert = Alert(
#         email=email,
#         crypto=crypto,
#         percent_change_threshold=threshold,
#         base_price=None  # Will be set on first price check
#     )
#     db.save_alert(alert)