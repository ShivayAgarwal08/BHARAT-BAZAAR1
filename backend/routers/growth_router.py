from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from auth import get_current_user, require_admin
from database import get_db
import models, schemas

router = APIRouter(prefix="/growth", tags=["growth"])
def view(p):
    return {"id":p.id,"growth_request_id":p.growth_request_id,"artisan_id":p.artisan_id,"student_id":p.student_id,"funding_type":p.funding_type,"artisan_cost":p.artisan_cost,"stipend_amount":p.stipend_amount,"start_date":p.start_date,"end_date":p.end_date,"status":p.status,"artisan_name":p.artisan.name if p.artisan else None,"artisan_location":p.artisan.location if p.artisan else None,"artisan_bio":p.artisan.bio if p.artisan else None,"student_name":p.student.name if p.student else None,"student_bio":p.student.bio if p.student else None,"student_services":p.student.services if p.student else None,"request_title":p.request.title if p.request else None,"request_help_type":p.request.help_type if p.request else None,"request_description":p.request.description if p.request else None}

@router.post("/requests", response_model=schemas.GrowthRequestOut)
def create_request(data: schemas.GrowthRequestCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role != "artisan": raise HTTPException(403, "Only artisans can request business help")
    request = models.GrowthRequest(artisan_id=user.id, **data.model_dump())
    db.add(request); db.commit(); db.refresh(request); return request

@router.get("/requests/mine", response_model=list[schemas.GrowthRequestOut])
def my_requests(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role != "artisan": raise HTTPException(403, "Only artisans can view their growth requests")
    return db.query(models.GrowthRequest).filter(models.GrowthRequest.artisan_id == user.id).all()

@router.get("/requests", response_model=list[schemas.GrowthRequestOut])
def admin_requests(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    return db.query(models.GrowthRequest).order_by(models.GrowthRequest.created_at.desc()).all()

@router.post("/requests/{request_id}/assign", response_model=schemas.GrowthRequestOut)
def assign(request_id: int, student_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    request = db.get(models.GrowthRequest, request_id)
    student = db.get(models.User, student_id)
    if not request: raise HTTPException(404, "Growth request not found")
    if not student or student.role != "intern": raise HTTPException(400, "Assigned student must be an intern")
    if request.status in ("completed", "cancelled"): raise HTTPException(409, "This request is not available for matching")
    request.assigned_student_id = student.id; request.status = "matched"
    db.commit(); db.refresh(request); return request

@router.post("/requests/{request_id}/start-pilot", response_model=schemas.PilotEngagementOut)
def start_pilot(request_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    request = db.get(models.GrowthRequest, request_id)
    if not request or not request.assigned_student_id: raise HTTPException(400, "Assign an intern before starting a pilot")
    if db.query(models.PilotEngagement).filter_by(growth_request_id=request_id).first(): raise HTTPException(409, "Pilot already exists")
    start = datetime.utcnow(); end = start + timedelta(days=30 * request.preferred_duration_months)
    pilot = models.PilotEngagement(growth_request_id=request.id, artisan_id=request.artisan_id, student_id=request.assigned_student_id, funding_type="PLATFORM_SPONSORED", artisan_cost=0, start_date=start, end_date=end, status="active")
    db.add(pilot); request.status = "pilot_active"; db.commit(); db.refresh(pilot); return pilot

@router.get("/pilots/mine", response_model=list[schemas.PilotViewOut])
def my_pilots(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role == "artisan": return [view(p) for p in db.query(models.PilotEngagement).filter_by(artisan_id=user.id).all()]
    if user.role == "intern": return [view(p) for p in db.query(models.PilotEngagement).filter_by(student_id=user.id).all()]
    raise HTTPException(403, "Only artisans and interns can view pilots")

@router.get("/pilots", response_model=list[schemas.PilotViewOut])
def pilots(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    return [view(p) for p in db.query(models.PilotEngagement).all()]
