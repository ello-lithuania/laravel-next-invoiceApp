'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(heroRef.current?.querySelectorAll('.hero-animate') || [], {
        y: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out'
      })

      gsap.from(featuresRef.current?.querySelectorAll('.feature-card') || [], {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      })

      gsap.from(howItWorksRef.current?.querySelectorAll('.step-item') || [], {
        scrollTrigger: {
          trigger: howItWorksRef.current,
          start: 'top 80%',
        },
        x: -60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      })

      gsap.from(statsRef.current?.querySelectorAll('.stat-item') || [], {
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 80%',
        },
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)'
      })

      gsap.from(benefitsRef.current?.querySelectorAll('.benefit-item') || [], {
        scrollTrigger: {
          trigger: benefitsRef.current,
          start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out'
      })

      gsap.from(testimonialsRef.current?.querySelectorAll('.testimonial-card') || [], {
        scrollTrigger: {
          trigger: testimonialsRef.current,
          start: 'top 80%',
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      })

      gsap.from(ctaRef.current?.querySelectorAll('.cta-animate') || [], {
        scrollTrigger: {
          trigger: ctaRef.current,
          start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <>
      <section ref={heroRef} className="pt-32 px-6 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto text-center">
          <div className="hero-animate inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            <span className="text-cyan-400 text-sm font-medium">Now available for freelancers</span>
          </div>
          <h1 className="hero-animate text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Invoicing madee
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> simple</span>
          </h1>
          <p className="hero-animate text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create professional invoices, manage your clients, and get paid faster. Built for freelancers and small businesses.
          </p>
          <div className="hero-animate flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="group relative inline-flex items-center justify-center">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <span className="relative bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-8 py-4 rounded-xl text-lg font-semibold flex items-center gap-2">
                Start for Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a href="#features" className="border border-slate-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      <section ref={statsRef} className="pb-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="stat-item text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">10K+</div>
              <div className="text-slate-400">Active Users</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">50K+</div>
              <div className="text-slate-400">Invoices Created</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">€2M+</div>
              <div className="text-slate-400">Processed</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">99.9%</div>
              <div className="text-slate-400">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      <section ref={howItWorksRef} className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How it works</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Get started in minutes with our simple 4-step process.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="step-item relative">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">1</div>
                <h3 className="text-xl font-semibold text-white mb-3">Create Account</h3>
                <p className="text-slate-400">Sign up for free in less than a minute. No credit card required.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            </div>

            <div className="step-item relative">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">2</div>
                <h3 className="text-xl font-semibold text-white mb-3">Add Your Details</h3>
                <p className="text-slate-400">Enter your business information and customize your profile.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            </div>

            <div className="step-item relative">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">3</div>
                <h3 className="text-xl font-semibold text-white mb-3">Add Clients</h3>
                <p className="text-slate-400">Save your clients' details for quick invoice creation.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            </div>

            <div className="step-item">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">4</div>
                <h3 className="text-xl font-semibold text-white mb-3">Create & Send</h3>
                <p className="text-slate-400">Generate invoices, download as PDF, and send to clients.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={benefitsRef} className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Why choose InvoiceApp?</h2>
              <p className="text-xl text-slate-400 mb-8">We've built the simplest invoicing tool for freelancers and small businesses.</p>
              <div className="space-y-6">
                <div className="benefit-item flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">No learning curve</h4>
                    <p className="text-slate-400">Intuitive interface that anyone can use from day one.</p>
                  </div>
                </div>
                <div className="benefit-item flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Professional templates</h4>
                    <p className="text-slate-400">Beautiful invoice designs that make you look professional.</p>
                  </div>
                </div>
                <div className="benefit-item flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Save time</h4>
                    <p className="text-slate-400">Create invoices in seconds, not hours. Focus on your work.</p>
                  </div>
                </div>
                <div className="benefit-item flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Free forever plan</h4>
                    <p className="text-slate-400">Start for free and upgrade only when you need more.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-40 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg"></div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm">Invoice #INV-0042</div>
                      <div className="text-white font-semibold">€1,250.00</div>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-slate-500 text-sm mb-1">From</div>
                        <div className="text-white">Acme Studio</div>
                        <div className="text-slate-400 text-sm">hello@acmestudio.com</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-sm mb-1">To</div>
                        <div className="text-white">TechCorp Inc.</div>
                        <div className="text-slate-400 text-sm">billing@techcorp.com</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Website Redesign Project</span>
                      <span className="text-white">25h × €50</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-cyan-400">€1,250.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={testimonialsRef} className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Loved by freelancers</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">See what our users have to say about InvoiceApp.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="testimonial-card bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">"Finally, an invoicing app that doesn't overcomplicate things. I can create and send invoices in under a minute!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">MK</div>
                <div>
                  <div className="text-white font-semibold">Marius K.</div>
                  <div className="text-slate-400 text-sm">Web Developer</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">"The PDF export looks so professional. My clients are impressed every time. Worth every penny!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">ES</div>
                <div>
                  <div className="text-white font-semibold">Elena S.</div>
                  <div className="text-slate-400 text-sm">Graphic Designer</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">"I switched from a complicated accounting software. InvoiceApp does exactly what I need, nothing more."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-400 rounded-full flex items-center justify-center text-white font-bold">TP</div>
                <div>
                  <div className="text-white font-semibold">Tomas P.</div>
                  <div className="text-slate-400 text-sm">Consultant</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="cta-animate text-3xl md:text-5xl font-bold text-white mb-6">Ready to get started?</h2>
          <p className="cta-animate text-xl text-slate-400 mb-10">Join thousands of freelancers who trust InvoiceApp for their invoicing needs.</p>
          <div className="cta-animate">
            <Link href="/register" className="group relative inline-flex items-center justify-center">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <span className="relative bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-10 py-5 rounded-xl text-xl font-semibold flex items-center gap-3">
                Create Free Account
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}