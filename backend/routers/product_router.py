from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas
from services.ai_service import analyze_product_input, generate_product_listing

router = APIRouter(prefix="/product", tags=["product"])


@router.post("/create", response_model=schemas.ProductOut)
async def create_product(
    data: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if data.ai_data:
        ai = data.ai_data
    else:
        analysis = await analyze_product_input(data.raw_description, data.language)
        ai = await generate_product_listing(analysis)
    
    # Ensure tags is a string
    tags_str = ai["tags"] if isinstance(ai["tags"], str) else ",".join(ai["tags"])
    
    product = models.Product(
        user_id=current_user.id,
        raw_description=data.raw_description,
        title=ai["title"],
        description=ai["description"],
        price=ai.get("suggested_price", ai.get("price")),
        min_price=ai["min_price"],
        max_price=ai["max_price"],
        profit_margin=ai["profit_margin"],
        tags=tags_str,
        category=ai["category"],
        material=ai["material"],
        quantity=data.quantity,
        language=data.language,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/list", response_model=list[schemas.ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Product).filter(models.Product.user_id == current_user.id).all()


@router.get("/all", response_model=list[schemas.ProductOut])
def list_all_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).limit(50).all()


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}
