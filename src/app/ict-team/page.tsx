'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Cpu, Globe, Network, Terminal } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const TEAM = [
  {
    name: 'Jan Kane T. Reroma',
    role: 'ICT Support Staff',
    description: 'NTTC Support & Software Developer',
    photo: '/kane.jpg',
    href: 'https://kanereromaitportfolio.vercel.app/',
    tag: 'DEV',
    icon: Terminal,
    accent: 'from-violet-500 to-indigo-500',
    accentLight: 'from-violet-400/20 to-indigo-400/20',
    delay: 0,
  },
  {
    name: 'Gerard Randolf G. Tecson',
    role: 'Information Technology Officer I',
    description: 'IT Infrastructure & Project Management',
    photo: '/gerard.jpg',
    href: null,
    tag: 'ITO',
    icon: Cpu,
    accent: 'from-blue-500 to-cyan-500',
    accentLight: 'from-blue-400/20 to-cyan-400/20',
    delay: 0.1,
  },
  {
    name: 'Aljohn T. Rosales',
    role: 'ICT Support Staff',
    description: 'Network Administrator & User Assistance',
    photo: '/aljohn.jpg',
    href: null,
    tag: 'NET',
    icon: Network,
    accent: 'from-sky-500 to-teal-500',
    accentLight: 'from-sky-400/20 to-teal-400/20',
    delay: 0.2,
  },
]

/* ─── Dot-matrix grid background ─── */
function GridBg() {
  return (
    <>
      {/* light mode dots */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* dark mode dots */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    </>
  )
}

export default function IctTeamPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading) return null

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#080f1a] overflow-hidden flex flex-col transition-colors duration-300">

      <GridBg />

      {/* Ambient blobs — dark only */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] hidden dark:block" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] hidden dark:block" />

      {/* ─── Top bar ─── */}
      <header className="relative z-10 flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">ICT Unit</span>
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">· TESDA Region VII</span>
        </div>
        {/* live indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-500 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          ONLINE
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center px-6 py-14 sm:py-20 flex-1">

        {/* ─── Hero ─── */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-mono font-bold uppercase tracking-widest">
            <Cpu className="h-3.5 w-3.5" />
            Information &amp; Communications Technology
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
            The{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 dark:from-blue-400 dark:via-sky-300 dark:to-cyan-300 bg-clip-text text-transparent">
                ICT Team
              </span>
              {/* underline decoration */}
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 opacity-60"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left' }}
              />
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Keeping TESDA Region VII's digital infrastructure operational and secure.
          </p>
        </motion.div>

        {/* ─── Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-4xl w-full">
          {TEAM.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </div>

      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 py-5 text-center">
        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-600 tracking-widest uppercase">
          ICT Unit · TESDA Region VII · © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}

/* ─────────────────────── MemberCard ─────────────────────── */
function MemberCard({ member }: { member: typeof TEAM[number] }) {
  const Icon = member.icon

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: member.delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 350, damping: 22 } }}
      className="group relative flex flex-col rounded-2xl overflow-hidden
        bg-white dark:bg-white/[0.04]
        border border-slate-200/80 dark:border-white/[0.08]
        shadow-sm hover:shadow-lg dark:hover:shadow-blue-900/20
        transition-shadow duration-300 cursor-pointer"
    >

      {/* Gradient top accent bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${member.accent} opacity-70 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Hover glow overlay — dark only */}
      <div className={`absolute inset-0 bg-gradient-to-br ${member.accentLight} opacity-0 group-hover:opacity-100 dark:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none hidden dark:block`} />

      {/* Corner bracket decorations */}
      <span className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-200 dark:border-white/10 group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition-colors duration-300 rounded-tr-sm" />
      <span className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-200 dark:border-white/10 group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition-colors duration-300 rounded-bl-sm" />

      <div className="flex flex-col items-center px-6 pt-8 pb-7 gap-5">

        {/* Avatar + role tag */}
        <div className="relative">
          {/* outer glow ring */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.accent} opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300`} />
          <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-white/10 group-hover:ring-blue-300 dark:group-hover:ring-blue-500/50 transition-all duration-300">
            <Image src={member.photo} alt={member.name} fill className="object-cover" />
          </div>
          {/* tag badge */}
          <div className={`absolute -bottom-2 -right-2 flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br ${member.accent} shadow-md`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5 w-full">
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {member.name}
            </h3>
            {member.href && <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gradient-to-r ${member.accentLight} dark:bg-transparent border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400`}>
              {member.tag}
            </span>
          </div>

          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {member.role}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            {member.description}
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-slate-100 dark:bg-white/5" />

        {/* Status row */}
        <div className="flex items-center justify-between w-full text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Active
          </div>
          {member.href ? (
            <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-semibold hover:underline">
              Portfolio <ExternalLink className="h-2.5 w-2.5" />
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 font-mono">TESDA R7</span>
          )}
        </div>

      </div>
    </motion.div>
  )

  if (member.href) {
    return (
      <a href={member.href} target="_blank" rel="noopener noreferrer" className="block">
        {card}
      </a>
    )
  }
  return card
}
