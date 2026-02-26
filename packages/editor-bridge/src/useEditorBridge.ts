import { useCallback, useRef, useState } from 'react'
import type { WebView } from 'react-native-webview'

import type { BridgeMessage, EditorBridgeState, EditorCommand, EditorEvent } from './types'

export interface UseEditorBridgeOptions {
  initialContent?: string
  onContentChange?: (content: string) => void
  onReady?: () => void
  onFocusChange?: (focused: boolean) => void
}

export interface EditorBridgeHandle {
  state: EditorBridgeState
  webViewRef: React.RefObject<WebView | null>
  /** Pass this to WebView's onMessage prop */
  onMessage: (raw: string) => void
}

export function useEditorBridge(opts: UseEditorBridgeOptions = {}): EditorBridgeHandle {
  const webViewRef = useRef<WebView | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [content, setContent] = useState(opts.initialContent ?? '')

  const send = useCallback((cmd: EditorCommand) => {
    if (!webViewRef.current) return
    const msg: BridgeMessage<EditorCommand> = { source: 'nicenote-editor', data: cmd }
    // injectJavaScript is reliable across platforms and avoids origin restrictions
    webViewRef.current.injectJavaScript(
      `(function(){` +
        `var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(msg))}});` +
        `window.dispatchEvent(e);document.dispatchEvent(e);` +
        `})(); true;`
    )
  }, [])

  const onMessage = useCallback(
    (raw: string) => {
      let msg: BridgeMessage<EditorEvent>
      try {
        msg = JSON.parse(raw)
      } catch {
        return
      }
      if (msg.source !== 'nicenote-editor') return

      const ev = msg.data
      switch (ev.type) {
        case 'READY':
          setIsReady(true)
          if (opts.initialContent) send({ type: 'SET_CONTENT', payload: opts.initialContent })
          opts.onReady?.()
          break
        case 'CONTENT_CHANGED':
          setContent(ev.payload)
          opts.onContentChange?.(ev.payload)
          break
        case 'FOCUS_CHANGED':
          setIsFocused(ev.payload)
          opts.onFocusChange?.(ev.payload)
          break
        case 'HEIGHT_CHANGED':
          break
      }
    },
    [opts.initialContent, opts.onContentChange, opts.onReady, opts.onFocusChange, send]
  )

  const state: EditorBridgeState = {
    isReady,
    isFocused,
    content,
    setContent: useCallback((c: string) => send({ type: 'SET_CONTENT', payload: c }), [send]),
    focus: useCallback(() => send({ type: 'FOCUS' }), [send]),
    blur: useCallback(() => send({ type: 'BLUR' }), [send]),
    setEditable: useCallback((e: boolean) => send({ type: 'SET_EDITABLE', payload: e }), [send]),
    toggleSourceMode: useCallback(() => send({ type: 'TOGGLE_SOURCE_MODE' }), [send]),
  }

  return { state, webViewRef, onMessage }
}
