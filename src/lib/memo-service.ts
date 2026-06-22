import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  runTransaction,
  onSnapshot,
  DocumentReference,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Memo, MemoActivity, UserData, MemoType } from '@/types'
import { MEMO_TYPE_KEYS } from '@/types'

// ─── Memo CRUD ────────────────────────────────────────────────────────────────

export async function createMemo(
  memoData: Omit<Memo, 'id'>
): Promise<DocumentReference> {
  const memoWithTimestamp = {
    ...memoData,
    createdAt: memoData.createdAt || new Date(),
    status: 'pending',
  }

  const docRef = await addDoc(collection(db, 'memos'), memoWithTimestamp)

  // Update counter only for non-antedated memos
  if (!memoData.isAntedated) {
    const memoType = memoData.memoType as MemoType
    const key = MEMO_TYPE_KEYS[memoType]
    if (key) {
      const memoNumberRef = doc(db, 'memoNumbers', key)
      const currentNumber = parseInt(memoData.memoNumber.replace(/[A-Z]+$/, '').split('-').pop() || '0')
      await updateDoc(memoNumberRef, { number: currentNumber, year: new Date().getFullYear() })
    }
  }

  return docRef
}

export function getMemosByDepartment(
  department: string,
  callback: (memos: Memo[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'memos'), where('department', '==', department))
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const memos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Memo))
      memos.sort((a, b) => {
        const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)
        const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)
        return bt.getTime() - at.getTime()
      })
      callback(memos)
    },
    (err) => {
      console.error('[getMemosByDepartment]', err)
      onError?.(err)
    }
  )
  return unsubscribe
}

export function getAllMemosRealtime(
  callback: (memos: Memo[]) => void,
  onError?: (err: Error) => void
): () => void {
  // No orderBy here — avoids index requirements and documents without createdAt
  // being silently excluded. Client-side sort keeps the same result.
  const q = query(collection(db, 'memos'))
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const memos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Memo))
      memos.sort((a, b) => {
        const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)
        const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)
        return bt.getTime() - at.getTime()
      })
      callback(memos)
    },
    (err) => {
      console.error('[getAllMemosRealtime]', err)
      onError?.(err)
    }
  )
  return unsubscribe
}

export async function getAllMemos(): Promise<Memo[]> {
  const snapshot = await getDocs(collection(db, 'memos'))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Memo))
}

export async function getMemoById(memoId: string): Promise<Memo | null> {
  const snap = await getDoc(doc(db, 'memos', memoId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Memo
}

export async function updateMemoStatus(
  memoId: string,
  status: string,
  extraFields?: Record<string, any>
): Promise<void> {
  const memoRef = doc(db, 'memos', memoId)
  await updateDoc(memoRef, {
    status,
    updatedAt: new Date(),
    ...(extraFields || {}),
  })
}

export async function updateMemo(
  memoId: string,
  fields: Partial<Memo>
): Promise<void> {
  const memoRef = doc(db, 'memos', memoId)
  await updateDoc(memoRef, { ...fields, updatedAt: new Date() })
}

export async function deleteMemoFromFirestore(memoId: string): Promise<void> {
  // Delete related activity logs first
  const activityQuery = query(
    collection(db, 'memoActivities'),
    where('memoId', '==', memoId)
  )
  const activitySnap = await getDocs(activityQuery)
  await Promise.all(activitySnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'memos', memoId))
}

export async function deleteActivityLogsForMemos(memoIds: string[]): Promise<void> {
  if (!memoIds?.length) return
  // Firestore 'in' supports max 30 items; batch in chunks
  const chunks: string[][] = []
  for (let i = 0; i < memoIds.length; i += 30) {
    chunks.push(memoIds.slice(i, i + 30))
  }
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'memoActivities'),
      where('memoId', 'in', chunk)
    )
    const snap = await getDocs(q)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  }
}

export async function cleanupOrphanedActivityLogs(): Promise<number> {
  const [actSnap, memoSnap] = await Promise.all([
    getDocs(query(collection(db, 'memoActivities'))),
    getDocs(query(collection(db, 'memos'))),
  ])
  const existingIds = new Set(memoSnap.docs.map((d) => d.id))
  const orphaned = actSnap.docs.filter((d) => !existingIds.has(d.data().memoId))
  await Promise.all(orphaned.map((d) => deleteDoc(d.ref)))
  return orphaned.length
}

