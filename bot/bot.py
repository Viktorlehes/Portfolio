import os
import re
import secrets
import asyncio
import telegram
import traceback
from bot.config import Config
from bson import ObjectId
from pymongo import UpdateOne
from bot.logger import bot_logger
from motor.motor_asyncio import AsyncIOMotorClient
from telegram import Update, BotCommand
from typing import Optional, List, Dict, Set
from datetime import datetime, timedelta, timezone
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler, Application
from bot.bot_types import UnifiedToken, AlertUser, Alert

# States for conversation handler
WAITING_FOR_EMAIL = 1

class DatabaseManager:
    def __init__(self, connection_string: str):
        self.client = AsyncIOMotorClient(connection_string)
        # Connect to the database collection crypto_bot_db
        self.crypto_bot_db = self.client.crypto_bot_db
        self.client_db = self.client.Main
        #self.init_db()

    def init_db(self):
        # Create indexes for faster queries
        #TODO: Fix index conflicts
        self.crypto_bot_db.users.create_index("email", unique=True)
        self.crypto_bot_db.users.create_index("telegram_chat_id")
        self.crypto_bot_db.alerts.create_index([("email", 1), ("crypto", 1)])

    async def save_user(self, user: AlertUser) -> str:
        """
        Save or update a user in the database.
        Returns the user's ID as a string.
        """
        user_dict = {
            "email": user.email,
            "telegram_chat_id": user.telegram_chat_id,
            "verification_code": user.verification_code,
            "is_verified": user.is_verified
        }
        
        # Check if user exists
        existing_user = await self.crypto_bot_db.users.find_one({"email": user.email})
        bot_logger.info(f"Found user: {existing_user}")
        
        if existing_user:
            # Update existing user
            result = await self.crypto_bot_db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": user_dict}
            )
            bot_logger.info(f"Updated user document. Modified count: {result.modified_count}")
            return str(existing_user["_id"])

    async def get_user_by_chat_id(self, chat_id: str) -> Optional[AlertUser]:
        user_doc = await self.crypto_bot_db.users.find_one({"telegram_chat_id": chat_id})
        
        await self.crypto_bot_db.users.update_one(
            {"telegram_chat_id": chat_id},
            {"$set": {"last_active": datetime.now(timezone.utc)}}
            )
        
        if user_doc:
            return AlertUser(**user_doc)
        return None

    async def get_token_prices(self, cmc_ids: List[int]) -> Dict[int, UnifiedToken]:
        try:
            # Convert cursor to list of documents in one operation
            documents = await self.client_db.tokens.find(
                {"cmc_id": {"$in": cmc_ids}}
            ).to_list(None)
            
            # Debug log to see what we got back
            bot_logger.info(f"Found {len(documents)} tokens in DB for {len(cmc_ids)} requested IDs")
            
            if documents:
                # Update last_active timestamp for all found tokens
                current_time = datetime.now(timezone.utc)
                update_operations = [
                    UpdateOne(
                        {"cmc_id": doc["cmc_id"]},
                        {"$set": {"last_active": current_time}}
                    )
                    for doc in documents
                ]
                
                if update_operations:
                    # Perform bulk update
                    result = await self.client_db.tokens.bulk_write(update_operations)
                    bot_logger.info(f"Updated last_active for {result.modified_count} tokens")
                
                # Create a dictionary mapping cmc_id to document
                return {doc["cmc_id"]: doc for doc in documents}
            else:
                bot_logger.warning(f"No tokens found for IDs: {cmc_ids}")
                return {}
        except Exception as e:
            bot_logger.error(f"Error getting tokens from DB: {str(e)}")
            return {}

    async def get_user_by_email(self, email: str) -> Optional[AlertUser]:
        user_doc = await self.crypto_bot_db.users.find_one({"email": email})
        if user_doc:
            return AlertUser(
                email=user_doc["email"],
                telegram_chat_id=user_doc["telegram_chat_id"],
                verification_code=user_doc.get("verification_code"),
                is_verified=user_doc["is_verified"],
                _id=str(user_doc["_id"])
            )
        return None

    async def save_alert(self, alert: Alert) -> str:
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
        
        if alert.id:
            await self.crypto_bot_db.alerts.update_one(
                {"_id": ObjectId(alert._id)},
                {"$set": alert_dict}
            )
            return alert.id
        else:
            result = await self.crypto_bot_db.alerts.insert_one(alert_dict)
            return str(result.inserted_id)
        
    async def delete_alert(self, alert_id: str) -> bool:
        """Delete an alert by its ID"""
        try:
            result = await self.crypto_bot_db.alerts.delete_one({"_id": ObjectId(alert_id)})
            return result.deleted_count > 0
        except Exception as e:
            bot_logger.error(f"Error deleting alert: {e}")
            return False
        
    async def get_alerts_by_telegram_chat_id(self, telegram_chat_id: str) -> List[Alert]:
        alerts = []
        for alert_doc in await self.crypto_bot_db.alerts.find({"telegram_chat_id": telegram_chat_id}).to_list(None):
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
                id=str(alert_doc["id"])
            ))
        return alerts

    async def get_all_active_alerts(self) -> List[Alert]:
        """Get all alerts for verified users"""
        verified_users = await self.crypto_bot_db.users.find({"is_verified": True}).to_list(None)
        verified_telegram_ids = [user["telegram_chat_id"] for user in verified_users]
        
        alerts = []
        for alert_doc in await self.crypto_bot_db.alerts.find({"telegram_chat_id": {"$in": verified_telegram_ids}}).to_list(None):
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
                id=str(alert_doc["id"])
            ))
        
        bot_logger.info(f"Active alerts: {len(alerts)}")    
        return alerts

