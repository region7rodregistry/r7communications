# Next.js App Architecture

**Stack:** Next.js 15.3 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Firebase v10

---

## Quick Start

```bash
npm install
npm run dev      # → http://localhost:3000
npm run build    # production build
npm start        # serve production build
```

`.env.local` is pre-configured with the Firebase project credentials.

---

## Route Map

| URL | Page | Access |
|-----|------|--------|
| `/` | Redirect to `/login` | Public |
| `/login` | Login page | Public |
| `/dashboard` | Department user portal | Authenticated |
| `/admin` | Admin portal | Admin role only |
| `/memo/create` | Create new memo | Authenticated |
| `/memo/[id]` | View memo detail + activity log | Authenticated |
| `/old-system` | Links to legacy HTML pages | Authenticated |

---

## Source Tree

```
src/
├── app/                        Next.js App Router pages
│   ├── layout.tsx              Root layout — wraps AuthProvider + Toaster
│   ├── globals.css             Tailwind + CSS variables + print + animations
│   ├── page.tsx                Redirects → /login
│   ├── login/page.tsx          Login page with Framer Motion entrance
│   ├── dashboard/page.tsx      Department user portal (real-time memos)
│   ├── admin/page.tsx          Admin portal (full management)
│   ├── memo/create/page.tsx    Memo creation form
│   ├── memo/[id]/page.tsx      Memo detail + approval tracker
│   └── old-system/page.tsx     Legacy system link page
│
├── components/
│   ├── ui/                     shadcn/ui components (Radix UI primitives)
│   │   ├── button.tsx          Button — variants: default/destructive/outline/ghost/link
│   │   ├── input.tsx           Styled text input
│   │   ├── label.tsx           Form label (Radix)
│   │   ├── card.tsx            Card/CardHeader/CardTitle/CardContent/CardFooter
│   │   ├── badge.tsx           Status badges — default/secondary/destructive/outline
│   │   ├── dialog.tsx          Modal dialog (Radix Dialog)
│   │   ├── select.tsx          Dropdown select (Radix Select)
│   │   ├── textarea.tsx        Styled textarea
│   │   ├── table.tsx           Table/TableHeader/TableBody/TableRow/TableHead/TableCell
│   │   ├── tabs.tsx            Tab bar (Radix Tabs)
│   │   ├── progress.tsx        Progress bar (Radix Progress)
│   │   ├── separator.tsx       Horizontal divider (Radix Separator)
│   │   ├── dropdown-menu.tsx   Dropdown menu (Radix DropdownMenu)
│   │   └── toast.tsx           Toast notifications + useToast hook
│   │
│   ├── auth/
│   │   └── LoginForm.tsx       Login card with animations, validation, Firebase auth
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx         Collapsible sidebar (64px icons / 240px expanded)
│   │   ├── Header.tsx          Top bar — dark mode toggle, user avatar, logout
│   │   └── DashboardLayout.tsx Wraps Sidebar + Header + main content area
│   │
│   ├── memo/
│   │   ├── StatsCards.tsx      Animated count-up stats cards
│   │   ├── MemoFilters.tsx     Search + status/type/date filters
│   │   ├── MemoTable.tsx       Sortable, paginated, checkbox-selectable table
│   │   ├── CreateMemoForm.tsx  Full creation form with antedation + live number preview
│   │   ├── ViewMemoDetail.tsx  Memo detail + approval timeline
│   │   ├── ActivityTimeline.tsx Chronological activity log feed
│   │   ├── MemoNumberEditor.tsx Admin panel to edit all 7 memo type counters
│   │   └── PdfUpload.tsx       Drag-and-drop PDF upload with progress bar
│   │
│   └── shared/
│       ├── ConfirmModal.tsx    Generic yes/no confirmation dialog
│       ├── StatusChangeModal.tsx Status change with password re-auth
│       └── Toaster.tsx         Toast container (renders useToast notifications)
│
├── lib/
│   ├── firebase.ts             Firebase singleton init (App, Firestore, Auth, Storage)
│   ├── memo-service.ts         All Firestore operations (ported from firebase-config.js)
│   ├── storage-service.ts      PDF upload to Firebase Storage with progress
│   └── utils.ts                cn(), formatDate(), padNumber(), suffix helpers
│
├── hooks/
│   ├── useAuth.ts              Re-export of useAuth from AuthContext
│   ├── useMemos.ts             Real-time memo list + computed stats
│   └── useMemoNumber.ts        Live memo number preview from Firestore
│
├── contexts/
│   └── AuthContext.tsx         Firebase onAuthStateChanged → UserData → context
│
├── types/
│   └── index.ts                All TypeScript types + constants
│
└── middleware.ts               Lightweight — root redirect to /login only
```

