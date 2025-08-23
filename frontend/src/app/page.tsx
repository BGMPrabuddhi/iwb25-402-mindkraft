'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [mapIcons] = useState(() => {
    const count = 16
    const cols = 4
    const rows = Math.ceil(count / cols)
    const jitter = 6 // percent jitter to avoid perfect grid look
    const icons = [] as Array<{
      id: number; type: 'location' | 'warning'; left: number; top: number; delay: string; duration: string; scale: number
    }>
    for (let i = 0; i < count; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const baseLeft = ((col + 0.5) / cols) * 100
      const baseTop = ((row + 0.5) / rows) * 100
      const jL = (Math.random() * jitter * 2 - jitter)
      const jT = (Math.random() * jitter * 2 - jitter)
      const left = Math.min(100, Math.max(0, baseLeft + jL))
      const top = Math.min(100, Math.max(0, baseTop + jT))
      icons.push({
        id: i,
        type: (i % 2 === 0 ? 'location' : 'warning'),
        left,
        top,
        delay: (Math.random() * 6).toFixed(2),
        duration: (4 + Math.random() * 2).toFixed(2),
        scale: 0.95 + Math.random() * 0.6
      })
    }
    return icons
  })

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-gray-900">
      {/* Decorative gradient rings / blobs using brand palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-brand-600/40 via-brand-500/30 to-brand-400/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tr from-brand-500/30 via-brand-400/25 to-brand-300/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-24 left-10 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-brand-400/30 via-brand-500/25 to-brand-600/20 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(10,209,200,0.15),transparent_65%)]" />
      </div>

      {/* Map-themed ambient layer */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle map grid */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay"
             style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)`, backgroundSize: '140px 140px' }} />
        {/* Dynamic icons (location + warning only) */}
        {mapIcons.map(icon => (
          <div
            key={icon.id}
            className="absolute animate-float will-change-transform"
            style={{
              left: `${icon.left}%`,
              top: `${icon.top}%`,
              animationDelay: `${icon.delay}s`,
              animationDuration: `${icon.duration}s`,
              transform: `scale(${icon.scale})`
            }}
          >
            {icon.type === 'location' && (
              <svg className="w-7 h-7 drop-shadow" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                <path className="stroke-green-600" strokeLinecap="round" strokeLinejoin="round" d="M12 21c4-5 6-8 6-11a6 6 0 10-12 0c0 3 2 6 6 11z" />
                <circle cx="12" cy="10" r="3" className="fill-green-400 stroke-green-700" />
              </svg>
            )}
            {icon.type === 'warning' && (
              <svg className="w-7 h-7 drop-shadow" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" className="stroke-yellow-500" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 9v5" className="stroke-yellow-600" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 17h.01" className="stroke-yellow-600" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>

     

      {/* Hero Section */}
      <div className="relative z-10 flex items-center justify-center min-h-[88vh] px-6">
        <div
          className={`max-w-5xl mx-auto text-center transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold uppercase tracking-wider text-brand-200 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-none" /> Real-time Community Safety
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[1.15] overflow-visible">
              <span className="block bg-clip-text text-transparent bg-black/80 animate-gradient bg-[length:200%_200%] pb-1">Navigate Safer</span>
              <span className="block mt-2 bg-clip-text text-transparent bg-black/80 animate-gradient bg-[length:200%_200%] pb-1">With Community Insight</span>
            </h1>
            <p className="text-lg md:text-xl text-black/70 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300">
              Harness the power of collective reporting to avoid hazards, receive timely alerts, and make
              every journey <span className="font-semibold text-green-500">smarter</span> and <span className="font-semibold text-green-500">safer</span>.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-14 animate-fade-in-up animation-delay-600">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2 rounded-full bg-green-500 backdrop-blur-2xl px-10 py-4 text-lg font-semibold text-brand-900 shadow-lg shadow-brand-900/20 hover:shadow-xl transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/50"
            >
              <span>Sign Up</span>
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand-300/0 group-hover:ring-brand-300/40 transition" />
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 rounded-full px-10 py-4 text-lg font-semibold border border-black text-brand-200 hover:text-brand-900 hover:bg-brand-300/90 backdrop-blur bg-white/5 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/40"
            >
              <span>Sign In</span>
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes blob { 0% { transform: translate(0px,0px) scale(1); } 33% { transform: translate(30px,-50px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(.9); } 100% { transform: translate(0px,0px) scale(1); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes fade-in-up { 0% { opacity:0; transform: translateY(32px);} 100% { opacity:1; transform: translateY(0);} }
        .animate-blob { animation: blob 8s ease-in-out infinite; }
        .animate-float { animation: float 3.8s ease-in-out infinite; }
        .animate-gradient { animation: gradient 6s ease infinite; }
        .animate-fade-in-up { animation: fade-in-up .9s ease-out forwards; }
        .animation-delay-300 { animation-delay: .3s; }
        .animation-delay-600 { animation-delay: .6s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
  .icon-pulse { animation: pulse 3s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:.85; transform: translateY(0) scale(1);} 50% { opacity:.4; transform: translateY(-6px) scale(.9);} }
      `}</style>
    </div>
  )
}