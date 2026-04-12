# Frontend Stack

**Files involved:** All HTML files, `styles.css`

---

## Technologies

| Technology | Version | How It's Loaded | Purpose |
|-----------|---------|----------------|---------|
| Tailwind CSS | v3 | CDN (`cdn.tailwindcss.com`) | Utility-first CSS framework for all styling |
| Lucide Icons | latest | CDN (`unpkg.com/lucide@latest`) | SVG icon set |
| Firebase SDK | v10.8.0 | CDN (ES module from `gstatic.com`) | Backend: Auth, Firestore, Storage |
| XLSX | 0.18.5 | CDN (`cdn.sheetjs.com`) | Excel file export |
| JSZip | 3.10.1 | CDN (`cdnjs.cloudflare.com`) | ZIP file creation for bulk PDF download |

All libraries are loaded from CDN — there is no local build step or npm install required for the frontend.

---

## Tailwind CSS

Tailwind is loaded via CDN in every HTML file:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

The CDN version compiles Tailwind on-the-fly in the browser. In production, this is acceptable for small internal tools but would be replaced by a build step (e.g., PostCSS) for performance-sensitive applications.

**Dark mode:** Configured via the `dark` class on `<html>`. All dark mode styles use Tailwind's `dark:` prefix variants.

**Responsive design:** Uses Tailwind's `sm:`, `md:`, `lg:` breakpoint prefixes. Mobile-first approach.

---

## Lucide Icons

Loaded as a script module:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  lucide.createIcons(); // Call after DOM is ready
</script>
```

Icons are added via `data-lucide` attributes:

```html
<i data-lucide="file-text"></i>
<i data-lucide="check-circle"></i>
```

`lucide.createIcons()` replaces all `data-lucide` elements with inline SVGs.

**Where called:** In each HTML file's `DOMContentLoaded` or `window.onload` handler.

---

## Firebase SDK

Loaded as ES modules via importmap or direct CDN links:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, ... } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, ... } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ... } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
```

HTML files that use Firebase must include `type="module"` on their script tags:

```html
<script type="module" src="firebase-config.js"></script>
```

or import inline:

```html
<script type="module">
  import { createMemo } from './firebase-config.js';
  // ...
</script>
```

---

## `styles.css` — Shared Custom Classes

**File:** `styles.css`  
Supplements Tailwind with custom classes that aren't easily expressed as utility classes.

### Animations

| Class | Effect |
|-------|--------|
| `.animate-spin` | Continuous 360° rotation (used for loading spinners) |

### Background

| Class | Effect |
|-------|--------|
| `.gradient-bg` | Diagonal gradient background (used on login page) |

### Status Badges

| Class | Color |
|-------|-------|
| `.status-active` | Green |
| `.status-pending` | Yellow |
| `.status-completed` | Blue |

### Priority Badges

| Class | Color |
|-------|-------|
| `.priority-high` | Red |
| `.priority-medium` | Orange |
| `.priority-low` | Gray |

### Interactive Effects

| Class | Effect |
|-------|--------|
| `.hover-lift` | Translates element upward on hover (`translateY(-2px)`) with shadow |
| `.card-hover` | Scale + shadow on hover |

### Typography

| Class | Effect |
|-------|--------|
| `.text-responsive` | Responsive font size that scales with viewport |

### Print

| Class | Effect |
|-------|--------|
| `.no-print` | `display: none` in `@media print` |

---

## JavaScript Patterns

All JavaScript is **vanilla ES6+** — no frameworks, no jQuery, no React.

### Module Pattern

`firebase-config.js` is an ES6 module. Other files import from it:

```javascript
import {
  createMemo,
  getMemosByDepartment,
  updateMemoStatus,
  deleteMemoFromFirestore,
  uploadPDF
} from './firebase-config.js';
```

### Event Delegation

Action buttons in tables are dynamically generated. Event listeners are attached to the **table container** rather than individual buttons:

```javascript
document.getElementById('memoTableBody').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-view')) {
    viewMemo(e.target.dataset.id);
  }
  if (e.target.classList.contains('btn-delete')) {
    deleteMemo(e.target.dataset.id);
  }
});
```

### Toast Notifications

Shared pattern across all dashboards:

```javascript
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = type === 'success' ? 'toast-success' : 'toast-error';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}
```

### Modal Dialogs

Confirmation modals follow a consistent pattern:
1. Show modal by removing `hidden` class
2. Bind confirm button to action function
3. Bind cancel/close button to hide modal
4. Support `Escape` key and click-outside to dismiss

---

## HTML Page Structure

Every page follows the same structure:

```html
<!DOCTYPE html>
<html lang="en" class="[dark]">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — TESDA MBMS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-gray-50 dark:bg-gray-900">

  <!-- Page content -->

  <!-- Scripts (Firebase SDK + Lucide + page-specific JS) -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script type="module">
    import { ... } from './firebase-config.js';
    // Page logic
    lucide.createIcons();
  </script>
</body>
</html>
```

---

## Browser Compatibility

| Feature | Minimum Support Required |
|---------|------------------------|
| ES6 Modules (`import`/`export`) | Chrome 61+, Firefox 60+, Safari 10.1+ |
| `async`/`await` | Chrome 55+, Firefox 52+, Safari 10.1+ |
| Firestore real-time (`onSnapshot`) | Any modern browser with WebSocket support |
| Drag-and-drop file upload | Chrome 4+, Firefox 3.5+, Safari 6+ |
| `navigator.clipboard.writeText` | Chrome 66+, Firefox 63+, Safari 13.1+ |

**Not supported:** IE 11 or older browsers. This is an internal tool and only needs to support modern browsers used by TESDA staff.

---

## Build & Deployment

| Step | Description |
|------|-------------|
| No build step | HTML files are served as-is — no bundler required |
| Hosting | Vercel — automatic deployment on push to `main` branch |
| Local dev | Live Server VS Code extension on `localhost:5500` |
| Assets | All assets (CSS, JS, JSON) are local files or CDN |
| No package install | `package.json` is present but `node_modules` is not needed for the frontend |
