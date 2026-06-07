from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import hash_password, generate_temp_password
from app.core.deps import get_current_user, require_roles
from app.models.models import User, EngagementUser, Engagement
from app.schemas.schemas import UserCreate, UserOut
from app.services.events import emit_event
from app.services.initials import derive_initials

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_roles("Audit Manager", "Partner", "Admin")),
    db: Session = Depends(get_db)
):
    return [UserOut.model_validate(u) for u in db.query(User).all()]

@router.post("", response_model=dict)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_roles("Admin")),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail={"error": "Email already registered", "code": "DUPLICATE"})

    temp_pw = generate_temp_password()
    user = User(
        full_name=payload.full_name,
        initials=(payload.initials or derive_initials(payload.full_name)).strip().upper(),
        email=payload.email,
        role=payload.role,
        hashed_password=hash_password(temp_pw),
        must_change_password=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-assign Partners to all engagements
    if payload.role == "Partner":
        engagements = db.query(Engagement).all()
        for eng in engagements:
            eu = EngagementUser(
                engagement_id=eng.engagement_id,
                user_id=user.user_id,
                assigned_by=current_user.user_id
            )
            db.add(eu)
        db.commit()

    emit_event(db, "user.created", current_user.user_id, current_user.full_name,
               payload={"new_user": user.email, "role": user.role})
    db.commit()

    return {
        "data": UserOut.model_validate(user),
        "message": f"User created. Temporary password: {temp_pw}"
    }

@router.patch("/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_roles("Admin")),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"error": "User not found", "code": "NOT_FOUND"})
    user.is_active = False
    user.deactivated_at = datetime.utcnow()
    # Remove from engagements (attribution preserved in WPs)
    db.query(EngagementUser).filter(EngagementUser.user_id == user_id).delete()
    db.commit()
    emit_event(db, "user.deactivated", current_user.user_id, current_user.full_name,
               payload={"deactivated_user": user.email})
    db.commit()
    return {"data": None, "message": "User deactivated. All WP attributions preserved."}

@router.post("/{engagement_id}/assign")
def assign_user_to_engagement(
    engagement_id: str,
    payload: dict,
    current_user: User = Depends(require_roles("Audit Manager", "Partner", "Admin")),
    db: Session = Depends(get_db)
):
    user_id = payload.get("user_id")
    existing = db.query(EngagementUser).filter(
        EngagementUser.engagement_id == engagement_id,
        EngagementUser.user_id == user_id
    ).first()
    if existing:
        return {"data": None, "message": "User already assigned"}

    eu = EngagementUser(
        engagement_id=engagement_id,
        user_id=user_id,
        assigned_by=current_user.user_id
    )
    db.add(eu)
    emit_event(db, "user.assigned", current_user.user_id, current_user.full_name,
               engagement_id=engagement_id, payload={"user_id": user_id})
    db.commit()
    return {"data": None, "message": "User assigned to engagement"}
