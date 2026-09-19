from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from auth import hash_password
from database import get_db
import models
import schemas


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/assisted-registrations/{request_id}/create-artisan", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_assisted_artisan(
    request_id: int,
    data: schemas.AdminCreateAssistedArtisan,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    request = db.query(models.AssistedRegistrationRequest).filter(
        models.AssistedRegistrationRequest.id == request_id
    ).first()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assisted registration request not found")
    if request.status == "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This request has already been completed")
    email = str(data.email).strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = models.User(
        name=data.name,
        email=email,
        hashed_password=hash_password(data.password),
        role="artisan",
        language=data.language,
        location=data.location.strip(),
        phone_number=data.phone_number,
    )
    db.add(user)
    request.status = "completed"
    if not request.notes:
        request.notes = "Artisan account created by admin."
    db.commit()
    db.refresh(user)
    return user


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
        "pending_growth_requests": db.query(models.GrowthRequest).filter(models.GrowthRequest.status == "pending").count(),
        "active_sponsored_pilots": db.query(models.PilotEngagement).filter(models.PilotEngagement.status == "active").count(),
        "completed_sponsored_pilots": db.query(models.PilotEngagement).filter(models.PilotEngagement.status == "completed").count(),
        "active_paid_engagements": db.query(models.PaidEngagement).filter(models.PaidEngagement.status == "active").count(),
        "open_issues": db.query(models.EngagementIssue).filter(models.EngagementIssue.status.in_(("open", "reviewing"))).count(),
        "pending_payments": db.query(models.PaymentRecord).filter(models.PaymentRecord.status.in_(("declared", "student_confirmed"))).count(),
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
