#api/v1/pages/overview.py
# Overview page unique endpoints
# Market data directly from CMC should be cached

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from app_v2.core.security import get_current_user
from app_v2.models.user import User
from app_v2.models.CMC.market_stats_response import MarketStats
from app_v2.models.CMC.CMC_token import FullCMCToken
from app_v2.models.token import UnifiedToken
from app_v2.models.CMC.feargreed_response import FearGreadData
from app_v2.models.categories import UserCategories, DefaultCategory
#from app_v2.scripts.coinglass_scrape import CoinglassMetrics, scrape_coinglass
from app_v2.api.v1.dependencies import CMCServiceDep, CGLSServiceDep, CategoryServiceDep, TokenServiceDep
from app_v2.core.responses import APIResponse, create_response
router = APIRouter()

@router.get("/feargreedindex", response_model=APIResponse[FearGreadData])
async def get_feargreedindex(cmc_service: CMCServiceDep):
    try:
        data = await cmc_service.get_feargreed_index()
        if not data:
            raise HTTPException(
                status_code=404,
                detail="Fear and greed index data not found"
            )
        return create_response(data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching fear and greed index: {str(e)}"
        )
    
@router.get("/marketstats", response_model=APIResponse[MarketStats])
async def get_markestats(cmc_service: CMCServiceDep):
    #raise HTTPException(detail="Works", status_code=500)
    try:
        data = await cmc_service.get_market_stats()
        if not data:
            raise HTTPException(
                status_code=404,
                detail="CMC market data not found"
            )
        return create_response(data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"CMC market data not found: {str(e)}"
        )
    
@router.get("/scraped-CGLS-data", response_model=APIResponse[None])
async def get_scraped_CGLS_data():
    raise HTTPException(detail="Not implemented", status_code=500)
    try:
        pass
        #return await scrape_coinglass()
    except Exception as e:
        print(f"Error fetching scraped CGLS data: " + str(e))
        return None
    
@router.get("/token_table", response_model=APIResponse[List[UnifiedToken]])
async def get_token_table(token_service: TokenServiceDep):
    try:
        top_tokens = await token_service.get_top_tokens()
        filtered_response = []
        seen_tokens = set()
        for token in top_tokens:
            if token['cmc_id'] not in seen_tokens:
                filtered_response.append(token)
                seen_tokens.add(token['cmc_id'])
        if not top_tokens:
            raise HTTPException(
                status_code=404,
                detail="No token data available"
            )
        return create_response(filtered_response)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching token Table data: {str(e)}"
        )

@router.get("/get-default-tokens", response_model=APIResponse[List[UnifiedToken]])
async def get_default_tokens(token_service: TokenServiceDep):
    try:
        data =  await token_service.get_top_tokens(limit=15)
        if not data:
            raise HTTPException(
                status_code=404,
                detail="No token data available"
            )
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error fetching top tokens: " + str(e), status_code=500)
    except Exception as e:
        print(f"Error fetching top tokens: " + str(e))

@router.get("/default_categories", response_model=APIResponse[List[DefaultCategory]])
async def get_default_categories(
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        data = await category_service.get_default_categories()
        if not data:
            raise HTTPException(
                status_code=404,
                detail="No category data available"
            )
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error fetching default categories: " + str(e), status_code=500)

@router.get("/user_categories", response_model=APIResponse[Optional[UserCategories]])
async def get_user_categories(
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        data = await category_service.get_user_categories(current_user.id)
        if not data:
            raise HTTPException(
                status_code=404,
                detail="Error fetching user categories"
            )
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error fetching user categories: " + str(e), status_code=500)
    
@router.post("/add-cmc-category", response_model=APIResponse[bool])
async def add_cmc_category(
    category_data: dict,
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        category_id = category_data["category_id"]
        
        result = await category_service.add_default_category(current_user.id, category_id)
        if result:
            return create_response(result, status_code=201)
        else: 
            raise Exception("error adding category")
    except HTTPException as e:
        raise HTTPException(detail=f"Error adding category: " + str(e), status_code=500)
    
@router.post("/remove-cmc-category", response_model=APIResponse[bool])
async def remove_cmc_category(
    category_data: dict,
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        category_id = category_data["category_id"]
        result = await category_service.remove_default_category(current_user.id, category_id)
        if result:
            return create_response(result, status_code=201)
        else: 
            raise Exception("error removing category")
    except HTTPException as e:
        raise HTTPException(detail=f"Error adding category: " + str(e), status_code=500)
    
@router.post("/add-custom-category", response_model=APIResponse[bool])
async def add_custom_category(
    custom_category_data: dict,
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        custom_category_data["user_id"] = current_user.id
        result = await category_service.add_custom_category(custom_category_data)
        if result:
            return create_response(result, status_code=201)
        else: 
            raise Exception("error adding category")
    except HTTPException as e:
        raise HTTPException(detail=f"Error adding category: " + str(e), status_code=500)

@router.post("/remove-custom-category", response_model=APIResponse[bool])
async def remove_cmc_category(
    category_data: dict,
    category_service: CategoryServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        category_id = category_data["category_id"]
        result = await category_service.remove_custom_category(current_user.id, category_id)
        if result:
            return create_response(result, status_code=201)
        else: 
            raise Exception("error removing category")
    except HTTPException as e:
        raise HTTPException(detail=f"Error adding category: " + str(e), status_code=500)
    

@router.post("/find-tokens-by-name", response_model=APIResponse[Optional[List[UnifiedToken]]])
async def find_token_by_name(
    token_name: dict,
    cmc_service: CMCServiceDep,
    token_service: TokenServiceDep
    ):
    try:
        token_name: str = token_name["name"]
        token_name = token_name.strip()
        if not token_name:
            raise HTTPException(status_code=400, detail="Search term cannot be empty")
        
        results = await cmc_service.search_tokens_by_symbol_or_name(token_name)
        
        if results:
            unifiedtokens = []
            for result in results:
                token = await token_service.get_or_create_new_token(id=result["id"], id_type="cmc")
                if token:
                    unifiedtokens.append(token)
                    
            if unifiedtokens:
                return create_response(unifiedtokens)
            
        return create_response(None)
    except HTTPException as e:
        raise HTTPException(detail=f"Error fetching token by name: " + str(e), status_code=500)
    except Exception as e:
        print("Error fetching token by name" + str(e))