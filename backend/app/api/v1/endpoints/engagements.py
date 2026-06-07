from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles, can_access_engagement
from app.models.models import Engagement, Section, Folder, WorkingPaper, EngagementUser, User, ReviewNote
from app.schemas.schemas import EngagementCreate, EngagementOut, EngagementDetail, RollForwardRequest
from app.services.events import emit_event
from app.services.audit_file_templates import create_standard_audit_file
from app.core.config import SECTION_CODES, SECTION_NAMES

router = APIRouter(prefix="/engagements", tags=["engagements"])

def auto_create_sections(db: Session, engagement_id: str):
    for code in SECTION_CODES:
        sec = Section(
            engagement_id=engagement_id,
            section_code=code,
            section_name=SECTION_NAMES[code]
        )
        db.add(sec)

@router.get("", response_model=list[EngagementOut])
def list_engagements(
    status: Optional[str] = Query(None),
    financial_year: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Engagement)

    # Role-based scoping
    if current_user.role in ("Articled Assistant", "Audit Executive"):
        assigned_ids = [eu.engagement_id for eu in
                        db.query(EngagementUser).filter(EngagementUser.user_id == current_user.user_id).all()]
        q = q.filter(Engagement.engagement_id.in_(assigned_ids))

    if status:
        q = q.filter(Engagement.status == status)
    if financial_year:
        q = q.filter(Engagement.financial_year == financial_year)
    if client_name:
        q = q.filter(Engagement.client_name.ilike(f"%{client_name}%"))

    return [EngagementOut.model_validate(e) for e in q.order_by(Engagement.created_at.desc()).all()]

@router.post("", response_model=dict, status_code=201)
def create_engagement(
    payload: EngagementCreate,
    current_user: User = Depends(require_roles("Audit Manager", "Partner", "Admin")),
    db: Session = Depends(get_db)
):
    dup = db.query(Engagement).filter(
        Engagement.client_name == payload.client_name,
        Engagement.financial_year == payload.financial_year
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail={"error": "Duplicate engagement", "code": "DUPLICATE"})

    eng = Engagement(
        client_name=payload.client_name,
        financial_year=payload.financial_year,
        engagement_type=payload.engagement_type,
        is_eqcr_designated=payload.is_eqcr_designated,
        created_by=current_user.user_id,
        status="Active"
    )
    db.add(eng)
    db.flush()
    auto_create_sections(db, eng.engagement_id)
    db.flush()
    create_standard_audit_file(db, eng.engagement_id, current_user.user_id, seed_templates=False)

    # Auto-assign all Partners
    partners = db.query(User).filter(User.role == "Partner", User.is_active == True).all()
    for p in partners:
        eu = EngagementUser(engagement_id=eng.engagement_id, user_id=p.user_id, assigned_by=current_user.user_id)
        db.add(eu)

    # Assign creator if not already Partner
    if current_user.role not in ("Partner",):
        eu = EngagementUser(engagement_id=eng.engagement_id, user_id=current_user.user_id, assigned_by=current_user.user_id)
        db.add(eu)

    emit_event(db, "engagement.created", current_user.user_id, current_user.full_name,
               engagement_id=eng.engagement_id, payload={"client_name": eng.client_name, "fy": eng.financial_year})
    db.commit()
    db.refresh(eng)
    return {"data": EngagementOut.model_validate(eng), "message": "Engagement created with standard audit file structure"}

@router.get("/{engagement_id}", response_model=EngagementDetail)
def get_engagement(
    engagement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    eng = db.query(Engagement).filter(Engagement.engagement_id == engagement_id).first()
    if not eng:
        raise HTTPException(status_code=404, detail={"error": "Engagement not found", "code": "NOT_FOUND"})
    if not can_access_engagement(eng, current_user, db):
        raise HTTPException(status_code=403, detail={"error": "Access denied", "code": "INSUFFICIENT_ROLE"})
    from app.schemas.schemas import SectionOut
    result = EngagementDetail.model_validate(eng)
    sections = db.query(Section).filter(
        Section.engagement_id == engagement_id
    ).order_by(Section.section_code).all()
    result.sections = [SectionOut.model_validate(s) for s in sections]
    return result

@router.patch("/{engagement_id}/archive")
def archive_engagement(
    engagement_id: str,
    current_user: User = Depends(require_roles("Partner")),
    db: Session = Depends(get_db)
):
    eng = db.query(Engagement).filter(Engagement.engagement_id == engagement_id).first()
    if not eng:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})

    # Check closure checklist
    open_notes = db.query(ReviewNote).filter(
        ReviewNote.engagement_id == engagement_id,
        ReviewNote.status == "Open"
    ).count()
    if open_notes > 0:
        raise HTTPException(status_code=400, detail={"error": f"{open_notes} open review note(s) must be closed first", "code": "OPEN_NOTES_EXIST"})

    eng.status = "Archived"
    eng.archived_at = datetime.utcnow()
    eng.archived_by = current_user.user_id
    emit_event(db, "engagement.archived", current_user.user_id, current_user.full_name,
               engagement_id=engagement_id)
    db.commit()
    return {"data": EngagementOut.model_validate(eng), "message": "Engagement archived"}

