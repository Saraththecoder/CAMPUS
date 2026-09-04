'use client'

import { useState, useEffect } from 'react'

interface Props {
  text: string
  speed?: number
  pause?: number
}

export default function TypewriterText({ text, speed = 75, pause = 2500 }: Props) {
  const [displayedCount, setDisplayedCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!isDeleting && displayedCount < text.length) {
      // Typing forward
      timer = setTimeout(() => {
        setDisplayedCount(prev => prev + 1)
      }, speed)
    } else if (!isDeleting && displayedCount === text.length) {
      // Finished typing, pause before erasing
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, pause)
    } else if (isDeleting && displayedCount > 0) {
      // Erasing backward
      timer = setTimeout(() => {
        setDisplayedCount(prev => prev - 1)
      }, speed / 1.8)
    } else if (isDeleting && displayedCount === 0) {
      // Finished erasing, start typing again
      setIsDeleting(false)
    }

    return () => clearTimeout(timer)
  }, [displayedCount, isDeleting, text, speed, pause])

  return (
    <span style={{ display: 'inline-block' }}>
      {text.slice(0, displayedCount).split('').map((char, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            whiteSpace: char === ' ' ? 'pre' : undefined,
            animation: 'fadeInUp 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          {char}
        </span>
      ))}
      <span
        style={{
          display: 'inline-block',
          width: 3,
          height: '1em',
          background: 'var(--green-bright)',
          marginLeft: 3,
          verticalAlign: 'middle',
          animation: 'blinkCursor 0.8s infinite',
        }}
      />
    </span>
  )
}
