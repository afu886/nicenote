import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'

import { initDatabase } from '@nicenote/database'

import { MainScreen } from './src/screens/MainScreen'

/**
 * App root — initialises the SQLite database (synchronous JSI call) then renders.
 * This component intentionally has no providers or navigation wrappers:
 * the desktop layout is a fixed 3-panel shell, not a navigable stack.
 */
export default function App(): React.JSX.Element | null {
  const [ready, setReady] = React.useState(false)

  useEffect(() => {
    // initDatabase() is synchronous (JSI); wrapping in useEffect ensures
    // it runs after the JS thread is fully warmed up.
    initDatabase()
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <>
      <StatusBar hidden />
      <MainScreen />
    </>
  )
}
