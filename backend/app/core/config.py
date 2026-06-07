from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/specentra"
    SECRET_KEY: str = "specentra-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    FILE_STORAGE_PATH: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    APP_NAME: str = "Specentra AMS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    RETENTION_YEARS: int = 7
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"
    DOCUMENT_EDITOR_URL: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

ALLOWED_EXTENSIONS = {
    ".xlsx", ".xls", ".docx", ".doc", ".pdf",
    ".jpg", ".jpeg", ".png", ".csv", ".zip"
}

SECTION_CODES = ["1000", "2000", "3000", "4000", "5000", "MISC"]
SECTION_NAMES = {
    "1000": "Preconditions for audit",
    "2000": "Audit Planning",
    "3000": "Communications",
    "4000": "Audit Execution",
    "5000": "Audit Reporting",
    "MISC": "Checklists, Other Misc Documents",
}

ROLES = ["Articled Assistant", "Audit Executive", "Audit Manager", "Partner", "EQCR Reviewer", "Admin"]

CLOSURE_CHECKLIST = [
    {"item_id": "CL-1001", "section_code": "1000", "description": "Independence declaration is present in section 1000", "check_type": "document_exists"},
    {"item_id": "CL-1002", "section_code": "1000", "description": "Client acceptance / continuance documentation is present", "check_type": "document_exists"},
    {"item_id": "CL-1003", "section_code": "1000", "description": "Engagement letter is present and signed", "check_type": "document_exists"},
    {"item_id": "CL-2001", "section_code": "2000", "description": "Audit strategy document is present", "check_type": "document_exists"},
    {"item_id": "CL-2002", "section_code": "2000", "description": "Audit plan is present", "check_type": "document_exists"},
    {"item_id": "CL-2003", "section_code": "2000", "description": "Risk assessment and audit programme is present", "check_type": "document_exists"},
    {"item_id": "CL-2004", "section_code": "2000", "description": "Materiality calculation is present", "check_type": "document_exists"},
    {"item_id": "CL-3001", "section_code": "3000", "description": "Management representation letter is present", "check_type": "document_exists"},
    {"item_id": "CL-3002", "section_code": "3000", "description": "Significant audit findings communicated to management are documented", "check_type": "document_exists"},
    {"item_id": "CL-4001", "section_code": "4000", "description": "At least one working paper exists for each planned audit area", "check_type": "wps_exist"},
    {"item_id": "CL-4002", "section_code": "4000", "description": "All WPs in section 4000 have a Prepared By attribution", "check_type": "prepared_by_complete"},
    {"item_id": "CL-4003", "section_code": "4000", "description": "All WPs in section 4000 have been reviewed — no WP remains in Draft or Submitted status", "check_type": "review_complete"},
    {"item_id": "CL-5001", "section_code": "5000", "description": "Draft audit report is present", "check_type": "document_exists"},
    {"item_id": "CL-5002", "section_code": "5000", "description": "Final audit report is present", "check_type": "document_exists"},
    {"item_id": "CL-E001", "section_code": None, "description": "All review notes across the engagement are closed", "check_type": "no_open_notes"},
    {"item_id": "CL-E002", "section_code": None, "description": "Partner final sign-off is recorded on at least one WP in each section", "check_type": "partner_signoff"},
]
