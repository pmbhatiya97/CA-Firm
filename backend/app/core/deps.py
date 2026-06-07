from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail={"error": "Invalid or expired token", "code": "AUTH_REQUIRED"})
    user_id = payload.get("sub")
    user = db.query(User).filter(User.user_id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail={"error": "User not found or inactive", "code": "AUTH_REQUIRED"})
    return user

def require_roles(*roles: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail={"error": f"Role {current_user.role} cannot perform this action", "code": "INSUFFICIENT_ROLE"}
            )
        return current_user
    return checker

def can_access_engagement(engagement, user: User, db: Session) -> bool:
    """Check if a user can access an engagement."""
    if user.role in ("Partner", "Audit Manager", "EQCR Reviewer", "Admin"):
        return True
    from app.models.models import EngagementUser
    assignment = db.query(EngagementUser).filter(
        EngagementUser.engagement_id == engagement.engagement_id,
        EngagementUser.user_id == user.user_id
    ).first()
    return assignment is not None
