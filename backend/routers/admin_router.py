from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
import models
import schemas


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/summary", response_model=schemas.AdminSummaryOut)
def get_admin_summary(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return {
        "total_artisans": db.query(models.User).filter(models.User.role == "artisan").count(),
        "total_interns": db.query(models.User).filter(models.User.role == "intern").count(),
        "pending_assisted_registrations": db.query(models.AssistedRegistrationRequest).filter(
            models.AssistedRegistrationRequest.status == "pending"
        ).count(),
        "total_products": db.query(models.Product).count(),
        "open_manager_requests": db.query(models.ManagerRequest).filter(
            models.ManagerRequest.status == "open"
        ).count(),
    }


@router.get("/artisans", response_model=list[schemas.AdminArtisanOut])
def list_artisans(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    rows = db.query(
        models.User,
        func.count(models.Product.id).label("product_count"),
    ).outerjoin(models.Product, models.Product.user_id == models.User.id).filter(
        models.User.role == "artisan"
    ).group_by(models.User.id).order_by(models.User.created_at.desc()).all()
    return [
        {"id": user.id, "name": user.name, "email": user.email, "role": user.role,
         "created_at": user.created_at, "product_count": product_count}
        for user, product_count in rows
    ]


@router.get("/interns", response_model=list[schemas.AdminInternOut])
def list_interns(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    rows = db.query(
        models.User,
        func.count(models.InternApplication.id).label("application_count"),
    ).outerjoin(models.InternApplication, models.InternApplication.intern_id == models.User.id).filter(
        models.User.role == "intern"
    ).group_by(models.User.id).order_by(models.User.created_at.desc()).all()
    return [
        {"id": user.id, "name": user.name, "email": user.email, "role": user.role,
         "created_at": user.created_at, "application_count": application_count}
        for user, application_count in rows
    ]
