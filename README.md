# Specentra AMS — Stage 1: File Explorer

**Audit File Management System** for CA firms  
On-premise · ICAI Compliant · 7-year retention · Soft-delete only

---

## What is this?

Specentra AMS Stage 1 is a structured digital audit file explorer built for Chartered Accountant firms. It replaces network drives and folder systems with a compliant, structured environment ready for AI agents in Stage 2.

**Key compliance features:**
- ✅ Soft-delete only — no permanent deletion (DEC-006)
- ✅ 7-year file retention enforcement (DEC-007)
- ✅ On-premise storage — no files leave the server (NFR-016)
- ✅ Permanent Prepared By / Final Reviewer attribution (FR-053)
- ✅ Position-based hierarchical WP numbering (AMS-WP-NUM-001)
- ✅ 5 auto-sections per engagement: 1000 / 2000 / 3000 / 4000 / 5000 (DEC-001)
- ✅ Bcrypt password hashing, 8-hour session timeout (NFR-014, NFR-015)
- ✅ Event bus built-in and agent-ready for Stage 2 (DEC-008)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Zustand + React Router |
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Database | MySQL 8.0 |
| Auth | JWT Bearer tokens + bcrypt (cost 12) |
| File storage | On-premise server filesystem |

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |

---

## Quick Start (Windows)

### Step 1 — MySQL Setup

```sql
-- Run in MySQL Workbench or mysql CLI:
CREATE DATABASE specentra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'specentra'@'localhost' IDENTIFIED BY 'Specentra@2024';
GRANT ALL PRIVILEGES ON specentra.* TO 'specentra'@'localhost';
FLUSH PRIVILEGES;
```

Or run the included script:
```bash
mysql -u root -p < database_setup.sql
```

### Step 2 — Configure Backend

Edit `backend/.env`:
```env
DATABASE_URL=mysql+pymysql://specentra:Specentra@2024@localhost:3306/specentra
SECRET_KEY=your-secret-key-min-32-chars-change-this
FILE_STORAGE_PATH=./uploads
```

### Step 3 — Start Backend

Double-click **`start_backend.bat`** or run:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Tables are auto-created on first run. Default users are seeded automatically.

### Step 4 — Start Frontend

Double-click **`start_frontend.bat`** or run:
```bash
cd frontend-build
npm install
npm run dev
```

### Step 5 — Open Browser

Navigate to: **http://localhost:5173**

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@specentra.com | Admin@123 |
| Partner | partner@specentra.com | Partner@123 |

> ⚠️ Change all passwords before going live.

---

## Company Logo Setup

To add your firm's logo:

1. Place your logo file in `frontend-build/public/logo.png` (PNG, SVG, or WebP)
2. Open `frontend-build/src/components/layout/Sidebar.jsx`
3. Find the comment block `COMPANY LOGO PATH` (around line 30)
4. Replace:
   ```jsx
   <div className="logo-mark">S</div>
   ```
   With:
   ```jsx
   <img src="/logo.png" alt="Your Firm Name" style={{ height: 36 }} />
   ```
5. Replace `Specentra` with your firm name in the `logo-name` div
6. Rebuild frontend: `cd frontend-build && npm run build`

---

## Project Structure

```
specentra/
├── backend/
│   ├── main.py                    # FastAPI entry point + DB seed
│   ├── requirements.txt
│   ├── .env                       # ← configure your DB here
│   └── app/
│       ├── api/v1/endpoints/
│       │   ├── auth.py            # Login, logout, change password
│       │   ├── engagements.py     # CRUD + archive + rollforward
│       │   ├── folders.py         # Folder tree, create, rename, delete
│       │   ├── wps.py             # Upload, download, review, notes, signoff
│       │   ├── search.py          # Full-text search + closure checklist
│       │   └── users.py           # User management
│       ├── core/
│       │   ├── config.py          # Settings, section codes, closure checklist
│       │   ├── database.py        # SQLAlchemy engine + session
│       │   ├── security.py        # JWT + bcrypt
│       │   └── deps.py            # Auth dependencies + role checks
│       ├── models/models.py       # All DB models (16 tables)
│       ├── schemas/schemas.py     # Pydantic request/response schemas
│       └── services/
│           ├── numbering.py       # WP Numbering Engine (AMS-WP-NUM-001)
│           └── events.py          # Event bus (agent-ready for Stage 2)
│
├── frontend-build/
│   ├── src/
│   │   ├── api/index.js           # Axios client + all API calls
│   │   ├── store/index.js         # Zustand state + permissions
│   │   ├── utils/index.js         # Formatters, helpers
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── EngagementsPage.jsx
│   │   │   ├── EngagementDetailPage.jsx  # File explorer + tree
│   │   │   ├── SearchPage.jsx
│   │   │   └── UsersPage.jsx
│   │   └── components/
│   │       ├── layout/Sidebar.jsx         # ← LOGO GOES HERE
│   │       ├── wps/WPDetailPanel.jsx      # Notes, versions, signoff
│   │       ├── wps/UploadModal.jsx        # Drag & drop upload
│   │       ├── folders/CreateFolderModal.jsx
│   │       ├── closure/ClosureChecklistModal.jsx
│   │       └── engagements/RollForwardModal.jsx
│   └── dist/                      # Production build (pre-built)
│
├── database_setup.sql
├── start_backend.bat              # Windows: start backend
├── start_frontend.bat             # Windows: start frontend dev server
├── start_all.sh                   # Linux/Mac: start both
└── README.md
```

