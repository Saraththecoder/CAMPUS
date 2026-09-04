'use client'

import { useState, useEffect } from 'react'

const PHRASES = [
  'Without Compromise',
  'Zero Identity Linkage',
  'Cryptographically Private',
  'Built for Campus Trust',
]

export default function HeroTextAnimation() {
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex(prev => (prev + 1) % PHRASES.length)
        setFade(true)
      }, 300)
    }, 3200)

    return () => clearInterval(interval)
  }, [])

  return (
    <span
      className="hero-title-green"
      style={{
        display: 'inline-block',
        transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(8px)',
        color: 'var(--green-bright)',
      }}
    >
      {PHRASES[index]}
    </span>
  )
}
