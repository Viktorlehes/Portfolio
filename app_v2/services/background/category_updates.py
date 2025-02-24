from app_v2.services.background.base import BackgroundTask
from app_v2.services.db.categories_service import CategoryService
from app_v2.services.external.cmc_service import CMCService
from app_v2.models.categories import UserCategoryPreference
from typing import List
import logging
from datetime import datetime, timezone, timedelta

class CategoryUpdateTask(BackgroundTask):
    """Background Task for updating categories"""
    
    def __init__(self, interval_seconds: int = 300):
        super().__init__("category_updates", interval_seconds)
        self.category_service = CategoryService()
        self.cmc_service = CMCService()
        
    async def execute(self) -> None:
        """Execute Category updates"""
        try: 
            user_preferences = await self.category_service.find_many({}, sort_by="last_active")
            current_time = datetime.now(timezone.utc)
            default_cat_ids = []
            custom_categories_ids = []
            
            for user in user_preferences:
                last_active = user.last_active.replace(tzinfo=timezone.utc)
                if (current_time - last_active) < timedelta(hours=2):
                    if user.default_category_ids:
                        default_cat_ids.extend(id for id in user.default_category_ids if id not in default_cat_ids)
                    if user.custom_category_ids:
                        custom_categories_ids.extend(id for id in user.custom_category_ids)

            if len(default_cat_ids) > 0:
                default_categories = await self.category_service.update_default_categories(category_ids=default_cat_ids)
                if not default_categories:
                    logging.info(f"No default categories were updated")
            
            try:
                if len(custom_categories_ids) > 0:
                    custom_categories = await self.category_service.update_custom_categories(custom_categories_ids)
                    if not custom_categories:
                        logging.info(f"No custom categories were updated")
            except Exception as e:
                logging.info(f"Error updating custom categories: " + str(e))
        except Exception as e:
            logging.info(f"Error updating categories: " + str(e))
            return
            