from app_v2.services.db.base import BaseDBService
from app_v2.models.categories import UserCategoryPreference, DefaultCategory, CustomCategory, UserCategories, CustomCategoryCreation
from app_v2.services.external.cmc_service import CMCService
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid
from pymongo import UpdateOne
import re


class DefaultCategoryService(BaseDBService[DefaultCategory]):
    def __init__(self):
        super().__init__('default_categories', DefaultCategory)
        self.cmc_service = CMCService()
        
    async def seed(self):
        """Reseed Default categories"""
        result = await self.collection.delete_many({})
        
        if result.deleted_count: 
            categories = await self.cmc_service.get_default_categories()
            if categories:
                try:
                    current_time = datetime.now(timezone.utc)
                    inserts = list()
                    for cat in categories:
                        cat.last_updated = current_time
                        category = DefaultCategory(**cat)
                        inserts.append(category)
                        
                    result = await self.collection.insert_many(inserts)
                    
                    if result.inserted_ids:
                        return
                    else:
                        print("Something went wrong with DB insert")
                except Exception as e:
                    print(str(e))
                    
    async def get_default_categories(self, cat_ids: List[str]) -> List[DefaultCategory]:
        """fetch updated default categories from CMC"""
        return await self.cmc_service.fetch_cmc_category_data(cat_ids)
        
                    
class CustomCategoriesService(BaseDBService[CustomCategory]):
    def __init__(self):
        super().__init__("custom_categories", CustomCategory)
        self.cmc_service = CMCService()
       
    async def get_category_data(self, token_ids: List[int]) -> dict:
        """Fetch and Calc category data"""
        token_data = await self.cmc_service.get_tokens_by_cmc_id(token_ids)
        
        if token_data:
            token_list = []
            for id, value in token_data.items():
                token_list.append(value)
            
            total_market_cap = sum(token['quote']['USD']['market_cap'] for token in token_list)
            avg_price_change = sum(token['quote']['USD']['percent_change_24h'] for token in token_list) / len(token_list)
            total_volume = sum(token['quote']['USD']['volume_24h'] for token in token_list)
            volume_change = sum(token['quote']['USD']['volume_change_24h'] for token in token_list) / len(token_list)
            
            return {
                "market_cap": total_market_cap,
                "avg_price_change": avg_price_change,
                "volume": total_volume,
                "volume_change": volume_change
            }
        else:
            print("Error fetching tokens for custom category")
            return None
        
    async def create_custom_category(self, category_data: CustomCategoryCreation) -> Optional[CustomCategory]:
        """Initialize New custom category"""
        token_ids = category_data["tokens"]
        
        custom_category_dict = {
            'id': str(uuid.uuid4()),
            'name': category_data["name"],
            'tokens': token_ids,
            'last_updated': datetime.now(timezone.utc),
            'owner_id': category_data["user_id"]
        }
        
        category_data = await self.get_category_data(token_ids)
        
        if category_data:
            try:
                custom_category_dict.update(category_data)
                custom_category = CustomCategory(**custom_category_dict)
                
                result = await self.collection.insert_one(custom_category.model_dump())
                
                return custom_category.id if result.inserted_id else None
            except Exception as e:
                print(f"Error creating custom category: " + str(e))
                
    async def update_custom_categories(self, category_ids: List[str]) -> List[CustomCategory]:
        """Update custom categories with data from CMC"""
        categories = await self.find_many({"id": {"$in": category_ids}})
        
        if len(categories) != len(category_ids):
            print(f"Warning not all custom categories found {len(categories)}/{len(category_ids)}")
        
        token_ids = []
        for cat in categories:
            token_ids.extend(id for id in cat.tokens if id not in token_ids)
            
        token_data = await self.cmc_service.get_tokens_by_cmc_id(token_ids)
        
        updated_categories = []
        
        for categorie in categories:
            try:
                updated_categorie = categorie
                tokens = []
                for token_id in updated_categorie.tokens:
                    if str(token_id) in token_data:
                        tokens.append(token_data[str(token_id)])
                    else:
                        raise Exception(f"Token {token_id} not found in token data fetched for category {updated_categorie.name}")
                    
                if len(tokens) == len(updated_categorie.tokens):
                    total_market_cap = sum(token['quote']['USD']['market_cap'] for token in tokens)
                    avg_price_change = sum(token['quote']['USD']['percent_change_24h'] for token in tokens) / len(tokens)
                    total_volume = sum(token['quote']['USD']['volume_24h'] for token in tokens)
                    volume_change = sum(token['quote']['USD']['volume_change_24h'] for token in tokens) / len(tokens)
                    
                    updated_categorie.market_cap = total_market_cap
                    updated_categorie.volume = total_volume
                    updated_categorie.volume_change = volume_change
                    updated_categorie.avg_price_change = avg_price_change
                    updated_categorie.last_updated = datetime.now(timezone.utc)
                    updated_categories.append(updated_categorie)
                    
            except Exception as e:
                print(f"Error getting some token data for category {categorie.name}: " + str(e))
                continue
            
        return updated_categories if updated_categories else []
        