class PriceMonitor:
    def __init__(self, cmc_api_key: str, db_manager: DatabaseManager,   check_interval: int = 60):
        self.api_key = cmc_api_key
        self.check_interval = check_interval  # seconds
        self.price_cache: Dict[str, Dict] = {}  # Store latest prices
        self.last_check: Dict[str, float] = {}  # Store last check time
        self.db = db_manager
        
    async def get_crypto_prices_via_db(self, cmc_ids: Set[int]) -> Dict[str, UnifiedToken]:
        """Fetch prices from DB"""
        #self.client_db
        if not cmc_ids:
            return {}
        
        try: 
            tokens = await self.db.get_token_prices(cmc_ids)            
            #TODO: Implement last_active logic to make sure tokens stay active when used for alerts
            
            if tokens:
                return tokens
            else:
                return {}
        except Exception as e:
            print(f"Error getting tokens from DB: {str(e)}")
            return {}

class AlertHandler:
    def __init__(self, db_manager: DatabaseManager, bot_app, price_monitor: PriceMonitor):
        self.db = db_manager
        self.bot = bot_app
        self.price_monitor = price_monitor
        self.alert_cooldowns: Dict[str, datetime] = {}  # Track when alerts were last sent 
        
    def should_send_alert(self, alert_id: str) -> bool:
        """Check if enough time has passed since last alert"""
        if alert_id not in self.alert_cooldowns:
            return True
            
        cooldown_period = timedelta(minutes=5)  # Adjust as needed
        return datetime.now(timezone.utc) - self.alert_cooldowns[alert_id] > cooldown_period
        
    def calculate_percent_change(self, current_price: float, base_price: float) -> float:
        """Calculate percentage change from base price"""
        if base_price == 0:
            return 0
        return ((current_price - base_price) / base_price) * 100
        
    async def process_price_alerts(self, id: int, price_data: UnifiedToken, alerts: List[Alert]) -> None:
        """Process alerts for a specific cryptocurrency"""
        current_price = price_data.price_data.price
        
        alerts_to_remove = []  # Track alerts that need to be removed
        
        for alert in alerts:
            alert_id = alert.id
            
            if not self.should_send_alert(alert_id):
                continue
                
            should_notify = False
            message = ""
            is_reminder = False

            # Initialize base price if not set (should be set from client side)
            if alert.base_price is None:
                print("Warning: Base price not set for alert")
                alert.base_price = current_price
                await self.db.save_alert(alert)

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
                        alerts_to_remove.append(alert.id)
                        
            # Handle percent change alerts
            elif alert.percent_change_threshold:
                percent_change = self.calculate_percent_change(current_price, alert.base_price)
                
                # Check if threshold is met based on direction
                threshold_met = (
                    (alert.percent_change_threshold > 0 and percent_change >= alert.percent_change_threshold) or
                    (alert.percent_change_threshold < 0 and percent_change <= alert.percent_change_threshold)
                )
                
                if threshold_met:
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
                await self.db.save_alert(alert)

            # Send notification if needed
            if should_notify:
                bot_logger.info(f"Sending alert to user {alert.telegram_chat_id} for alert {alert.symbol}")
                try:
                    await self.bot.bot.send_message(
                        chat_id=alert.telegram_chat_id,
                        text=message
                    )
                    self.alert_cooldowns[alert_id] = datetime.now(timezone.utc)
                    bot_logger.info(f"Alert sent for {alert.name} to {alert.telegram_chat_id}")
                except Exception as e:
                    bot_logger.error(f"Error sending alert: {e}")

        # Remove alerts that have sent their final reminder
        for alert_id in alerts_to_remove:
            try:
                await self.db.delete_alert(alert_id)
                bot_logger.info(f"Alert {alert_id} removed after final reminder")
            except Exception as e:
                bot_logger.error(f"Error removing alert {alert_id}: {e}")
            
