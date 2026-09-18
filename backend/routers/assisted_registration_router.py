from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
import models
import schemas


router = APIRouter(prefix="/assisted-registration", tags=["assisted-registration"])


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access is required")
    return current_user


@router.post("/request", response_model=schemas.AssistedRegistrationRequestCreated, status_code=status.HTTP_201_CREATED)
def create_assisted_registration_request(
    data: schemas.AssistedRegistrationRequestCreate,
    db: Session = Depends(get_db),
):
    request = models.AssistedRegistrationRequest(
        full_name=data.full_name,
        phone_number=data.phone_number,
        preferred_language=data.preferred_language,
        preferred_callback_time=data.preferred_callback_time,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return {
        "id": request.id,
        "status": request.status,
        "created_at": request.created_at,
    }


@router.get("/requests", response_model=list[schemas.AssistedRegistrationRequestOut])
def list_assisted_registration_requests(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.AssistedRegistrationRequest).order_by(
        models.AssistedRegistrationRequest.created_at.desc()
    ).all()


@router.patch("/requests/{request_id}", response_model=schemas.AssistedRegistrationRequestOut)
def update_assisted_registration_request(
    request_id: int,
    data: schemas.AssistedRegistrationRequestUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    request = db.query(models.AssistedRegistrationRequest).filter(
        models.AssistedRegistrationRequest.id == request_id
    ).first()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if data.status is not None:
        request.status = data.status
    if data.notes is not None:
        request.notes = data.notes
    db.commit()
    db.refresh(request)
    return request
