from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_bundles():
    return {"message": "This is the Bundles"}

@router.get("/{bundle_id}")
async def get_bundle(bundle_id: int):
    return {"bundle_id": bundle_id, "message": "Bundle details"}
