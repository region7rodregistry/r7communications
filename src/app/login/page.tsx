'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && userData) {
      router.replace(userData.role === 'admin' ? '/admin' : '/dashboard')
    }
  }, [user, userData, loading, router])

  return (
    <div className="min-h-screen h-screen flex overflow-hidden bg-gradient-to-br from-white via-blue-50 to-blue-200">

      {/* ── Left panel: office photo ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:block relative flex-1"
      >
        <Image
          src="/office.jpg"
          alt="TESDA Region VII Office"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />

        {/* Deep navy-to-indigo wash over the whole image */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-blue-800/20 to-indigo-900/30" />

        {/* Left-edge deep blue column */}
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-950/60 via-blue-900/20 to-transparent" />

        {/* Top vignette: sky → cobalt */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-sky-900/50 via-blue-700/20 to-transparent" />

        {/* Right blend into the form panel */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-transparent via-blue-400/10 to-blue-100/70" />

        {/* Caption overlay at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-blue-950/80 via-blue-900/50 to-transparent flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-xl leading-snug">TESDA Region VII</p>
            <p className="text-blue-200 text-sm mt-1">Technical Education and Skills Development Authority</p>
          </div>
          <Image
            src="/kayangkaya.png"
            alt="Kaya ng Pinoy, Kaya ng Pilipino"
            width={120}
            height={60}
            className="object-contain"
          />
        </div>
      </motion.div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 lg:max-w-lg xl:max-w-xl flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 relative">
        {/* Subtle blue glow behind card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">
          <LoginForm />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-6 text-xs text-blue-400/70"
        >
          © {new Date().getFullYear()} TESDA Region VII · All rights reserved
        </motion.p>
      </div>
    </div>
  )
}
