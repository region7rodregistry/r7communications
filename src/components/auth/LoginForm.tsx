'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { getUserData } from '@/lib/memo-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ── Overlay rendered via portal so transforms on parent elements can't trap it ──
function LoginTransitionOverlay({ onDone }: { onDone: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Base dark layer */}
      <motion.div
        className="absolute inset-0 bg-[#020b18]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      {/* Expanding ring 1 */}
      <motion.div
        className="absolute rounded-full border border-blue-400/40"
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: '200vmax', height: '200vmax', opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* Expanding ring 2 */}
      <motion.div
        className="absolute rounded-full border border-blue-300/20"
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: '200vmax', height: '200vmax', opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
      />

      {/* Horizontal scan line sweep */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"
        initial={{ top: '-2px', opacity: 0 }}
        animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.0, ease: 'linear', delay: 0.1 }}
      />

      {/* Centre glow burst */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-blue-500/30 blur-3xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2.5, 1.8], opacity: [0, 0.8, 0.3] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Grid lines */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          backgroundImage: `linear-gradient(rgba(96,165,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Logo + check + text */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-blue-400/40 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Image src="/tesda-logo.png" alt="TESDA" width={56} height={56} className="object-contain" />
          </div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </motion.div>
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase">Access Granted</p>
          <p className="text-white/40 text-xs mt-1 tracking-wider">Redirecting…</p>
        </motion.div>
      </motion.div>

      {/* Progress bar — triggers navigation when done */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.1 }}
        onAnimationComplete={() => setTimeout(onDone, 400)}
      />
    </motion.div>,
    document.body
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const redirectTo = useRef<string>('/dashboard')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const userData = await getUserData(credential.user.email!)
      redirectTo.current = userData.role === 'admin' ? '/admin' : '/dashboard'
      setTransitioning(true)
    } catch (err: any) {
      const code = err.code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.')
      } else {
        setError(err.message || 'An error occurred. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <>
      {transitioning && (
        <LoginTransitionOverlay onDone={() => router.push(redirectTo.current)} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="relative bg-white rounded-2xl shadow-2xl border border-blue-100 p-5 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-white/30 shadow-xl shadow-black/20 mb-5 overflow-hidden"
            >
              <Image
                src="/tesda-logo.png"
                alt="TESDA Region VII"
                width={80}
                height={80}
                className="object-contain w-full h-full p-1"
                priority
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">TESDA Region VII</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">Memo-Based Management System</p>
            </motion.div>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 border border-red-200"
              >
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading || transitioning}
              className="w-full h-10 text-sm font-semibold shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </motion.form>

          <p className="mt-6 text-center text-xs text-gray-400">
            TESDA Region VII — Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </>
  )
}