@router.patch("/{engagement_id}/reopen")
def reopen_engagement(
    engagement_id: str,
    current_user: User = Depends(require_roles("Partner")),
    db: Session = Depends(get_db)
):
    eng = db.query(Engagement).filter(Engagement.engagement_id == engagement_id).first()
    if not eng:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    eng.status = "Active"
    eng.reopened_at = datetime.utcnow()
    eng.reopened_by = current_user.user_id
    emit_event(db, "engagement.reopened", current_user.user_id, current_user.full_name,
               engagement_id=engagement_id)
    db.commit()
    return {"data": EngagementOut.model_validate(eng), "message": f"Engagement reopened by {current_user.full_name}"}

@router.post("/{engagement_id}/rollforward", status_code=201)
def roll_forward(
    engagement_id: str,
    payload: RollForwardRequest,
    current_user: User = Depends(require_roles("Audit Manager", "Partner")),
    db: Session = Depends(get_db)
):
    prior = db.query(Engagement).filter(Engagement.engagement_id == engagement_id).first()
    if not prior:
        raise HTTPException(status_code=404, detail={"error": "Prior engagement not found", "code": "NOT_FOUND"})

    dup = db.query(Engagement).filter(
        Engagement.client_name == prior.client_name,
        Engagement.financial_year == payload.new_financial_year
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail={"error": "Engagement already exists for that FY", "code": "DUPLICATE"})

    new_eng = Engagement(
        client_name=prior.client_name,
        financial_year=payload.new_financial_year,
        engagement_type=prior.engagement_type,
        prior_year_engagement_id=engagement_id,
        created_by=current_user.user_id
    )
    db.add(new_eng)
    db.flush()
    auto_create_sections(db, new_eng.engagement_id)
    db.flush()

    # Copy folder structure (not files) from prior year
    _copy_folders(db, engagement_id, new_eng.engagement_id)

    emit_event(db, "engagement.rollforward", current_user.user_id, current_user.full_name,
               engagement_id=new_eng.engagement_id, payload={"from": engagement_id, "new_fy": payload.new_financial_year})
    db.commit()
    db.refresh(new_eng)
    return {"data": EngagementOut.model_validate(new_eng), "message": "Roll-forward complete. Folder structure copied, no files transferred."}

def _copy_folders(db: Session, from_engagement_id: str, to_engagement_id: str):
    """Recursively copy folder structure without files."""
    # Map old section IDs to new
    old_sections = db.query(Section).filter(Section.engagement_id == from_engagement_id).all()
    new_sections = db.query(Section).filter(Section.engagement_id == to_engagement_id).all()
    section_map = {}
    for os_ in old_sections:
        for ns in new_sections:
            if os_.section_code == ns.section_code:
                section_map[os_.section_id] = ns.section_id

    # Copy top-level folders then recurse
    old_folders = db.query(Folder).filter(
        Folder.engagement_id == from_engagement_id,
        Folder.parent_folder_id == None,
        Folder.is_deleted == False
    ).all()

    folder_map = {}
    for f in old_folders:
        new_section_id = section_map.get(f.section_id, f.section_id)
        nf = Folder(
            engagement_id=to_engagement_id,
            section_id=new_section_id,
            parent_folder_id=None,
            folder_name=f.folder_name,
            depth=f.depth,
            wp_number=f.wp_number,
            full_path=f.full_path
        )
        db.add(nf)
        db.flush()
        folder_map[f.folder_id] = nf.folder_id

    # Copy sub-folders
    all_old = db.query(Folder).filter(
        Folder.engagement_id == from_engagement_id,
        Folder.parent_folder_id != None,
        Folder.is_deleted == False
    ).order_by(Folder.depth).all()
    for f in all_old:
        new_parent = folder_map.get(f.parent_folder_id)
        new_section_id = section_map.get(f.section_id, f.section_id)
        nf = Folder(
            engagement_id=to_engagement_id,
            section_id=new_section_id,
            parent_folder_id=new_parent,
            folder_name=f.folder_name,
            depth=f.depth,
            wp_number=f.wp_number,
            full_path=f.full_path
        )
        db.add(nf)
        db.flush()
        folder_map[f.folder_id] = nf.folder_id
