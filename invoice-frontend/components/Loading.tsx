'use client'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function Loading() {
  const containerRef = useRef<HTMLDivElement>(null)
  const invoiceRef = useRef<SVGSVGElement>(null)
  const linesRef = useRef<(SVGRectElement | null)[]>([])
  const checkRef = useRef<SVGPathElement>(null)
  const coinsRef = useRef<(SVGCircleElement | null)[]>([])
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    setIsLight(theme === 'light')
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 })

      gsap.set(linesRef.current, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set(checkRef.current, { scale: 0, transformOrigin: 'center center', opacity: 0 })
      gsap.set(coinsRef.current, { y: -20, opacity: 0 })

      tl.to(invoiceRef.current, {
        y: -8,
        duration: 0.4,
        ease: 'power2.out'
      })
      .to(linesRef.current, {
        scaleX: 1,
        duration: 0.3,
        stagger: 0.1,
        ease: 'power2.out'
      }, '-=0.2')
      .to(checkRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'back.out(1.7)'
      })
      .to(coinsRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.08,
        ease: 'bounce.out'
      }, '-=0.1')
      .to(coinsRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power2.in'
      }, '+=0.3')
      .to(checkRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      }, '-=0.2')
      .to(linesRef.current, {
        scaleX: 0,
        duration: 0.2,
        stagger: 0.05,
        ease: 'power2.in'
      }, '-=0.1')
      .to(invoiceRef.current, {
        y: 0,
        duration: 0.3,
        ease: 'power2.inOut'
      }, '-=0.1')
      .to({}, { duration: 0.3 })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 flex items-center justify-center z-50 ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg
            ref={invoiceRef}
            width="80"
            height="100"
            viewBox="0 0 80 100"
            fill="none"
            className="drop-shadow-2xl"
          >
            <rect
              x="4"
              y="4"
              width="72"
              height="92"
              rx="8"
              fill={isLight ? "url(#invoiceGradientLight)" : "url(#invoiceGradient)"}
              stroke="url(#borderGradient)"
              strokeWidth="2"
            />
            
            <rect
              x="16"
              y="20"
              width="32"
              height="6"
              rx="3"
              fill={isLight ? "#cbd5e1" : "#1e293b"}
              opacity="0.5"
            />
            
            <rect
              ref={(el) => { linesRef.current[0] = el }}
              x="16"
              y="36"
              width="48"
              height="4"
              rx="2"
              fill="#3b82f6"
            />
            <rect
              ref={(el) => { linesRef.current[1] = el }}
              x="16"
              y="48"
              width="40"
              height="4"
              rx="2"
              fill="#3b82f6"
              opacity="0.7"
            />
            <rect
              ref={(el) => { linesRef.current[2] = el }}
              x="16"
              y="60"
              width="44"
              height="4"
              rx="2"
              fill="#3b82f6"
              opacity="0.5"
            />
            
            <rect
              x="16"
              y="76"
              width="24"
              height="6"
              rx="3"
              fill="#22d3ee"
              opacity="0.8"
            />
            <rect
              x="44"
              y="76"
              width="20"
              height="6"
              rx="3"
              fill="#22d3ee"
            />

            <defs>
              <linearGradient id="invoiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="invoiceGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>
              <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>

          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            className="absolute -right-2 -top-2"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="#22c55e"
              opacity="0.2"
            />
            <path
              ref={checkRef}
              d="M10 16l4 4 8-8"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          <svg
            width="60"
            height="40"
            viewBox="0 0 60 40"
            className="absolute -right-6 bottom-4"
          >
            <circle
              ref={(el) => { coinsRef.current[0] = el }}
              cx="15"
              cy="20"
              r="10"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <circle
              ref={(el) => { coinsRef.current[1] = el }}
              cx="30"
              cy="20"
              r="10"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <circle
              ref={(el) => { coinsRef.current[2] = el }}
              cx="45"
              cy="20"
              r="10"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className={`font-medium text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>Loading</p>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  )
}