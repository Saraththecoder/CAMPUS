'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function GSAPAnimationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero text stagger entrance
      gsap.from('.gsap-hero-title', {
        y: 35,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.15,
      })

      // 2. Stats bar smooth reveal
      gsap.from('.gsap-stat-item', {
        scrollTrigger: {
          trigger: '.gsap-stats-section',
          start: 'top 85%',
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
      })

      // 3. Feature cards butter-smooth stagger
      gsap.from('.gsap-feature-card', {
        scrollTrigger: {
          trigger: '.gsap-features-section',
          start: 'top 80%',
        },
        y: 45,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
      })

      // 4. Protocol steps elastic pop
      gsap.from('.gsap-step-card', {
        scrollTrigger: {
          trigger: '.gsap-protocol-section',
          start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        duration: 0.95,
        stagger: 0.15,
        ease: 'back.out(1.2)',
      })

      // 5. CTA callout smooth scale-in
      gsap.from('.gsap-cta-box', {
        scrollTrigger: {
          trigger: '.gsap-cta-section',
          start: 'top 85%',
        },
        scale: 0.92,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      })
    })

    return () => ctx.revert()
  }, [])

  return <>{children}</>
}
