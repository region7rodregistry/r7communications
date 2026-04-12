# R7 Communications — TESDA MBMS Documentation

**Project:** ro7communications  
**Full Name:** TESDA Region VII Memo-Based Management System (MBMS)  
**Repository:** https://github.com/r7rodiTeam/ro7communications  
**Production URL:** https://r7communications.vercel.app  
**Firebase Project:** ro7mbms

---

## What This System Does

TESDA MBMS is a web-based document management system for TESDA Region VII. It manages the full lifecycle of internal memos — from creation and routing to approval, distribution, and archival — across three departments: ORD, ROD, and FASD.

---

## Documentation Index

| File | What It Covers |
|------|---------------|
| [README.md](./README.md) | This overview — project purpose, tech stack, file map |
| [Firebase-Config.md](./Firebase-Config.md) | All Firebase functions, DB queries, Storage operations |
| [Database-Schema.md](./Database-Schema.md) | Firestore collections, document shapes, indexes |
| [Authentication.md](./Authentication.md) | Login flow, session management, role-based access |
| [Admin-Dashboard.md](./Admin-Dashboard.md) | Admin portal — all features, functions, and queries |
| [User-Dashboard.md](./User-Dashboard.md) | Department user portal — features and queries |
| [Create-Memo.md](./Create-Memo.md) | Memo creation form — memo numbering, antedation logic |
| [View-Memo.md](./View-Memo.md) | Memo detail view — activity tracking, print support |
| [Memo-Workflow.md](./Memo-Workflow.md) | End-to-end memo lifecycle from creation to archival |
| [Storage.md](./Storage.md) | Firebase Storage — PDF upload, CORS, download |
| [Utilities.md](./Utilities.md) | Utility pages, admin tools, legacy system |
| [Frontend-Stack.md](./Frontend-Stack.md) | CSS, icons, libraries, and styling conventions |

---

## Project File Map

```
r7communications/
│
├── index.html                  Login page (Firebase Auth)
├── user-dashboard.html         Department user portal
├── admin-dashboard.html        Administrator portal
├── create-memo.html            Memo creation form
├── view-memo.html              Memo detail & activity log view
├── upload.html                 Simple PDF upload utility
├── upload-test.html            PDF upload test with detailed logging
├── verify-cors.html            CORS configuration verification tool
├── ictunit.html                ICT team information page
├── init-users.html             User initialization utility
├── download-all-pdfs-example.html  Bulk PDF download tool
│
├── firebase-config.js          Central Firebase module (all DB + Storage functions)
├── app.js                      Legacy localStorage-based app class
├── users.js                    Static user credentials for fallback
├── deleteNullTitles.js         Admin script: remove memos with null titles
├── styles.css                  Shared CSS classes and animations
├── package.json                NPM metadata
├── cors.json                   Firebase Storage CORS configuration
│
├── oldsystem/
│   ├── index.html              Historical records viewer (2020–2025)
│   ├── convert.html            Data migration tool
│   └── [2020–2025].json        Historical memo data files
│
└── Documentation/              ← YOU ARE HERE
    ├── README.md
    ├── Firebase-Config.md
    ├── Database-Schema.md
    ├── Authentication.md
    ├── Admin-Dashboard.md
    ├── User-Dashboard.md
    ├── Create-Memo.md
    ├── View-Memo.md
    ├── Memo-Workflow.md
    ├── Storage.md
    ├── Utilities.md
    └── Frontend-Stack.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Styling | Tailwind CSS v3 |
| Icons | Lucide Icons |
| Backend | Firebase v10.8.0 (Firestore, Auth, Storage) |
| Export | XLSX 0.18.5 (Excel), JSZip 3.10.1 (ZIP) |
| Hosting | Vercel |
| Dev Server | Live Server (localhost:5500 / localhost:3000) |

---

## Departments

| Code | Full Name |
|------|----------|
| ORD | Office of the Regional Director |
| ROD | Regional Operations Division |
| FASD | Finance and Administrative Services Division |
| Administration | Admin-level access (all departments) |

---

## Memo Types

| Type | Code | Firestore Counter Doc |
|------|------|----------------------|
| Positioning Order | PO | `current` |
| Compliance Order | CO | `coCurrent` |
| Office Order | — | `officeOrder` |
| Advisory | — | `advisory` |
| Advisory Bulletin | — | `advisoryBulletin` |
| Bulletin | — | `bulletin` |
| Acknowledgment | — | `acknowledgment` |

---

## Memo Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Newly created, awaiting admin review |
| `signed` | Signed but not yet released |
| `approved` | Approved and released to departments |
| `cancelled` | Cancelled/rejected |
| `archived` | Approved and archived |

---

## Roles

| Role | Access |
|------|--------|
| `user` | View and receive memos for their department |
| `admin` | Full access — create, approve, delete, configure |

---

## Seeded User Accounts

| Email | Department | Role |
|-------|-----------|------|
| ord7.communication@gmail.com | ORD | user |
| region7.rod@gmail.com | ROD | user |
| region7.fasd@gmail.com | FASD | user |
| region7@tesda.gov.ph | Administration | admin |
