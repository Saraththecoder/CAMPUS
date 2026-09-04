'use client'
// components/ui/TextSplashScreen.tsx
// Pure Minimalist Text Splash Screen: "Raise Your Voice" -> "Without Fear." (4s total)

import { useEffect, useState } from 'react'

export default function TextSplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [step, setStep] = useState(1) // Step 1: "Raise Your Voice", Step 2: "Without Fear."

  useEffect(() => {
    // Only show once per tab session
    const shown = sessionStorage.getItem('aegis_text_splash_shown')
    if (shown) {
      setVisible(false)
      return
    }

    // Step 1 -> Step 2 transition after 1.8 seconds
    const stepTimer = setTimeout(() => {
      setStep(2)
    }, 1800)

    // Smooth fade out after ~3.8 seconds total
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, 3800)

    // Unmount and save flag after 4.2 seconds
    const removeTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('aegis_text_splash_shown', 'true')
    }, 4200)

    return () => {
      clearTimeout(stepTimer)
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#060807',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fading ? 'none' : 'all',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* Soft Ambient Radial Light */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 300,
          borderRadius: '50%',
          background: step === 1
            ? 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(0, 214, 143, 0.15) 0%, rgba(124, 58, 237, 0.06) 50%, transparent 75%)',
          filter: 'blur(60px)',
          transition: 'background 800ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Main Text Stage */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, padding: '0 1rem', width: '100%' }}>
        {step === 1 ? (
          <h1
            key="phase-1"
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 'clamp(1.75rem, 8.5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              animation: 'textFadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            Raise Your Voice
          </h1>
        ) : (
          <h1
            key="phase-2"
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 'clamp(1.75rem, 8.5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #00d68f 0%, #00b87a 45%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(0, 214, 143, 0.45))',
              animation: 'textFadeIn 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            Without Fear.
          </h1>
        )}
      </div>

      <style jsx>{`
        @keyframes textFadeIn {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  )
}
