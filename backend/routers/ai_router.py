from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas
from services.ai_service import analyze_product_input, generate_product_listing

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze-product", response_model=schemas.AIAnalyzeResponse)
async def analyze_product(data: schemas.AIAnalyzeRequest):
    result = await analyze_product_input(data.description, data.language)
    return result


@router.post("/generate-listing")
async def generate_listing(data: schemas.AIAnalyzeRequest):
    analysis = await analyze_product_input(data.description, data.language)
    result = await generate_product_listing(analysis)
    return {
        "title": result["title"],
        "description": result["description"],
        "tags": result["tags"],
        "suggested_price": result["suggested_price"],
    }


@router.post("/market-estimation", response_model=schemas.MarketEstimationResponse)
async def market_estimation(data: schemas.MarketEstimationRequest):
    # For standalone market estimate, we use the analysis function with a descriptive slug
    dummy_desc = f"A {data.category} product made of standard materials."
    result = await analyze_product_input(dummy_desc)
    return {
        "min_price": float(result["min_price"]),
        "max_price": float(result["max_price"]),
        "suggested_price": float(result["suggested_price"]),
        "profit_margin": float(result["profit_margin"]),
        "demand": "High" if result["category"] in ["handloom", "jewelry"] else "Medium",
    }