---

## Authentication Flow

```
User visits /
    ↓
middleware.ts → redirect to /login
    ↓
LoginForm.tsx
    → signInWithEmailAndPassword(auth, email, password)
    → getUserData(email) — fetch Firestore profile
    → router.push('/admin') if role === 'admin'
    → router.push('/dashboard') otherwise
    ↓
AuthContext (always active)
    → onAuthStateChanged listener
    → sets user + userData in context
    → loading: false once resolved
    ↓
Each page checks:
    if (!authLoading && !user) router.replace('/login')
    if (!authLoading && userData?.role !== 'admin') router.replace('/dashboard')
```

---

## Real-Time Data Flow

```
useMemos() hook
    → getMemosByDepartment() or getAllMemosRealtime()
    → Firestore onSnapshot listener
    → callback fires on every change
    → setMemos(newMemos) → React re-renders
    → useEffect cleanup → unsubscribe() on unmount
```

Admin dashboard uses `getAllMemosRealtime()` (all departments).  
User dashboard uses `getMemosByDepartment(userData.department)`.

---

## State Architecture

| State Type | How Managed |
|-----------|------------|
| Auth user + profile | React Context (`AuthContext`) |
| Memo list (real-time) | Custom hook `useMemos` + `useState` |
| Memo number preview | Custom hook `useMemoNumber` + `onSnapshot` |
| UI state (modals, filters, tabs) | Local `useState` in each page component |
| Toast notifications | `useToast` hook (shared singleton) |
| Dark mode | `localStorage` + class on `<html>` (toggled in Header) |

---

## Animations

| Element | Animation |
|---------|----------|
| Login page | Framer Motion fade-up + spring scale |
| Sidebar expand/collapse | Framer Motion spring width transition |
| Page content | Framer Motion fade-up on mount |
| Stats cards | Animated count-up numbers |
| Modal open/close | Radix animate-in/out (scaleIn + fadeIn) |
| Toast notifications | Slide in from right |
| Table rows | Stagger fade-in |
| Tab content switch | Opacity crossfade |

---

## memo-service.ts — All Functions

| Function | Collection | Operation |
|----------|-----------|-----------|
| `createMemo(data)` | `memos` | `addDoc` |
| `getMemosByDepartment(dept, cb)` | `memos` | `onSnapshot` with `where` + `orderBy` |
| `getAllMemosRealtime(cb)` | `memos` | `onSnapshot` with `orderBy` |
| `getAllMemos()` | `memos` | `getDocs` |
| `getMemoById(id)` | `memos` | `getDoc` |
| `updateMemoStatus(id, status)` | `memos` | `updateDoc` |
| `updateMemo(id, data)` | `memos` | `updateDoc` |
| `deleteMemoFromFirestore(id)` | `memos` + `memoActivities` | `deleteDoc` cascade |
| `deleteActivityLogsForMemos(ids[])` | `memoActivities` | `deleteDoc` bulk |
| `cleanupOrphanedActivityLogs()` | both | find + delete orphans |
| `getNextMemoNumber(type)` | `memoNumbers` | `runTransaction` (atomic increment) |
| `getCurrentMemoNumber(type)` | `memoNumbers` | `getDoc` |
| `updateMemoNumberCounter(type, n)` | `memoNumbers` | `updateDoc` |
| `logMemoActivity(id, action, user)` | `memoActivities` | `addDoc` |
| `getActivityLogsForMemo(id)` | `memoActivities` | `getDocs` with `where` + `orderBy` |
| `getUserData(email)` | `users` | `getDocs` with `where`, auto-create if missing |
| `incrementAnalyticsCounter(type)` | `analytics` | `runTransaction` with day-reset logic |

---

## Environment Variables

All in `.env.local` (pre-configured, never commit to source control):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## Legacy HTML Files

The original vanilla HTML files (`index.html`, `admin-dashboard.html`, `user-dashboard.html`, etc.) are still present in the project root. They are **not served by Next.js** — the Next.js app runs on port 3000 and handles all routes. The legacy files remain as reference and backup only.
