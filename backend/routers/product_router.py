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
    if current_user.role != "artisan":
        raise HTTPException(status_code=403, detail="Only artisans can create products")
    if data.ai_data:
        ai = data.ai_data
    else:
        analysis = await analyze_product_input(data.raw_description, data.language)
        ai = await generate_product_listing(analysis)
    
    # Keep user-provided draft edits and avoid manufacturing unavailable values.
    tags = ai.get("tags") or []
    tags_str = tags if isinstance(tags, str) else ",".join(tags)
    price = ai.get("price", ai.get("suggested_price"))
    if price == "":
        price = None
    
    product = models.Product(
        user_id=current_user.id,
        raw_description=data.raw_description,
        title=ai.get("title") or data.raw_description.strip()[:120] or "Untitled product",
        description=ai.get("description") or data.raw_description,
        price=price,
        min_price=ai.get("min_price"),
        max_price=ai.get("max_price"),
        profit_margin=ai.get("profit_margin"),
        tags=tags_str,
        category=ai.get("category") or "",
        material=ai.get("material") or "",
        quantity=ai.get("quantity") or data.quantity,
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
    from sqlalchemy.orm import joinedload
    return db.query(models.Product).options(joinedload(models.Product.owner)).order_by(models.Product.created_at.desc()).limit(50).all()


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    product = db.query(models.Product).options(joinedload(models.Product.owner)).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "artisan":
        raise HTTPException(status_code=403, detail="Only artisans can delete products")
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}
