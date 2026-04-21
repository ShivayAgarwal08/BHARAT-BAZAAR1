from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/manager", tags=["manager"])


@router.post("/request", response_model=schemas.ManagerRequestOut)
def create_request(
    data: schemas.ManagerRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    product = db.query(models.Product).filter(models.Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    req = models.ManagerRequest(
        artisan_id=current_user.id,
        product_id=data.product_id,
        description=data.description,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/requests", response_model=list[schemas.ManagerRequestOut])
def list_requests(db: Session = Depends(get_db)):
    return db.query(models.ManagerRequest).filter(
        models.ManagerRequest.status == "open"
    ).order_by(models.ManagerRequest.created_at.desc()).all()


@router.get("/my-requests", response_model=list[schemas.ManagerRequestOut])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.ManagerRequest).filter(
        models.ManagerRequest.artisan_id == current_user.id
    ).all()


@router.post("/apply", response_model=schemas.InternApplicationOut)
def apply(
    data: schemas.InternApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.InternApplication).filter(
        models.InternApplication.intern_id == current_user.id,
        models.InternApplication.request_id == data.request_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    application = models.InternApplication(
        intern_id=current_user.id,
        request_id=data.request_id,
        cover_note=data.cover_note,
        college=data.college,
        skills=data.skills,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/applications/{request_id}", response_model=list[schemas.InternApplicationOut])
def get_applications(request_id: int, db: Session = Depends(get_db)):
    return db.query(models.InternApplication).filter(
        models.InternApplication.request_id == request_id
    ).all()


@router.post("/select/{application_id}")
def select_intern(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.InternApplication).filter(
        models.InternApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    application.status = "selected"
    req = db.query(models.ManagerRequest).filter(
        models.ManagerRequest.id == application.request_id
    ).first()
    if req:
        req.status = "in_progress"
    db.commit()
    return {"message": "Intern selected successfully"}


# --- NEW DIRECT HIRING FLOW ---

@router.get("/interns", response_model=list[schemas.UserOut])
def get_all_interns(db: Session = Depends(get_db)):
    """List all available interns on the platform"""
    return db.query(models.User).filter(models.User.role == "intern").all()


@router.post("/hire", response_model=schemas.InternHireOut)
def send_hire_request(
    data: schemas.InternHireCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Artisan sends a direct hire request to an Intern"""
    if current_user.role != "artisan":
        raise HTTPException(status_code=403, detail="Only artisans can send hire requests")
        
    intern = db.query(models.User).filter(models.User.id == data.intern_id, models.User.role == "intern").first()
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found")
        
    hire_req = models.InternHireRequest(
        artisan_id=current_user.id,
        intern_id=data.intern_id,
        product_id=data.product_id,
        message=data.message,
    )
    db.add(hire_req)
    db.commit()
    db.refresh(hire_req)
    return hire_req


@router.get("/invitations", response_model=list[schemas.InternHireOut])
def list_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Intern views received requests, Artisan views sent requests"""
    if current_user.role == "intern":
        return db.query(models.InternHireRequest).filter(
            models.InternHireRequest.intern_id == current_user.id
        ).order_by(models.InternHireRequest.created_at.desc()).all()
    else:
        # Artisan view
        return db.query(models.InternHireRequest).filter(
            models.InternHireRequest.artisan_id == current_user.id
        ).order_by(models.InternHireRequest.created_at.desc()).all()


@router.patch("/invitations/{request_id}", response_model=schemas.InternHireOut)
def update_invitation_status(
    request_id: int,
    data: schemas.HireStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Intern accepts or rejects a hire request"""
    if current_user.role != "intern":
        raise HTTPException(status_code=403, detail="Only interns can update invitation status")
        
    hire_req = db.query(models.InternHireRequest).filter(
        models.InternHireRequest.id == request_id,
        models.InternHireRequest.intern_id == current_user.id
    ).first()
    
    if not hire_req:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    if data.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    hire_req.status = data.status
    db.commit()
    db.refresh(hire_req)
    return hire_req


# --- NEW ALERT FLOW ---
@router.post("/alerts", response_model=schemas.InternAlertOut)
def send_alert(
    data: schemas.InternAlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Intern sends a direct message/alert to an Artisan"""
    if current_user.role != "intern":
        raise HTTPException(status_code=403, detail="Only interns can send alerts")
        
    artisan = db.query(models.User).filter(models.User.id == data.artisan_id, models.User.role == "artisan").first()
    if not artisan:
        raise HTTPException(status_code=404, detail="Artisan not found")
        
    alert = models.InternAlert(
        intern_id=current_user.id,
        artisan_id=data.artisan_id,
        product_id=data.product_id,
        message=data.message,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/alerts", response_model=list[schemas.InternAlertOut])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Artisan views received alerts, Intern views sent alerts"""
    if current_user.role == "artisan":
        return db.query(models.InternAlert).filter(
            models.InternAlert.artisan_id == current_user.id
        ).order_by(models.InternAlert.created_at.desc()).all()
    else:
        # Intern view
        return db.query(models.InternAlert).filter(
            models.InternAlert.intern_id == current_user.id
        ).order_by(models.InternAlert.created_at.desc()).all()