// ─── Memo Numbers ─────────────────────────────────────────────────────────────
// Counter documents: { number: N, year: YYYY }
// On every call, if the stored year differs from the current calendar year the
// counter is automatically reset to 1 — giving per-year sequences at no cost.
// Antedated memos bypass these counters entirely (see getNextAntedatedMemoNumber).

export async function getNextMemoNumber(memoType: MemoType): Promise<number> {
  const key = MEMO_TYPE_KEYS[memoType]
  if (!key) throw new Error('Unknown memo type')
  const memoNumberRef = doc(db, 'memoNumbers', key)
  const currentYear = new Date().getFullYear()

  const result = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(memoNumberRef)

    if (!snap.exists()) {
      transaction.set(memoNumberRef, { number: 1, year: currentYear })
      return { number: 1 }
    }

    const data = snap.data()
    const storedYear: number = data.year ?? currentYear

    // New calendar year — reset sequence to 1
    if (storedYear !== currentYear) {
      transaction.update(memoNumberRef, { number: 1, year: currentYear })
      return { number: 1 }
    }

    const next = (data.number ?? 0) + 1
    transaction.update(memoNumberRef, { number: next })
    return { number: next }
  })
  return result.number
}

export async function getCurrentMemoNumber(memoType: MemoType): Promise<number> {
  const key = MEMO_TYPE_KEYS[memoType]
  if (!key) throw new Error('Unknown memo type')
  const snap = await getDoc(doc(db, 'memoNumbers', key))
  if (!snap.exists()) return 0

  const data = snap.data()
  const storedYear: number = data.year ?? new Date().getFullYear()

  // If the counter belongs to a past year it will reset on next use — report 0
  if (storedYear !== new Date().getFullYear()) return 0

  return data.number ?? 0
}

/** Real-time subscription to all memo number counters. Returns an unsubscribe fn. */
export function subscribeToMemoCounters(
  types: MemoType[],
  callback: (counters: Partial<Record<MemoType, number>>) => void
): () => void {
  const currentYear = new Date().getFullYear()
  const state: Partial<Record<MemoType, number>> = {}
  const unsubscribers: (() => void)[] = []

  for (const memoType of types) {
    const key = MEMO_TYPE_KEYS[memoType]
    if (!key) continue
    const ref = doc(db, 'memoNumbers', key)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        state[memoType] = 0
      } else {
        const data = snap.data()
        const storedYear: number = data.year ?? currentYear
        state[memoType] = storedYear !== currentYear ? 0 : (data.number ?? 0)
      }
      callback({ ...state })
    })
    unsubscribers.push(unsub)
  }

  return () => unsubscribers.forEach(u => u())
}

export async function updateMemoNumberCounter(
  memoType: MemoType,
  newNumber: number
): Promise<void> {
  const key = MEMO_TYPE_KEYS[memoType]
  if (!key) throw new Error('Unknown memo type')
  const ref = doc(db, 'memoNumbers', key)
  const currentYear = new Date().getFullYear()
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { number: newNumber, year: currentYear })
  } else {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(ref, { number: newNumber, year: currentYear })
  }
}

// ─── Activity Logging ─────────────────────────────────────────────────────────

export async function logMemoActivity(
  memoId: string,
  action: string,
  username: string
): Promise<void> {
  await addDoc(collection(db, 'memoActivities'), {
    memoId,
    action,
    username,
    timestamp: new Date(),
  })
}

