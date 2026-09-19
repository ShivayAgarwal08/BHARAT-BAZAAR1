from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from auth import get_current_user, require_admin
from database import get_db
import models, schemas

router = APIRouter(prefix="/operations", tags=["operations"])

def pilot_for_user(db, pilot_id, user):
    pilot = db.get(models.PilotEngagement, pilot_id)
    if not pilot: raise HTTPException(404, "Pilot not found")
    if user.role != "admin" and user.id not in (pilot.artisan_id, pilot.student_id):
        raise HTTPException(403, "You are not a participant in this pilot")
    return pilot

def paid_for_user(db, engagement_id, user):
    engagement = db.get(models.PaidEngagement, engagement_id)
    if not engagement: raise HTTPException(404, "Paid engagement not found")
    if user.role != "admin" and user.id not in (engagement.artisan_id, engagement.student_id):
        raise HTTPException(403, "You are not a participant in this engagement")
    return engagement

@router.get("/profile", response_model=schemas.UserOut)
def my_profile(user: models.User = Depends(get_current_user)):
    return user

@router.put("/profile", response_model=schemas.UserOut)
def update_profile(data: schemas.ProfileUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Never take role or email from this payload.
    for field, value in data.model_dump().items(): setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.commit(); db.refresh(user); return user

@router.get("/pilots/{pilot_id}/tasks", response_model=list[schemas.TaskOut])
def list_pilot_tasks(pilot_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot_for_user(db, pilot_id, user)
    return db.query(models.PilotTask).filter_by(pilot_id=pilot_id).order_by(models.PilotTask.created_at.desc()).all()

@router.post("/pilots/{pilot_id}/tasks", response_model=schemas.TaskOut)
def create_pilot_task(pilot_id: int, data: schemas.PilotTaskCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot = pilot_for_user(db, pilot_id, user)
    if user.role != "admin" and user.id != pilot.artisan_id: raise HTTPException(403, "Only the artisan or an admin can create pilot tasks")
    task = models.PilotTask(pilot_id=pilot.id, assigned_student_id=pilot.student_id, created_by_id=user.id, **data.model_dump())
    db.add(task); db.commit(); db.refresh(task); return task

@router.patch("/pilot-tasks/{task_id}", response_model=schemas.TaskOut)
def update_pilot_task(task_id: int, data: schemas.TaskUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = db.get(models.PilotTask, task_id)
    if not task: raise HTTPException(404, "Task not found")
    pilot = pilot_for_user(db, task.pilot_id, user)
    values = data.model_dump(exclude_none=True)
    if user.id == pilot.student_id:
        if set(values) - {"status", "student_update"}: raise HTTPException(403, "Students can only update progress")
        if values.get("status") not in (None, "in_progress", "submitted"): raise HTTPException(400, "Invalid student task state")
    elif user.id == pilot.artisan_id:
        if set(values) - {"status", "artisan_feedback"}: raise HTTPException(403, "Artisans can only give feedback or approve completion")
        if values.get("status") not in (None, "completed", "cancelled"): raise HTTPException(400, "Invalid artisan task state")
    for key, value in values.items(): setattr(task, key, value)
    if task.status == "completed": task.completed_at = datetime.utcnow()
    db.commit(); db.refresh(task); return task

@router.get("/pilots/{pilot_id}/discovery", response_model=schemas.DiscoveryOut | None)
def get_discovery(pilot_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot_for_user(db, pilot_id, user); return db.query(models.PilotDiscovery).filter_by(pilot_id=pilot_id).first()

@router.post("/pilots/{pilot_id}/discovery", response_model=schemas.DiscoveryOut)
def submit_discovery(pilot_id: int, data: schemas.DiscoveryCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot = pilot_for_user(db, pilot_id, user)
    if user.id != pilot.student_id: raise HTTPException(403, "Only the assigned student can submit discovery")
    existing = db.query(models.PilotDiscovery).filter_by(pilot_id=pilot_id).first()
    if existing: raise HTTPException(409, "Discovery has already been submitted")
    discovery = models.PilotDiscovery(pilot_id=pilot_id, **data.model_dump()); db.add(discovery); db.commit(); db.refresh(discovery); return discovery

@router.patch("/pilots/{pilot_id}/discovery", response_model=schemas.DiscoveryOut)
def review_discovery(pilot_id: int, data: schemas.DiscoveryReview, db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    discovery = db.query(models.PilotDiscovery).filter_by(pilot_id=pilot_id).first()
    if not discovery: raise HTTPException(404, "Discovery not found")
    discovery.status=data.status; discovery.admin_notes=data.admin_notes; discovery.reviewed_at=datetime.utcnow(); db.commit(); db.refresh(discovery); return discovery

@router.get("/pilots/{pilot_id}/metrics", response_model=list[schemas.MetricOut])
def list_metrics(pilot_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot_for_user(db, pilot_id, user); return db.query(models.PilotMetric).filter_by(pilot_id=pilot_id).all()

@router.post("/pilots/{pilot_id}/metrics", response_model=schemas.MetricOut)
def add_metric(pilot_id: int, data: schemas.MetricCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot_for_user(db, pilot_id, user)
    metric=models.PilotMetric(pilot_id=pilot_id, recorded_by_id=user.id, **data.model_dump()); db.add(metric); db.commit(); db.refresh(metric); return metric

@router.post("/pilots/{pilot_id}/completion-request", response_model=schemas.PilotEngagementOut)
def request_completion(pilot_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot=pilot_for_user(db,pilot_id,user)
    if user.id != pilot.student_id or pilot.status not in ("active", "changes_requested"): raise HTTPException(409, "This pilot cannot request completion now")
    pilot.status="completion_requested"; db.commit(); db.refresh(pilot); return pilot

@router.post("/pilots/{pilot_id}/completion-decision", response_model=schemas.PilotEngagementOut)
def completion_decision(pilot_id: int, data: schemas.CompletionDecision, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pilot=pilot_for_user(db,pilot_id,user)
    if user.id != pilot.artisan_id or pilot.status != "completion_requested": raise HTTPException(409, "This pilot is not awaiting artisan approval")
    pilot.status="completed" if data.approve else "changes_requested"; db.commit(); db.refresh(pilot); return pilot

@router.post("/paid-engagements", response_model=schemas.PaidEngagementOut)
def propose_paid(data: schemas.PaidEngagementCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role != "artisan": raise HTTPException(403, "Only artisans can propose paid engagements")
    student=db.get(models.User,data.student_id)
    if not student or student.role != "intern": raise HTTPException(400,"Choose a student")
    if data.pilot_id:
        pilot=pilot_for_user(db,data.pilot_id,user)
        if pilot.student_id != student.id: raise HTTPException(400,"Pilot student does not match")
    engagement=models.PaidEngagement(artisan_id=user.id, **data.model_dump()); db.add(engagement); db.commit(); db.refresh(engagement); return engagement

@router.get("/paid-engagements/mine", response_model=list[schemas.PaidEngagementOut])
def my_paid(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role == "artisan": return db.query(models.PaidEngagement).filter_by(artisan_id=user.id).all()
    if user.role == "intern": return db.query(models.PaidEngagement).filter_by(student_id=user.id).all()
    raise HTTPException(403,"Participant access required")

@router.get("/paid-engagements", response_model=list[schemas.PaidEngagementOut])
def all_paid(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    return db.query(models.PaidEngagement).all()

@router.post("/paid-engagements/{engagement_id}/accept", response_model=schemas.PaidEngagementOut)
def accept_paid(engagement_id:int, db:Session=Depends(get_db), user:models.User=Depends(get_current_user)):
    e=paid_for_user(db,engagement_id,user)
    if user.id != e.student_id or e.status != "proposed": raise HTTPException(409,"This engagement cannot be accepted")
    e.status="accepted"; db.commit(); db.refresh(e); return e

@router.post("/paid-engagements/{engagement_id}/agreement", response_model=schemas.AgreementOut)
def create_agreement(engagement_id:int,data:schemas.AgreementCreate,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    e=paid_for_user(db,engagement_id,user)
    if user.id != e.artisan_id or e.status not in ("accepted","proposed"): raise HTTPException(403,"Only the artisan can set an agreement")
    if db.query(models.EngagementAgreement).filter_by(paid_engagement_id=e.id).first(): raise HTTPException(409,"Agreement already exists")
    a=models.EngagementAgreement(paid_engagement_id=e.id,**data.model_dump()); db.add(a); db.commit(); db.refresh(a); return a

@router.get("/paid-engagements/{engagement_id}/agreement", response_model=schemas.AgreementOut | None)
def get_agreement(engagement_id:int,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    paid_for_user(db,engagement_id,user); return db.query(models.EngagementAgreement).filter_by(paid_engagement_id=engagement_id).first()

@router.post("/agreements/{agreement_id}/accept", response_model=schemas.AgreementOut)
def accept_agreement(agreement_id:int,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    a=db.get(models.EngagementAgreement,agreement_id)
    if not a: raise HTTPException(404,"Agreement not found")
    e=paid_for_user(db,a.paid_engagement_id,user)
    if user.id==e.artisan_id: a.artisan_accepted_at=datetime.utcnow()
    elif user.id==e.student_id: a.student_accepted_at=datetime.utcnow()
    else: raise HTTPException(403,"Participant access required")
    if a.artisan_accepted_at and a.student_accepted_at: e.status="active"
    db.commit(); db.refresh(a); return a

@router.get("/paid-engagements/{engagement_id}/tasks", response_model=list[schemas.TaskOut])
def list_paid_tasks(engagement_id:int, db:Session=Depends(get_db), user:models.User=Depends(get_current_user)):
    paid_for_user(db, engagement_id, user); return db.query(models.PaidEngagementTask).filter_by(paid_engagement_id=engagement_id).all()

@router.post("/paid-engagements/{engagement_id}/tasks", response_model=schemas.TaskOut)
def create_paid_task(engagement_id:int, data:schemas.PilotTaskCreate, db:Session=Depends(get_db), user:models.User=Depends(get_current_user)):
    e=paid_for_user(db, engagement_id, user)
    if user.role != "admin" and user.id != e.artisan_id: raise HTTPException(403,"Only the artisan or an admin can create paid-work tasks")
    task=models.PaidEngagementTask(paid_engagement_id=e.id,created_by_id=user.id,**data.model_dump());db.add(task);db.commit();db.refresh(task);return task

@router.patch("/paid-tasks/{task_id}", response_model=schemas.TaskOut)
def update_paid_task(task_id:int,data:schemas.TaskUpdate,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    task=db.get(models.PaidEngagementTask,task_id)
    if not task: raise HTTPException(404,"Task not found")
    e=paid_for_user(db,task.paid_engagement_id,user); values=data.model_dump(exclude_none=True)
    if user.id==e.student_id:
        if set(values)-{"status","student_update"} or values.get("status") not in (None,"in_progress","submitted"): raise HTTPException(403,"Students can only submit progress")
    elif user.id==e.artisan_id:
        if set(values)-{"status","artisan_feedback"} or values.get("status") not in (None,"completed","cancelled"): raise HTTPException(403,"Artisans can only approve or cancel tasks")
    for key,value in values.items(): setattr(task,key,value)
    if task.status=="completed": task.completed_at=datetime.utcnow()
    db.commit();db.refresh(task);return task

@router.post("/paid-engagements/{engagement_id}/payments", response_model=schemas.PaymentOut)
def declare_payment(engagement_id:int,data:schemas.PaymentCreate,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    e=paid_for_user(db,engagement_id,user)
    if user.id!=e.artisan_id: raise HTTPException(403,"Only the artisan can record an external payment")
    p=models.PaymentRecord(paid_engagement_id=e.id,**data.model_dump());db.add(p);db.commit();db.refresh(p);return p

@router.get("/payments/mine", response_model=list[schemas.PaymentOut])
def my_payments(db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    q=db.query(models.PaymentRecord).join(models.PaidEngagement,models.PaymentRecord.paid_engagement_id==models.PaidEngagement.id)
    if user.role=="artisan": return q.filter(models.PaidEngagement.artisan_id==user.id).all()
    if user.role=="intern": return q.filter(models.PaidEngagement.student_id==user.id).all()
    raise HTTPException(403,"Participant access required")

@router.get("/payments", response_model=list[schemas.PaymentOut])
def all_payments(db:Session=Depends(get_db),_:models.User=Depends(require_admin)): return db.query(models.PaymentRecord).all()

@router.post("/payments/{payment_id}/confirm", response_model=schemas.PaymentOut)
def confirm_payment(payment_id:int,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    p=db.get(models.PaymentRecord,payment_id)
    if not p: raise HTTPException(404,"Payment not found")
    e=paid_for_user(db,p.paid_engagement_id,user)
    if user.id!=e.student_id or p.status!="declared": raise HTTPException(409,"This payment cannot be confirmed")
    p.status="student_confirmed";p.student_confirmed_at=datetime.utcnow();db.commit();db.refresh(p);return p

@router.post("/payments/{payment_id}/verify", response_model=schemas.PaymentOut)
def verify_payment(payment_id:int,db:Session=Depends(get_db),_:models.User=Depends(require_admin)):
    p=db.get(models.PaymentRecord,payment_id)
    if not p: raise HTTPException(404,"Payment not found")
    p.status="verified";p.verified_at=datetime.utcnow();db.commit();db.refresh(p);return p

@router.post("/reviews/pilot/{pilot_id}", response_model=schemas.ReviewOut)
def review_pilot(pilot_id:int,data:schemas.ReviewCreate,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    pilot=pilot_for_user(db,pilot_id,user)
    if pilot.status!="completed" or user.role=="admin": raise HTTPException(409,"Only participants can review completed engagements")
    reviewee=pilot.student_id if user.id==pilot.artisan_id else pilot.artisan_id
    if db.query(models.EngagementReview).filter_by(pilot_id=pilot_id,reviewer_id=user.id).first(): raise HTTPException(409,"You have already reviewed this engagement")
    r=models.EngagementReview(pilot_id=pilot_id,reviewer_id=user.id,reviewee_id=reviewee,**data.model_dump());db.add(r);db.commit();db.refresh(r);return r

@router.get("/portfolio", response_model=list[schemas.PilotEngagementOut])
def portfolio(db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    if user.role!="intern": raise HTTPException(403,"Only students have a portfolio")
    return db.query(models.PilotEngagement).filter_by(student_id=user.id,status="completed").all()

@router.post("/issues", response_model=schemas.IssueOut)
def report_issue(data:schemas.IssueCreate,db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    if bool(data.pilot_id)==bool(data.paid_engagement_id): raise HTTPException(400,"Choose one engagement")
    if data.pilot_id: pilot_for_user(db,data.pilot_id,user)
    else: paid_for_user(db,data.paid_engagement_id,user)
    issue=models.EngagementIssue(reporter_id=user.id,**data.model_dump());db.add(issue);db.commit();db.refresh(issue);return issue

@router.get("/issues", response_model=list[schemas.IssueOut])
def list_issues(db:Session=Depends(get_db),user:models.User=Depends(get_current_user)):
    if user.role=="admin": return db.query(models.EngagementIssue).all()
    return db.query(models.EngagementIssue).filter_by(reporter_id=user.id).all()

@router.patch("/issues/{issue_id}",response_model=schemas.IssueOut)
def manage_issue(issue_id:int,data:schemas.IssueUpdate,db:Session=Depends(get_db),_:models.User=Depends(require_admin)):
    issue=db.get(models.EngagementIssue,issue_id)
    if not issue: raise HTTPException(404,"Issue not found")
    issue.status=data.status;issue.admin_notes=data.admin_notes;db.commit();db.refresh(issue);return issue

@router.get("/admin/counts")
def admin_counts(db:Session=Depends(get_db),_:models.User=Depends(require_admin)):
    return {"active_pilots":db.query(models.PilotEngagement).filter_by(status="active").count(),"completed_pilots":db.query(models.PilotEngagement).filter_by(status="completed").count(),"active_paid_engagements":db.query(models.PaidEngagement).filter_by(status="active").count(),"open_issues":db.query(models.EngagementIssue).filter(models.EngagementIssue.status.in_(("open","reviewing"))).count(),"pending_payments":db.query(models.PaymentRecord).filter(models.PaymentRecord.status.in_(("declared","student_confirmed"))).count()}
