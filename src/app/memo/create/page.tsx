'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CreateMemoForm } from '@/components/memo/CreateMemoForm'
import { useAuth } from '@/contexts/AuthContext'

export default function CreateMemoPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (userData?.role === 'admin') router.replace('/admin')
  }, [loading, user, userData, router])

  if (loading || !userData || userData.role === 'admin') return null

  return (
    <DashboardLayout title="Create Memo">
      <CreateMemoForm />
    </DashboardLayout>
  )
}
