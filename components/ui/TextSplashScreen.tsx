'use client'
// components/ui/TextSplashScreen.tsx
// Aegis-7 Cyberpunk Text Splash Screen: "Raise Your Voice" -> "Without Fear."

import { useEffect, useState } from 'react'

export default function TextSplashScreen() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [step, setStep] = useState(1) // Step 1: "Raise Your Voice", Step 2: "Without Fear."

  useEffect(() => {
    setMounted(true)
    const shown = sessionStorage.getItem('aegis_splash_shown_v2')
    if (shown) {
      return
    }

    setVisible(true)

    // Step 1 -> Step 2 transition after 2.2 seconds
    const stepTimer = setTimeout(() => {
      setStep(2)
    }, 2200)

    // Start fading out after 4.4 seconds
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, 4400)

    // Unmount and save flag after 4.8 seconds
    const removeTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('aegis_splash_shown_v2', 'true')
    }, 4800)

    return () => {
      clearTimeout(stepTimer)
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  const handleDismiss = () => {
    setFading(true)
    setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('aegis_splash_shown_v2', 'true')
    }, 300)
  }

  if (!mounted || !visible) return null

  return (
    <div
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDismiss() }}
      aria-label="Click to skip splash screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#08090a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.03)' : 'scale(1)',
        transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fading ? 'none' : 'all',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Radial Lights */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '400px',
          borderRadius: '50%',
          background: step === 1
            ? 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(0, 214, 143, 0.22) 0%, rgba(124, 58, 237, 0.12) 50%, transparent 75%)',
          filter: 'blur(70px)',
          transition: 'background 600ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Main Text Stage */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, padding: '0 1rem', width: '100%' }}>
        {step === 1 ? (
          <h1
            key="phase-1"
            className="animate-fade-up"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 9vw, 4.75rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            Raise Your Voice
          </h1>
        ) : (
          <h1
            key="phase-2"
            className="animate-scale-in glitch-text"
            data-text="Without Fear."
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 9vw, 4.75rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #00d68f 0%, #00b87a 40%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0, 214, 143, 0.5))',
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            Without Fear.
          </h1>
        )}

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginTop: '1.5rem',
          opacity: 0.7,
        }}>
          Tap anywhere to skip
        </p>
      </div>
    </div>
  )
}

