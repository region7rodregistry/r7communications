// TESDA MBMS - Main Application JavaScript
// Handles authentication, navigation, and core functionality

class TesdaMBMS {
  constructor() {
    this.currentUser = null
    this.memos = []
    this.init()
  }

  init() {
    this.loadUserSession()
    this.initializeEventListeners()
    this.loadMockData()
  }

  // Authentication Methods
  loadUserSession() {
    const userData = localStorage.getItem("tesdaUser")
    if (userData) {
      this.currentUser = JSON.parse(userData)
    }
  }

  login(username, password, department) {
    return new Promise((resolve, reject) => {
      // Simulate API call
      setTimeout(() => {
        if (username && password && department) {
          const userData = {
            username: username,
            department: department,
            role: username === "admin" ? "admin" : "user",
            fullName: username === "admin" ? "Gerard Tecson" : "Kane Reroma",
            loginTime: new Date().toISOString(),
          }

          localStorage.setItem("tesdaUser", JSON.stringify(userData))
          this.currentUser = userData
          resolve(userData)
        } else {
          reject(new Error("Invalid credentials"))
        }
      }, 1000)
    })
  }

  logout() {
    localStorage.removeItem("tesdaUser")
    this.currentUser = null
    window.location.href = "index.html"
  }

  // Memo Management Methods
  generateMemoNumber(department) {
    const year = new Date().getFullYear()
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")
    return `${department}-${year}-${sequence}`
  }

  createMemo(memoData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const newMemo = {
          id: this.generateMemoNumber(this.currentUser.department),
          ...memoData,
          department: this.currentUser.department,
          author: this.currentUser.fullName,
          status: "Active",
          dateCreated: new Date().toLocaleDateString(),
          createdBy: this.currentUser.username,
        }

        this.memos.push(newMemo)
        this.saveMemos()
        resolve(newMemo)
      }, 1500)
    })
  }

  getMemos(filters = {}) {
    let filteredMemos = [...this.memos]

    if (filters.department && filters.department !== "all") {
      filteredMemos = filteredMemos.filter((memo) => memo.department === filters.department)
    }

    if (filters.status && filters.status !== "all") {
      filteredMemos = filteredMemos.filter((memo) => memo.status.toLowerCase() === filters.status.toLowerCase())
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredMemos = filteredMemos.filter(
        (memo) =>
          memo.title.toLowerCase().includes(searchTerm) ||
          memo.id.toLowerCase().includes(searchTerm) ||
          memo.author.toLowerCase().includes(searchTerm),
      )
    }

    return filteredMemos
  }

  updateMemoStatus(memoId, newStatus) {
    const memo = this.memos.find((m) => m.id === memoId)
    if (memo) {
      memo.status = newStatus
      memo.lastUpdated = new Date().toISOString()
      this.saveMemos()
      return memo
    }
    return null
  }

  // Data Persistence
  saveMemos() {
    localStorage.setItem("tesdaMemos", JSON.stringify(this.memos))
  }

  loadMemos() {
    const savedMemos = localStorage.getItem("tesdaMemos")
    if (savedMemos) {
      this.memos = JSON.parse(savedMemos)
    }
  }

  loadMockData() {
    this.loadMemos()

    // If no memos exist, load sample data
    if (this.memos.length === 0) {
      this.memos = [
        {
          id: "ROD-2024-001",
          title: "Training Program Implementation",
          department: "ROD",
          author: "Juan Dela Cruz",
          status: "Active",
          priority: "High",
          dateCreated: "2024-01-15",
          description: "Implementation of new training programs for Q1 2024",
          category: "training",
          recipients: "All Regional Centers",
        },
        {
          id: "FASD-2024-001",
          title: "Budget Allocation Review",
          department: "FASD",
          author: "Ana Rodriguez",
          status: "Pending",
          priority: "Medium",
          dateCreated: "2024-01-18",
          description: "Annual budget allocation review and recommendations",
          category: "budget",
          recipients: "All Department Heads",
        },
        {
          id: "ORD-2024-001",
          title: "Research Project Proposal",
          department: "ORD",
          author: "Carlos Mendoza",
          status: "Completed",
          priority: "Low",
          dateCreated: "2024-01-12",
          description: "New research project proposal for skills development",
          category: "operational",
          recipients: "Research Committee",
        },
      ]
      this.saveMemos()
    }
  }

  // Statistics Methods
  getStatistics() {
    const stats = {
      total: this.memos.length,
      active: this.memos.filter((m) => m.status === "Active").length,
      pending: this.memos.filter((m) => m.status === "Pending").length,
      completed: this.memos.filter((m) => m.status === "Completed").length,
      byDepartment: {},
    }

    // Calculate department statistics
    ;["ROD", "FASD", "ORD"].forEach((dept) => {
      const deptMemos = this.memos.filter((m) => m.department === dept)
      stats.byDepartment[dept] = {
        total: deptMemos.length,
        active: deptMemos.filter((m) => m.status === "Active").length,
        pending: deptMemos.filter((m) => m.status === "Pending").length,
        completed: deptMemos.filter((m) => m.status === "Completed").length,
      }
    })

    return stats
  }

  // Utility Methods
  formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  validateMemoData(data) {
    const required = ["title", "description", "content", "category", "priority"]
    const missing = required.filter((field) => !data[field])

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`)
    }

    return true
  }

  // Event Listeners
  initializeEventListeners() {
    // Global event listeners that work across all pages
    document.addEventListener("DOMContentLoaded", () => {
      // Initialize Lucide icons
      const lucide = window.lucide // Declare the lucide variable
      if (typeof lucide !== "undefined") {
        lucide.createIcons()
      }

      // Check for authentication on protected pages
      const protectedPages = ["user-dashboard.html", "admin-dashboard.html", "create-memo.html"]
      const currentPage = window.location.pathname.split("/").pop()

      if (protectedPages.includes(currentPage) && !this.currentUser) {
        window.location.href = "index.html"
      }
    })

    // Handle browser back/forward navigation
    window.addEventListener("popstate", () => {
      this.loadUserSession()
    })
  }

  // Export/Import Methods
  exportMemos(format = "json") {
    const data = this.getMemos()

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      this.downloadFile(blob, "tesda-memos.json")
    } else if (format === "csv") {
      const csv = this.convertToCSV(data)
      const blob = new Blob([csv], { type: "text/csv" })
      this.downloadFile(blob, "tesda-memos.csv")
    }
  }

  convertToCSV(data) {
    if (data.length === 0) return ""

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
    ].join("\n")

    return csvContent
  }

  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Search and Filter Methods
  searchMemos(query) {
    return this.memos.filter((memo) => {
      const searchFields = [memo.title, memo.description, memo.content, memo.id, memo.author]
      return searchFields.some((field) => field && field.toLowerCase().includes(query.toLowerCase()))
    })
  }

  filterMemosByDateRange(startDate, endDate) {
    return this.memos.filter((memo) => {
      const memoDate = new Date(memo.dateCreated)
      return memoDate >= new Date(startDate) && memoDate <= new Date(endDate)
    })
  }

  // Notification Methods
  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${this.getNotificationClasses(type)}`
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 5000)
  }

  getNotificationClasses(type) {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border border-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      default:
        return "bg-blue-100 text-blue-800 border border-blue-200"
    }
  }
}

// Initialize the application
const tesdaApp = new TesdaMBMS()

// Make it globally available
window.TesdaMBMS = tesdaApp
