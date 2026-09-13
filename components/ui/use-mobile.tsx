import * as React from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY)
  const handleChange = () => callback()

  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
