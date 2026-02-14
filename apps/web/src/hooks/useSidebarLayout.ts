import { useCallback, useEffect, useState } from 'react'

const MIN_SIDEBAR_WIDTH = 260
const MAX_SIDEBAR_WIDTH = 560
const MOBILE_BREAKPOINT = 768

interface UseSidebarLayoutOptions {
  defaultSidebarWidth?: number
}

export function useSidebarLayout({ defaultSidebarWidth = 320 }: UseSidebarLayoutOptions = {}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth)
  const [isResizing, setIsResizing] = useState(false)

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((previous) => !previous)
  }, [])

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || !isSidebarOpen) return

      const nextWidth = event.clientX
      if (nextWidth < MIN_SIDEBAR_WIDTH || nextWidth > MAX_SIDEBAR_WIDTH) return
      setSidebarWidth(nextWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isResizing, isSidebarOpen])

  return {
    isSidebarOpen,
    isMobile,
    sidebarWidth,
    isResizing,
    openSidebar,
    toggleSidebar,
    startResizing,
  }
}
