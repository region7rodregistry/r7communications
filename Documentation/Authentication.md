# Authentication

**Files involved:** `index.html`, `firebase-config.js`, `users.js`, `app.js`

---

## Overview

Authentication uses **Firebase Authentication** with email/password. On successful login, user data is fetched from Firestore and stored in `localStorage` for use across pages.

---

## Login Flow — `index.html`

### 1. User Submits Form

The login form collects `email` and `password`. On submit:

```
Email + Password
      ↓
Client-side validation
      ↓
Firebase signInWithEmailAndPassword()
      ↓
getUserData(email) — fetch Firestore profile
      ↓
Store user object in localStorage
      ↓
Role-based redirect
```

### 2. Client-Side Validation (before Firebase call)

| Check | Rule |
|-------|------|
| Email format | Must match regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Password length | Minimum 6 characters |
| Both fields | Must not be empty |

Errors display inline below the respective input field.

### 3. Firebase Authentication Call

```javascript
// firebase-config.js → authenticateUser()
signInWithEmailAndPassword(auth, email, password)
```

On failure, Firebase returns error codes that map to user-friendly messages:
| Firebase Error Code | Message Shown |
|--------------------|-----------------------|
| `auth/user-not-found` | "No account found with this email" |
| `auth/wrong-password` | "Incorrect password" |
| `auth/invalid-email` | "Invalid email format" |
| `auth/too-many-requests` | "Too many attempts, try later" |

### 4. Firestore User Data Fetch

After successful Firebase Auth, `getUserData(email)` is called:

```javascript
// Queries: users collection where email == email
query(collection(db, 'users'), where('email', '==', email))
```

If a document is found, it returns `{ email, username, department, role }`.

If **no document is found** (first-ever login), one is auto-created using email domain inference (see [Database-Schema.md](./Database-Schema.md)).

### 5. localStorage Persistence

The user object is stored so dashboards can access it without re-querying:

```javascript
localStorage.setItem('currentUser', JSON.stringify({
  email: userData.email,
  username: userData.username,
  department: userData.department,
  role: userData.role
}))
```

### 6. Role-Based Redirect

| Condition | Redirect |
|-----------|---------|
| `role === 'admin'` | `admin-dashboard.html` |
| `department === 'ORD'` | `ord-dashboard.html` |
| All others | `user-dashboard.html` |

---

## Session Persistence Across Pages

Every dashboard page reads the user from `localStorage` on load:

```javascript
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  window.location.href = 'index.html';
}
```

Additionally, `auth.onAuthStateChanged()` is monitored — if Firebase Auth session expires, the user is redirected to `index.html`.

---

## Inactivity Session Timeout

`user-dashboard.html` implements a **15-minute inactivity timeout**.

**Events that reset the timer:**
- `mousemove`
- `keydown`
- `click`
- `scroll`
- `touchstart`

**Implementation:**

```javascript
let inactivityTimer;

function resetTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logoutUser();
    window.location.href = 'index.html';
  }, 15 * 60 * 1000); // 15 minutes
}

// Attach to all activity events
['mousemove','keydown','click','scroll','touchstart'].forEach(evt => {
  document.addEventListener(evt, resetTimer);
});

resetTimer(); // start on page load
```

---

## Logout

All dashboards have a logout button that calls:

```javascript
// firebase-config.js → logoutUser()
signOut(auth)
  .then(() => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  })
```

---

## Password Confirmation for Sensitive Actions

Certain admin actions require a password re-entry modal before proceeding:

| Action | Requires Password? |
|--------|-------------------|
| Delete memo | Yes |
| Bulk delete memos | Yes |
| Change memo status | Yes |
| Edit memo number counter | Yes |
| Create memo | No |
| View memo | No |
| Export data | No |

The password entered is re-verified against Firebase Auth before the action proceeds.

---

## Fallback Authentication — `users.js`

`users.js` is a **legacy/fallback** static user list used before Firebase Auth was integrated. It is not used in production flows but remains in the codebase.

```javascript
// users.js
const users = [
  { username: 'ROD', password: 'rod2025', department: 'ROD', role: 'user' },
  { username: 'ORD', password: 'ord2025', department: 'ORD', role: 'user' },
  { username: 'FASD', password: 'fasd2025', department: 'FASD', role: 'user' },
  { username: 'admintesda', password: 'tesdaadmin', department: 'Administration', role: 'admin' }
];

export function validateUser(username, password) { ... }
export function getUserByUsername(username) { ... }
```

**Note:** These credentials are hardcoded and should not be used in production. The active authentication path goes through Firebase Auth and `firebase-config.js`.

---

## Legacy App Class Authentication — `app.js`

`app.js` contains a `TesdaMBMS` class with localStorage-only authentication (pre-Firebase). It is not used in any active page but is listed as the `main` entry in `package.json`.

```javascript
login(username, password, department) {
  // Validates against local users array
  // Stores user in localStorage
  // No Firebase involvement
}
logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}
```

---

## Seeded Accounts

Run `init-users.html` once to seed the `users` Firestore collection. Firebase Auth accounts must be created separately in the Firebase Console or via the Firebase Admin SDK.

| Email | Department | Role |
|-------|-----------|------|
| ord7.communication@gmail.com | ORD | user |
| region7.rod@gmail.com | ROD | user |
| region7.fasd@gmail.com | FASD | user |
| region7@tesda.gov.ph | Administration | admin |