class CryptoBot:
    def __init__(self):
        Config.validate()
        self.telegram_token = Config.TELEGRAM_BOT_TOKEN
        self.mongodb_uri = Config.MONGODB_URI
        self.cmc_api_key = Config.CMC_API_KEY
        self._running = False
        self._loop = None
        
        bot_logger.info("Initializing CryptoBot...")
        try:
            # Initialize database
            self.db = DatabaseManager(self.mongodb_uri)
            bot_logger.info("Database connected")
            
            # Initialize price monitoring components
            self.price_monitor = PriceMonitor(self.cmc_api_key, self.db)
            bot_logger.info("Price monitor initialized")
            
            # Initialize Telegram application
            self.app = (ApplicationBuilder()
                       .token(self.telegram_token)
                       .concurrent_updates(False)
                       .build())
            bot_logger.info("Telegram application created")
            
            # Add error handlers
            self.app.add_error_handler(self.error_handler)
            bot_logger.info("Error handlers added")
            
            # Initialize alert handler
            self.alert_handler = AlertHandler(self.db, self.app, self.price_monitor)
            bot_logger.info("Alert handler initialized")
            
            # Setup handlers and commands
            self.setup_handlers()
            bot_logger.info("Handlers setup complete")
            self.app.post_init = self.setup_commands
            bot_logger.info("Commands setup complete")
            
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
            
            #Add job for price checking
            self.app.job_queue.run_repeating(
                self.check_prices_job,
                interval=60,  # Check every 60 seconds
                first=10,  # Start after 10 seconds to allow bot to fully initialize
                name='price_check',
                job_kwargs={'misfire_grace_time': 30}  # Allow job to be delayed up to 30 seconds
            )
            
        except Exception as e:
            bot_logger.error(f"Error setting up handlers: {e}", exc_info=True)
            raise

    async def check_prices_job(self, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Job for checking prices and sending alerts"""
        try:
            # Get all active alerts
            alerts = await self.db.get_all_active_alerts()
            if not alerts:
                return
            
            # Get unique cryptocurrencies to check
            crypto_ids = []
            for alert in alerts:
                if alert.cmc_id not in crypto_ids:
                    crypto_ids.append(alert.cmc_id)
            
            # Fetch latest prices
            price_data = await self.alert_handler.price_monitor.get_crypto_prices_via_db(crypto_ids)
            
            bot_logger.info(f"Checking prices for {len(crypto_ids)} cryptocurrencies")
            
            # Process each cryptocurrency
            for id in crypto_ids:
                if id not in price_data:
                    bot_logger.warning(f"Price data not found for {id}")
                    continue
                    
                crypto_alerts = [alert for alert in alerts if alert.cmc_id == id]
                crypto_price_data = price_data[id]  # Get first quote for the symbol
                crypto_price_data = UnifiedToken(**crypto_price_data)
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
        user = await self.db.get_user_by_chat_id(chat_id)
        
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

    def generate_verification_code(self) -> str:
        return secrets.token_hex(3)  # 6 character hex code

    def is_valid_email(self, email: str) -> bool:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return re.match(pattern, email) is not None

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        chat_id = str(update.effective_chat.id)
        user = await self.db.get_user_by_chat_id(chat_id)
        
        if user and user.is_verified:
            await update.message.reply_text(
                f"Welcome back! You're already verified with email: {user.email}\n"
                "Use /status to see your current alerts."
            )
            return ConversationHandler.END
        
        await update.message.reply_text(
            "Welcome to the Alert bot by Matrix Finance! 🤖\n"
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
        existing_user = await self.db.get_user_by_email(email)
        if existing_user and existing_user.is_verified:
            await update.message.reply_text(
                "This email is already registered with another Telegram account. "
                "Please use a different email address."
            )
            return WAITING_FOR_EMAIL
        elif not existing_user:
            await update.message.reply_text(
                "This email is not registered."
                "Please create an account on Matrix.fin to continue."
                "Use /start to begin the process after registeration."
            )
            return ConversationHandler.END
        
        # Generate verification code
        verification_code = self.generate_verification_code()
        
        # Save user data
        user = AlertUser(
            email=email,
            telegram_chat_id=chat_id,
            verification_code=verification_code,
            is_verified=False
        )
        
        bot_logger.info(f"New user: {user}")
        
        if existing_user.verification_code:
            await update.message.reply_text(
                "You have already registered an email address. "
                "Use /verify to complete the verification process."
            )
            return ConversationHandler.END
        else: 
            await self.db.save_user(user)
            bot_logger.info(f"User updated: {user.email}")
        
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
        user = await self.db.get_user_by_chat_id(chat_id)
        
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
            await self.db.save_user(user)
            
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
        user = await self.db.get_user_by_chat_id(chat_id)
        
        if not user or not user.is_verified:
            await update.message.reply_text(
                "Please verify your account first.\n"
                "Use /start to begin the verification process."
            )
            return
        
        alerts = await self.db.get_alerts_by_telegram_chat_id(user.telegram_chat_id)
        if not alerts:
            await update.message.reply_text(
                "You don't have any active alerts.\n"
                "Set up alerts through the Matrix.fin to receive notifications here."
            )
            return
        
        alert_messages = []
        for alert in alerts:
            if alert.name == alert.symbol:
                msg = f"🔔 {alert.name}:\n"
            else:
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

    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Handle errors in the Telegram bot"""
        try:
            error = context.error
            
            if isinstance(error, telegram.error.Conflict):
                if self._running:
                    bot_logger.warning("Detected another bot instance, shutting down...")
                    await self.shutdown()
                return
                
            if isinstance(error, RuntimeError) and "different loop" in str(error):
                bot_logger.warning("Event loop conflict detected, initiating graceful shutdown...")
                await self.shutdown()
                return
            
            # Log the error details
            tb_list = traceback.format_exception(None, error, error.__traceback__)
            tb_string = ''.join(tb_list)
            
            update_str = update.to_dict() if isinstance(update, Update) else str(update)
            message = (
                f'An exception was raised while handling an update\n'
                f'update = {update_str}\n\n'
                f'error = {tb_string}'
            )
            bot_logger.error(message)
            
            # Notify user if possible
            if update and update.effective_message:
                text = "Sorry, an error occurred while processing your request."
                await update.effective_message.reply_text(text)
                
        except Exception as e:
            bot_logger.error(f"Error in error handler: {e}", exc_info=True)

    async def shutdown(self) -> None:
        """Gracefully shutdown the bot"""
        try:
            if self._running:
                self._running = False
                
                # Cancel all pending tasks
                if self._loop:
                    for task in asyncio.all_tasks(self._loop):
                        if not task.done():
                            task.cancel()
                    
                    # Wait for tasks to complete
                    await asyncio.gather(*asyncio.all_tasks(self._loop), 
                                      return_exceptions=True)
                
                # Stop the application
                if self.app:
                    await self.app.stop()
                    await self.app.shutdown()
                
                bot_logger.info("Bot has been shut down gracefully")
                
        except Exception as e:
            bot_logger.error(f"Error during shutdown: {e}")
        finally:
            # Cleanup the event loop
            if self._loop:
                self._loop.stop()
                self._loop.close()

    def run(self) -> None:
        """Run the bot with proper event loop handling"""
        try:
            if not self._running:
                self._running = True
                bot_logger.info("Starting bot...")
                
                # Get or create event loop
                try:
                    self._loop = asyncio.get_event_loop()
                except RuntimeError:
                    self._loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(self._loop)
                
                # Run the application
                self.app.run_polling(
                    allowed_updates=Update.ALL_TYPES,
                    close_loop=False,  # Don't close the loop automatically
                    stop_signals=None  # Handle signals manually
                )
                
        except telegram.error.Conflict:
            bot_logger.warning("Another bot instance is already running")
        except KeyboardInterrupt:
            bot_logger.info("Bot stopped by user")
            if self._loop and self._loop.is_running():
                self._loop.run_until_complete(self.shutdown())
        except Exception as e:
            bot_logger.error(f"Error running bot: {e}", exc_info=True)
            if self._loop and self._loop.is_running():
                self._loop.run_until_complete(self.shutdown())
            raise
        finally:
            # Ensure the loop is closed
            if self._loop and not self._loop.is_closed():
                self._loop.close()

if __name__ == "__main__":
    bot = CryptoBot()
    try:
        bot.run()
    except KeyboardInterrupt:
        print("Bot stopped by user")
    except Exception as e:
        print(f"Error occurred: {e}")