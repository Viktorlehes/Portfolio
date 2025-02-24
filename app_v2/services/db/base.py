# app/services/db/base.py

from typing import Optional, List, Type, TypeVar, Generic, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pydantic import BaseModel
import logging
from app.core.config import DB_URI

# Type variable for generic database operations
T = TypeVar('T', bound=BaseModel)

class DatabaseClient:
    _instance = None
    _initialized = False
    _client: Optional[AsyncIOMotorClient] = None
    _main_db: Optional[AsyncIOMotorDatabase] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseClient, cls).__new__(cls)
        return cls._instance
    
    async def initialize(self):
        """Initialize database connection and collections"""
        if self._initialized:
            return
            
        try:
            # Initialize MongoDB client
            self._client = AsyncIOMotorClient(DB_URI)
            self._main_db = self._client['Main']
            self._alerts_db = self._client['crypto_bot_db']
            
            # Initialize collections
            self._collections = {
                'tokens': self._main_db.tokens,
                'wallets': self._main_db.wallets,
                'users': self._main_db.users,
                'CMC_ID_MAP': self._main_db.CMC_ID_MAP,
                'CG_ID_MAP': self._main_db.CG_ID_MAP,
                'default_categories': self._main_db.Categories,
                'user_category_preferences': self._main_db.user_category_preferences,
                'custom_categories': self._main_db.custom_categories,
                'bot_users': self._alerts_db.users,
                'alerts': self._alerts_db.alerts
            }
            
            # Create indexes
            await self._create_indexes()
            
            self._initialized = True
            logging.info("Database initialization completed successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize database: {str(e)}")
            raise
    
    async def _create_indexes(self):
        """Create indexes for all collections"""
        try:
            # Token indexes            
            await self._collections['tokens'].create_index("symbol")
            await self._collections['tokens'].create_index("name")
            await self._collections['tokens'].create_index(
                "cmc_id",
                unique=True,
                partialFilterExpression={"cmc_id": {"$type": "number"}}  # Only index when field is a number
            )
            await self._collections['tokens'].create_index(
                "zerion_id",
                unique=True,
                partialFilterExpression={"zerion_id": {"$type": "string"}}  # Only index when field is a string
            )
            await self._collections['tokens'].create_index(
                "coingecko_id",
                unique=True,
                partialFilterExpression={"coingecko_id": {"$type": "string"}}  # Only index when field is a string
            )
            await self._collections['tokens'].create_index([("symbol", 1), ("name", 1)])
            await self._collections['tokens'].create_index("rank")
            await self._collections['tokens'].create_index("created_at")
            await self._collections['tokens'].create_index("updated_at")
            
            # Wallet indexes
            await self._collections['wallets'].create_index("user_id")
            await self._collections['wallets'].create_index([("source", 1), ("address", 1)])
            await self._collections['wallets'].create_index([("user_id", 1), ("name", 1)])
            await self._collections['wallets'].create_index("created_at")
            await self._collections['wallets'].create_index("updated_at")
            
            # User indexes
            await self._collections['users'].create_index("email", unique=True)
            await self._collections['users'].create_index("created_at")
            await self._collections['users'].create_index("last_active")
            
            # Categories indexes
            await self._collections['default_categories'].create_index("id")
            await self._collections['default_categories'].create_index("name")
            await self._collections['default_categories'].create_index("title")
            
            await self._collections['custom_categories'].create_index("id")
            await self._collections['custom_categories'].create_index("owner_id")
            
            await self._collections['user_category_preferences'].create_index("user_id")
            await self._collections['user_category_preferences'].create_index("last_active")
            
            # Id maps indexes
            await self._collections['CMC_ID_MAP'].create_index("name")
            await self._collections['CMC_ID_MAP'].create_index("symbol")
            await self._collections['CMC_ID_MAP'].create_index("slug")
            
            await self._collections['CG_ID_MAP'].create_index("name")
            await self._collections['CG_ID_MAP'].create_index("symbol")
            
            # Bot Users indexes 
            await self._collections['bot_users'].create_index("email", unique=True)
            await self._collections['bot_users'].create_index(
                "telegram_chat_id",
                unique=True,
                partialFilterExpression={"telegram_chat_id": {"$type": "string"}}
                )
            
            #Alerts indexes
            await self._collections['alerts'].create_index("telegram_chat_id")
            await self._collections['alerts'].create_index("cmc_id")
            
            logging.info("Database indexes created successfully")
            
        except Exception as e:
            logging.error(f"Failed to create database indexes: {str(e)}")
            raise
    
    @property
    def db(self) -> AsyncIOMotorDatabase:
        """Get the main database instance"""
        if not self._initialized:
            raise RuntimeError("Database client not initialized")
        return self._main_db
    
    def get_collection(self, name: str) -> AsyncIOMotorCollection:
        """Get a specific collection by name"""
        if not self._initialized:
            raise RuntimeError("Database client not initialized")
        return self._collections[name]
    
    async def close(self):
        """Close database connection"""
        if self._client:
            self._client.close()
            self._initialized = False

class BaseDBService(Generic[T]):
    """Base database service with common CRUD operations"""
    
    def __init__(self, collection_name: str, model_class: Type[T]):
        self.db_client = DatabaseClient()
        self.collection_name = collection_name
        self.model_class = model_class
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        return self.db_client.get_collection(self.collection_name)
    
    async def create(self, data: T) -> str:
        """Create a new document"""
        doc = data.model_dump()
        doc['created_at'] = datetime.now(timezone.utc)
        doc['updated_at'] = datetime.now(timezone.utc)
        
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)
    
    async def get_by_id(self, id: str) -> Optional[T]:
        """Get a document by ID"""
        doc = await self.collection.find_one({'_id': id})
        return self.model_class(**doc) if doc else None
    
    async def update(self, id: str, data: Dict[str, Any]) -> bool:
        """Update a document"""
        data['updated_at'] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {'id': id},
            {'$set': data}
        )
        return result.modified_count > 0
    
    async def delete(self, id: str) -> bool:
        """Delete a document"""
        result = await self.collection.delete_one({'_id': id})
        return result.deleted_count > 0
    
    async def find_many(self,
                       query: Dict[str, Any],
                       skip: int = 0,
                       limit: int = 50,
                       sort_by: str = "created_at",
                       ascending: bool = False) -> List[T]:
        """Find multiple documents with pagination"""
        cursor = self.collection.find(query) \
                              .sort(sort_by, 1 if ascending else -1) \
                              .skip(skip) \
                              .limit(limit)
        
        return [self.model_class(**doc) async for doc in cursor]
    
    async def count(self, query: Dict[str, Any]) -> int:
        """Count documents matching a query"""
        return await self.collection.count_documents(query)