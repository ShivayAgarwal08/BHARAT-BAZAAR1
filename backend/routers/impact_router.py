from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import ImpactStats

router = APIRouter(prefix="/impact", tags=["impact"])


@router.get("/stats", response_model=ImpactStats)
def get_stats(db: Session = Depends(get_db)):
    total_artisans = db.query(models.User).filter(models.User.role == "artisan").count()
    total_products = db.query(models.Product).count()
    total_interns = db.query(models.User).filter(models.User.role == "intern").count()
    total_mgr_requests = db.query(models.ManagerRequest).count()

    products = db.query(models.Product).all()
    revenue = sum(p.price * p.quantity for p in products)

    selected_interns = db.query(models.InternApplication).filter(
        models.InternApplication.status == "selected"
    ).count()

    return ImpactStats(
        total_artisans=total_artisans,
        total_products=total_products,
        total_interns=total_interns,
        total_manager_requests=total_mgr_requests,
        revenue_generated=round(revenue, 2),
        jobs_created=selected_interns,
    )
