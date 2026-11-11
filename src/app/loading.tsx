"use client"

import * as React from "react"

export default function GlobalLoading() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Custom Logo Animation */}
        <div className="relative w-20 h-20">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background document with pulse animation */}
            <rect 
              x="2" 
              y="4" 
              width="20" 
              height="24" 
              rx="4" 
              fill="#4f46e5" 
              className="animate-pulse"
              opacity="0.8"
            />
            
            {/* Foreground document with slide animation */}
            <rect 
              x="10" 
              y="8" 
              width="20" 
              height="20" 
              rx="4" 
              fill="#60a5fa" 
              opacity="0.9" 
              style={{ mixBlendMode: "multiply" }}
            >
              <animate
                attributeName="y"
                values="8;6;8"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.6;0.9"
                dur="2s"
                repeatCount="indefinite"
              />
            </rect>
            
            {/* Circle with rotation animation */}
            <circle 
              cx="20" 
              cy="18" 
              r="4" 
              fill="white"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 20 18;360 20 18"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="4;5;4"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <circle
                key={i}
                cx={16 + Math.cos((i * 60) * Math.PI / 180) * 12}
                cy={16 + Math.sin((i * 60) * Math.PI / 180) * 12}
                r="1.5"
                fill="#4f46e5"
                opacity="0.6"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.6;0"
                  dur="2s"
                  begin={`${i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0;0,-3;0,0"
                  dur="2s"
                  begin={`${i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </svg>
        </div>

        {/* Loading text with typewriter effect */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Loading</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">
            Preparing your academic resources...
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ 
            width: '60%',
            animation: 'shimmer 2s infinite'
          }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}