export async function getActivityLogsForMemo(
  memoId: string
): Promise<MemoActivity[]> {
  // Single-field query only — avoids requiring a composite index.
  // Sorting is done client-side after fetch.
  const q = query(
    collection(db, 'memoActivities'),
    where('memoId', '==', memoId)
  )
  const snap = await getDocs(q)
  const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemoActivity))
  // Sort ascending by timestamp client-side
  return logs.sort((a, b) => {
    const at = a.timestamp?.toDate?.() ?? new Date(a.timestamp ?? 0)
    const bt = b.timestamp?.toDate?.() ?? new Date(b.timestamp ?? 0)
    return at.getTime() - bt.getTime()
  })
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getUserData(email: string): Promise<UserData> {
  const q = query(collection(db, 'users'), where('email', '==', email))
  const snap = await getDocs(q)

  if (!snap.empty) {
    return snap.docs[0].data() as UserData
  }

  // Auto-create user document
  const userData: UserData = {
    email,
    username: email.split('@')[0],
    department: email.includes('ord')
      ? 'ORD'
      : email.includes('rod')
      ? 'ROD'
      : email.includes('fasd')
      ? 'FASD'
      : 'Administration',
    role: email.includes('@tesda.gov.ph') ? 'admin' : 'user',
  }

  await addDoc(collection(db, 'users'), { ...userData, createdAt: new Date() })
  return userData
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function incrementAnalyticsCounter(
  type: 'read' | 'write'
): Promise<void> {
  const analyticsRef = doc(db, 'analytics', 'global')
  const todayKey = new Date().toISOString().slice(0, 10)

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(analyticsRef)
    const data: Record<string, any> = snap.exists() ? snap.data() : {}

    const lastUpdated = data.lastUpdated
    let lastDay: string | null = null
    if (lastUpdated?.toDate) {
      lastDay = lastUpdated.toDate().toISOString().slice(0, 10)
    } else if (lastUpdated instanceof Date) {
      lastDay = lastUpdated.toISOString().slice(0, 10)
    }

    if (lastDay !== todayKey) {
      data.todayReads = 0
      data.todayWrites = 0
    }

    if (type === 'read') {
      data.totalReads = (data.totalReads || 0) + 1
      data.todayReads = (data.todayReads || 0) + 1
    } else {
      data.totalWrites = (data.totalWrites || 0) + 1
      data.todayWrites = (data.todayWrites || 0) + 1
    }

    data.lastUpdated = new Date()
    transaction.set(analyticsRef, data, { merge: true })
  })
}

// ─── Antedation Logic ─────────────────────────────────────────────────────────

function indexToSuffix(index: number): string {
  if (index === 0) return 'A'
  const result: string[] = []
  let n = index
  while (n >= 0) {
    result.unshift(String.fromCharCode(65 + (n % 26)))
    n = Math.floor(n / 26) - 1
  }
  return result.join('')
}

function suffixToIndex(suffix: string): number {
  let result = 0
  for (let i = 0; i < suffix.length; i++) {
    result = result * 26 + (suffix.charCodeAt(i) - 64)
  }
  return result - 1
}

