"""
WP Numbering Engine — AMS-WP-NUM-001
Position-based hierarchical address system.
The number is derived from the item's position in the tree.
Moving an item changes its number.
"""
from sqlalchemy.orm import Session
from app.models.models import WorkingPaper, Folder, Section


def get_section_prefix(section_code: str) -> str:
    return section_code  # "1000", "2000", etc.


def get_siblings_at_level(db: Session, engagement_id: str, parent_folder_id: str | None, section_id: str) -> list:
    """Get all non-deleted folders and WPs at the same parent level."""
    folders = db.query(Folder).filter(
        Folder.engagement_id == engagement_id,
        Folder.section_id == section_id,
        Folder.parent_folder_id == parent_folder_id,
        Folder.is_deleted == False
    ).all()
    wps = db.query(WorkingPaper).filter(
        WorkingPaper.engagement_id == engagement_id,
        WorkingPaper.section_id == section_id,
        WorkingPaper.folder_id == (parent_folder_id or ""),
        WorkingPaper.is_deleted == False
    ).all()
    return folders + wps


def get_next_level1_number(db: Session, engagement_id: str, section_id: str, section_code: str) -> str:
    """Assign a Level 1 index inside the section, e.g. 1001, 1002."""
    existing = db.query(Folder).filter(
        Folder.engagement_id == engagement_id,
        Folder.section_id == section_id,
        Folder.parent_folder_id == None,
        Folder.is_deleted == False
    ).all()
    existing_wps = db.query(WorkingPaper).filter(
        WorkingPaper.engagement_id == engagement_id,
        WorkingPaper.section_id == section_id,
        WorkingPaper.is_deleted == False
    ).all()
    used_nums = set()
    try:
        section_base = int(section_code)
    except ValueError:
        prefix = f"{section_code}-"
        used = set()
        for item in existing + existing_wps:
            num = getattr(item, 'wp_number', None)
            if num and num.startswith(prefix):
                try:
                    used.add(int(num.replace(prefix, "", 1)))
                except ValueError:
                    pass
        n = 1
        while n in used:
            n += 1
        return f"{prefix}{n:03d}"
    for item in existing + existing_wps:
        num = getattr(item, 'wp_number', None)
        if not num or "." in num:
            continue
        try:
            value = int(num)
        except ValueError:
            continue
        if section_base < value < section_base + 1000:
            used_nums.add(value - section_base)
    n = 1
    while n in used_nums:
        n += 1
    return str(section_base + n)


def get_next_child_number(db: Session, engagement_id: str, parent_wp_number: str, section_id: str, use_suffix: bool = False) -> str:
    """
    Assign next child number.
    Decimal format: 2002.01, 2002.02 ...
    Suffix format:  2002.03A, 2002.03B ...
    """
    existing_folders = db.query(Folder).filter(
        Folder.engagement_id == engagement_id,
        Folder.section_id == section_id,
        Folder.is_deleted == False,
        Folder.wp_number.like(f"{parent_wp_number}.%")
    ).all()
    existing_wps = db.query(WorkingPaper).filter(
        WorkingPaper.engagement_id == engagement_id,
        WorkingPaper.section_id == section_id,
        WorkingPaper.is_deleted == False,
        WorkingPaper.wp_number.like(f"{parent_wp_number}.%")
    ).all()

    used = set()
    suffix_letters = set()
    prefix = f"{parent_wp_number}."

    for item in existing_folders + existing_wps:
        num = getattr(item, 'wp_number', None)
        if num and num.startswith(prefix):
            rest = num[len(prefix):]
            # Check if it's a direct child (no additional dots)
            base = rest.rstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            if '.' not in rest:
                try:
                    used.add(int(base))
                except ValueError:
                    pass

    if use_suffix:
        # Find next alpha suffix at the same base
        n = max(used) if used else 1
        for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
            candidate = f"{prefix}{n:02d}{letter}"
            existing_with_letter = [
                item for item in existing_folders + existing_wps
                if getattr(item, 'wp_number', '') == candidate
            ]
            if not existing_with_letter:
                return candidate
        return f"{prefix}{n + 1:02d}A"
    else:
        n = 1
        while n in used:
            n += 1
        return f"{prefix}{n:02d}"


def assign_wp_number(
    db: Session,
    engagement_id: str,
    section_id: str,
    section_code: str,
    parent_folder_id: str | None = None,
    parent_wp_number: str | None = None,
    depth: int = 1,
) -> str:
    """Main entry point — assign the next available WP number."""
    if depth == 1 or not parent_wp_number:
        return get_next_level1_number(db, engagement_id, section_id, section_code)
    else:
        return get_next_child_number(db, engagement_id, parent_wp_number, section_id)


def check_wp_number_conflict(db: Session, engagement_id: str, wp_number: str, exclude_id: str | None = None) -> bool:
    """Returns True if conflict exists."""
    q = db.query(WorkingPaper).filter(
        WorkingPaper.engagement_id == engagement_id,
        WorkingPaper.wp_number == wp_number,
        WorkingPaper.is_deleted == False
    )
    if exclude_id:
        q = q.filter(WorkingPaper.wp_id != exclude_id)
    folder_q = db.query(Folder).filter(
        Folder.engagement_id == engagement_id,
        Folder.wp_number == wp_number,
        Folder.is_deleted == False
    )
    return q.first() is not None or folder_q.first() is not None