class CategoryService(BaseDBService[UserCategoryPreference]):
    def __init__(self):
        super().__init__('user_category_preferences', UserCategoryPreference)
        self.default_categories = DefaultCategoryService()
        self.custom_categories = CustomCategoriesService()
        
    async def get_default_categories(self) -> List[DefaultCategory]:
        """Get default displayed categories"""
        cats = await self.default_categories.find_many({}, limit=15)
        if cats:
            return [cat.model_dump() for cat in cats]
        else:
            return None
                
    async def search_default_category(self, search_term: str) -> List[DefaultCategory]:
        """Search Db for categories using name or partial strings"""      
        search_term = search_term.strip()
        if not search_term:
            return []
        
        escaped_term =  "".join([char if char.isalnum() else f"\\{char}" for char in search_term])
        
        pattern = re.compile(f".*{escaped_term}.*", re.IGNORECASE)
        
        docs = self.default_categories.collection.find({
           "$or": [
                {"name": {"$regex": pattern}},
                {"title": {"$regex": pattern}},
                {"description": {"$regex": pattern}}
            ] 
        })
        
        if docs:
            categories = []
            async for document in docs:
                document["_id"] = str(document["_id"])
                categories.append(DefaultCategory(document))
            return categories
        else:
            return []
                
    async def get_user_categories(self, user_id: str) -> UserCategories:
        """Get all categories for a user (both default and custom)"""
        try:
            # Update last active timestamp
            await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "last_active": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "user_id": user_id,
                        "default_category_ids": [],
                        "custom_category_ids": []
                    }
                },
                upsert=True
            )
            
            # Get user preferences
            prefs = await self.find_many({"user_id": user_id}, limit=1)
            if not prefs:
                return {"default": [], "custom": []}
            else:
                prefs = prefs[0]
                
            if prefs.default_category_ids:
                default_cats = await self.default_categories.find_many(
                    {"id": {"$in": prefs.default_category_ids}},
                )
            else:
                default_cats = []
            
            if prefs.custom_category_ids:
                custom_cats = await self.custom_categories.find_many(
                    {"id": {"$in": prefs.custom_category_ids}},
                )
            else: 
                custom_cats =[]
            
            return {
                "default_categories": default_cats,
                "custom_categories": custom_cats
            }
            
        except Exception as e:
            print(f"Error getting user categories: " + str(e))
            return None


    async def add_default_category(self, user_id: str, category_id: str) -> bool:
        """Track a default category for a user"""
        result = await self.collection.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"default_category_ids": category_id},
                "$set": {"last_active": datetime.now(timezone.utc)}
            },
            upsert=True
        )
        return result.modified_count > 0
        
    async def remove_default_category(self, user_id: str, category_id: str) -> bool:
        """Remove default category for user"""
        try:
            # Update last_active and remove category in one operation
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {"last_active": datetime.now(timezone.utc)},
                    "$pull": {"default_category_ids": category_id}
                },
                upsert=True
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error removing default category: {str(e)}")
            return False

    async def add_custom_category(self, category_data: CustomCategoryCreation) -> bool:
        """Create a new custom category"""
        user_id = category_data["user_id"]
        
        custom_category_id = await self.custom_categories.create_custom_category(category_data)
        
        if custom_category_id:
            try:
                # Add to user's preferences
                await self.collection.update_one(
                    {"user_id": user_id},
                    {
                        "$addToSet": {"custom_category_ids": str(custom_category_id)},
                        "$set": {"last_active": datetime.now()}
                    },
                    upsert=True
                )
                return True
            except Exception as e:
                print(f"Error creating custom category: " + str(e))
                return False
        else:
            print(f"Error Creating custom category: Category not created or inserted")
            
    async def remove_custom_category(self, user_id: str, category_id: str) -> bool:
        """Remove custom category"""
        try:
            # Update last_active and remove category in one operation
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {"last_active": datetime.now(timezone.utc)},
                    "$pull": {"custom_category_ids": category_id}
                },
                upsert=True
            )
            
            if result.modified_count > 0:
                removed = await self.custom_categories.collection.delete_one({"id": category_id})
                
                if removed.deleted_count > 0:
                    return True
            
        except Exception as e:
            print(f"Error removing default category: {str(e)}")
            return False
    
    async def update_default_categories(self, category_ids: List[str]) -> List[DefaultCategory]:
        """Fetch category data from CMC API with concurrent processing"""
        
        current_categories = await self.default_categories.find_many(
            {"id": {"$in": category_ids}}
        )
    
        should_update = []
        current_time = datetime.now(timezone.utc)
        for category in current_categories:
            last_updated = category.last_updated.replace(tzinfo=timezone.utc)
            if (current_time - last_updated) > timedelta(minutes=5):
                should_update.append(category.id)
    
        updated_categories = await self.default_categories.get_default_categories(should_update)
        
        if len(updated_categories) != len(should_update):
            print(f"CategoryService error: Not all categories were fetched: {len(updated_categories)}/{len(category_ids)} ")
            
        update_operations = []
        for category in updated_categories:
            update_operations.append(
                UpdateOne(
                    {"id": category["id"]},
                    {"$set": {
                        **category,
                    }}
                )
            )
        try:
            if update_operations:
                result = await self.default_categories.collection.bulk_write(update_operations)
                if result.modified_count:
                    return await self.default_categories.find_many(
                        {"id": {"$in": should_update}}
                    )
                else:
                    print("Error: no categories were updated")
                    return []   
        except Exception as e:
            print(f"Error writing category updates to DB: " + str(e))
            return []         
    
    async def update_custom_categories(self, category_ids: List[str]):
        """Update custom categories using CMC data"""
        
        categories = await self.custom_categories.update_custom_categories(category_ids=category_ids)
        
        if len(categories) != len(category_ids):
            print(f"CategoryService error: Not all custom categories were updated: {len(categories)}/{len(category_ids)} ")

        update_operations = []
        for category in categories:
            update_operations.append(
                UpdateOne(
                    {"id": category.id},
                    {"$set": {
                        **category.model_dump(),
                    }}
                )
            )
        try:
            if update_operations:
                result = await self.custom_categories.collection.bulk_write(update_operations)
                if result.modified_count:
                    return await self.default_categories.find_many(
                        {"id": {"$in": category_ids}}
                    )
                else:
                    print("Error: no categories were updated")
                    return []   
        except Exception as e:
            print(f"Error writing category updates to DB: " + str(e))
            return []         