---

## API Endpoints

Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login |
| GET | /engagements | List engagements |
| POST | /engagements | Create engagement (5 sections auto-created) |
| GET | /engagements/:id | Get engagement with sections |
| PATCH | /engagements/:id/archive | Archive (Partner only, checklist enforced) |
| PATCH | /engagements/:id/reopen | Reopen archived |
| POST | /engagements/:id/rollforward | Roll forward to new FY |
| GET | /engagements/:id/folders | Full folder tree |
| POST | /engagements/:id/folders | Create folder (WP number auto-assigned) |
| PATCH | /folders/:id | Rename folder |
| DELETE | /folders/:id | Delete empty folder |
| POST | /engagements/:id/wps | Upload WP (multipart) |
| GET | /wps/:id/download | Download WP |
| POST | /wps/:id/replace | Upload new version |
| GET | /wps/:id/versions | Version history |
| POST | /wps/:id/submit | Submit for review |
| POST | /wps/:id/finalise | Finalise WP |
| GET | /wps/:id/notes | Get review notes |
| POST | /wps/:id/notes | Raise review note |
| PATCH | /notes/:id/close | Close review note |
| POST | /wps/:id/signoff | Record sign-off |
| GET | /search | Search engagements + WPs |
| GET | /engagements/:id/closure-checklist | 16-item closure checklist |
| GET | /users | List users |
| POST | /users | Create user |
| PATCH | /users/:id/deactivate | Deactivate user |

Full interactive docs: **http://localhost:8000/api/docs**

---

## User Roles

| Role | Create Eng | Archive | Upload WP | Raise Note | Finalise |
|------|-----------|---------|-----------|-----------|---------|
| Articled Assistant | ❌ | ❌ | ✅ | ❌ | ❌ |
| Audit Executive | ❌ | ❌ | ✅ | ✅ | ❌ |
| Audit Manager | ✅ | ❌ | ✅ | ✅ | ✅ |
| Partner | ✅ | ✅ | ✅ | ✅ | ✅ |
| EQCR Reviewer | ❌ | ❌ | ❌ | ✅ | ❌ |
| Admin | ✅ | ❌ | ✅ | ✅ | ❌ |

---

## WP Numbering (AMS-WP-NUM-001)

Numbers are **position-based addresses**, not sequences:

```
2000 — Audit Planning
├── 2001  Audit Strategy.xlsx          ← Level 1
├── 2002  Audit Plan.xlsx
│   ├── 2002.01  RAAP-Understanding.xlsx  ← Level 2
│   ├── 2002.02  RAAP-Controls.xlsx
│   └── 2002.03  Questionnaires/
│       ├── 2002.03A  Mgmt-Q.xlsx        ← Level 3 (suffix)
│       └── 2002.03B  Ops-Q.xlsx
└── 2003  Risk Assessment.xlsx
```

- Moving an item changes its number
- Revising a file keeps the same number
- Staff can override — conflict check prevents duplicates
- Numbers are scoped per engagement (no cross-engagement conflicts)

---

## Closure Checklist (16 items)

The system checks all 16 items before archiving is permitted:

| ID | Section | Check |
|----|---------|-------|
| CL-1001 | 1000 | Independence declaration present |
| CL-1002 | 1000 | Client acceptance/continuance present |
| CL-1003 | 1000 | Engagement letter present |
| CL-2001 | 2000 | Audit strategy present |
| CL-2002 | 2000 | Audit plan present |
| CL-2003 | 2000 | Risk assessment + audit programme |
| CL-2004 | 2000 | Materiality calculation |
| CL-3001 | 3000 | Management representation letter |
| CL-3002 | 3000 | Significant findings documented |
| CL-4001 | 4000 | At least 1 WP per audit area |
| CL-4002 | 4000 | All WPs have Prepared By |
| CL-4003 | 4000 | No WP in Draft/Submitted status |
| CL-5001 | 5000 | Draft audit report present |
| CL-5002 | 5000 | Final audit report present |
| CL-E001 | All | All review notes closed |
| CL-E002 | All | Partner sign-off on each section |

---

## Production Deployment (Windows Server)

1. Install Python, Node.js, MySQL on the server
2. Run `database_setup.sql`
3. Configure `backend/.env` with production values
4. Build frontend: `cd frontend-build && npm run build`
5. Serve `frontend-build/dist/` via IIS or nginx
6. Run backend: `python -m uvicorn main:app --host 0.0.0.0 --port 8000`
7. Use a process manager (NSSM) to run uvicorn as a Windows service

---

## Stage 2 Readiness

The event bus is already built. Every significant action emits a structured event:
- `engagement.created`, `wp.uploaded`, `review.submitted`
- `note.raised`, `note.closed`, `engagement.archived`

In Stage 2, AI agents (A1 Intake → A2 Planning → A3 Analyse → A4 Docs) will subscribe to this bus. No backend changes needed — the architecture is agent-ready from day one (DEC-008).

---

*Specentra AMS v1.0 — Stage 1 File Explorer — AMS-FR-001 v1.0*  
*ICAI Compliant · On-premise · Soft-delete only · 7-year retention*
