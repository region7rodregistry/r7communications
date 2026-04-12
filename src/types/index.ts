export type MemoStatus = 'pending' | 'signed' | 'approved' | 'cancelled' | 'archived'
export type MemoType = 'PO' | 'CO' | 'Office Order' | 'Advisory' | 'AdvisoryBulletin' | 'Bulletin' | 'Acknowledgment'
export type Department = 'ORD' | 'ROD' | 'FASD' | 'Administration'
export type UserRole = 'user' | 'admin'

export interface Memo {
  id: string
  memoNumber: string
  title: string
  description: string
  department: Department
  recipients: string[]
  authorFocal: string
  signatory: string
  createdBy: string
  memoType: MemoType
  isAntedated: boolean
  antedationDate: string | null
  createdAt: any // Firestore Timestamp
  updatedAt?: any
  status: MemoStatus
  pdfUrl?: string | null
  pdfUploadedAt?: any
  pdfFileName?: string | null
  releasedToRodFasd?: any  // Firestore Timestamp — set when memo is released to ROD/FASD
  receivedByRodFasd?: any  // Firestore Timestamp — set when memo is received
  receivedByName?: string  // Name of the person who marked it received
  actionTaken?: boolean
  actionTakenAt?: any
  actionTakenBy?: string
}

export interface MemoActivity {
  id: string
  memoId: string
  action: string
  username: string
  timestamp: any // Firestore Timestamp
}

export interface UserData {
  email: string
  username: string
  department: Department
  role: UserRole
}

export interface MemoNumberDoc {
  number: number
}

export const MEMO_TYPE_KEYS: Record<MemoType, string> = {
  'PO': 'current',
  'CO': 'coCurrent',
  'Office Order': 'officeOrder',
  'Advisory': 'advisory',
  'AdvisoryBulletin': 'advisoryBulletin',
  'Bulletin': 'bulletin',
  'Acknowledgment': 'acknowledgment',
}

export const MEMO_TYPE_PREFIXES: Record<MemoType, string> = {
  'PO': 'PO',
  'CO': 'CO',
  'Office Order': 'OO',
  'Advisory': 'ADV',
  'AdvisoryBulletin': 'AB',
  'Bulletin': 'BUL',
  'Acknowledgment': 'ACK',
}

export const DEPARTMENT_CODES: Record<Department, string> = {
  'ORD': 'ORD',
  'ROD': 'ROD',
  'FASD': 'FASD',
  'Administration': 'ORD',
}

export const STATUS_COLORS: Record<MemoStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  signed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export const ALL_RECIPIENTS = [
  'ORD', 'ROD', 'FASD', 'Administration',
  'All Departments', 'All Regional Centers',
  'Others'
]

export const ALL_SIGNATORIES = [
  'Gamaliel B. Vicente, Jr. CESO III, ASEAN ENG.',
  'Jocelyn V. Cabahug',
  'Ivy Michelle T. Vasquez',
  'Others',
]

export const ALL_FOCAL = [
  'ORD Staff',
  'ROD Staff',
  'FASD Staff',
  'Admin Staff',
  'Others'
]
