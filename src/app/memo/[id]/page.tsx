'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ViewMemoDetail } from '@/components/memo/ViewMemoDetail'
import { useAuth } from '@/contexts/AuthContext'

function PrintTrigger() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams?.get('print') === '1') {
      // Allow the page to fully render before triggering print
      const timer = setTimeout(() => window.print(), 900)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  return null
}

export default function ViewMemoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (!id) return null

  return (
    <DashboardLayout title="View Memo">
      {/* Suspense required because useSearchParams needs it in App Router */}
      <Suspense fallback={null}>
        <PrintTrigger />
      </Suspense>
      <ViewMemoDetail memoId={id} />
    </DashboardLayout>
  )
}