function getMemoDateKey(m: Memo): string | null {
  if (m.antedationDate) return m.antedationDate
  const raw = m.createdAt
  if (!raw) return null
  const d: Date = raw?.toDate?.() ?? (raw instanceof Date ? raw : new Date(raw))
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export async function getNextAntedatedMemoNumber(
  memoType: MemoType,
  selectedDate: string,
  department: string,
  year: number
): Promise<string> {
  const allMemos = await getAllMemos()
  const typePrefix = getMemoTypePrefix(memoType)
  const deptCode = getDeptCode(department)
  const prefix = `${typePrefix}-${year}-${deptCode}-`

  // IMPORTANT: memo numbers run as ONE sequence per type, shared across every
  // department. The counters in `memoNumbers` are keyed by type only (e.g. all
  // CO memos share "coCurrent" — see getNextMemoNumber / MEMO_TYPE_KEYS), so the
  // "Nth CO" is a global count, not a per-department one. The look-back must
  // therefore span ALL departments: find the last number of THIS TYPE issued on
  // or before the selected date, then append the next free suffix.
  //
  // Matching is done on the type prefix of the number string itself (e.g.
  // "CO-"), which both the current and the legacy (pre-Next.js) system always
  // write. That makes the search immune to department-code drift ("FAS"/"ADM"),
  // year drift, and suffix-format differences — so real history is never missed.
  // A 0001-A result now genuinely means there is NO memo of this type at all on
  // or before that date.
  const baseNum = findBaseNumberForDate(allMemos, selectedDate, typePrefix)
  if (!baseNum) {
    return `${prefix}0001-A`
  }

  // Append the next suffix that is free for this base number across ALL days
  // and departments — so we never reissue a suffix already used anywhere.
  return getNextSuffixForBase(allMemos, prefix, typePrefix, baseNum)
}

// Trailing sequence number + optional letter suffix of a memo number. Tolerant
// of the current dashed form ("…-0450-A"), legacy dash-less data ("…-0450A")
// and a bare base ("…-0450"). Because only the year and the sequence are digit
// runs and the year is never at the end, this reliably captures the sequence.
const SEQ_RE = /(\d+)-?([A-Z]*)$/

// A memo belongs to the same (global, per-type) sequence when its number begins
// with this type's prefix, e.g. "CO-". Department and year are intentionally NOT
// part of the test — the sequence is shared across departments and the prefix is
// the one token both the old and new systems always write the same way.
function isSameType(m: Memo, typePrefix: string): boolean {
  return !!m.memoNumber && m.memoNumber.startsWith(`${typePrefix}-`)
}

// Base number to antedate against: the highest number issued on the selected
// day itself. If that day has no memo, backtrack to the most recent earlier day
// that does, and use that day's highest number. Returns null only when no memo
// of this type exists on or before the selected date (in ANY department).
function findBaseNumberForDate(
  allMemos: Memo[],
  selectedDate: string,
  typePrefix: string
): string | null {
  // Date key of the most recent day (<= selectedDate) that has any such memo.
  let latestDay: string | null = null
  for (const m of allMemos) {
    if (!isSameType(m, typePrefix)) continue
    const memoDate = getMemoDateKey(m)
    if (!memoDate || memoDate > selectedDate) continue
    if (!latestDay || memoDate > latestDay) latestDay = memoDate
  }
  if (!latestDay) return null

  // Highest base number among the memos on that day.
  let best: { num: number; base: string } | null = null
  for (const m of allMemos) {
    if (!isSameType(m, typePrefix)) continue
    if (getMemoDateKey(m) !== latestDay) continue

    const match = m.memoNumber!.match(SEQ_RE)
    if (!match) continue

    const num = parseInt(match[1])
    if (!best || num > best.num) best = { num, base: match[1] }
  }

  return best?.base ?? null
}

// Next free suffix for `baseNum`, scanning every memo of this type that shares
// the base number regardless of day or department. Empty suffix (the original,
// non-antedated number) counts as index -1, so the first suffix is "A". `prefix`
// carries the canonical (current) year + department code the number is issued
// under; the suffix is unique across the whole type sequence.
function getNextSuffixForBase(
  allMemos: Memo[],
  prefix: string,
  typePrefix: string,
  baseNum: string
): string {
  const target = parseInt(baseNum)
  let maxSuffixIdx = -1

  for (const m of allMemos) {
    if (!isSameType(m, typePrefix)) continue
    const match = m.memoNumber!.match(SEQ_RE)
    if (!match || parseInt(match[1]) !== target) continue

    const idx = match[2] ? suffixToIndex(match[2]) : -1
    if (idx > maxSuffixIdx) maxSuffixIdx = idx
  }

  return `${prefix}${baseNum}-${indexToSuffix(maxSuffixIdx + 1)}`
}

export async function validateMemoNumberUniqueness(
  memoNumber: string,
  excludeMemoId?: string
): Promise<boolean> {
  const q = query(collection(db, 'memos'), where('memoNumber', '==', memoNumber))
  const snap = await getDocs(q)
  if (snap.empty) return true
  if (
    excludeMemoId &&
    snap.docs.every((d) => d.id === excludeMemoId)
  ) {
    return true
  }
  return false
}

function getMemoTypePrefix(memoType: string): string {
  const map: Record<string, string> = {
    'PO': 'PO', 'CO': 'CO', 'Office Order': 'OO',
    'Advisory': 'ADV', 'AdvisoryBulletin': 'AB',
    'Bulletin': 'BUL', 'Acknowledgment': 'ACK',
  }
  return map[memoType] || memoType
}

function getDeptCode(department: string): string {
  const map: Record<string, string> = {
    'ORD': 'ORD', 'ROD': 'ROD', 'FASD': 'FASD', 'Administration': 'ORD',
  }
  return map[department] || department
}
