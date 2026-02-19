import { useEffect, useState } from 'react'

type BreakpointMode = 'min' | 'max'

/**
 * Hook to detect whether the current viewport matches a given breakpoint rule.
 * Example:
 *   useIsBreakpoint("max", 768)   // true when width < 768
 *   useIsBreakpoint("min", 1024)  // true when width >= 1024
 */
function getMediaQuery(mode: BreakpointMode, breakpoint: number) {
  return mode === 'min' ? `(min-width: ${breakpoint}px)` : `(max-width: ${breakpoint - 1}px)`
}

export function useIsBreakpoint(mode: BreakpointMode = 'max', breakpoint = 768) {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(getMediaQuery(mode, breakpoint)).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(getMediaQuery(mode, breakpoint))
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)

    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [mode, breakpoint])

  return matches
}
