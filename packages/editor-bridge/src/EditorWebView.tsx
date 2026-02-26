import React from 'react'
import { StyleSheet } from 'react-native'
import WebView from 'react-native-webview'

import type { EditorWebViewProps } from './types'
import { useEditorBridge } from './useEditorBridge'

// The editor HTML bundle is built by running:
//   pnpm --filter @nicenote/editor-bridge build:template
//
// The output lands at src/assets/editor.html and is inlined here as a string
// so the WebView has no network dependency (works offline, no file:// path issues).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const EDITOR_HTML: string = require('./assets/editor.html')

export const EditorWebView = React.forwardRef<
  ReturnType<typeof useEditorBridge>,
  EditorWebViewProps
>(function EditorWebView(props, ref) {
  const { initialContent, editable = true, onContentChange, onReady, onFocusChange } = props

  const bridge = useEditorBridge({
    initialContent,
    onContentChange,
    onReady,
    onFocusChange,
  })

  // Expose bridge handle via ref so parent screens can call focus() etc.
  React.useImperativeHandle(ref, () => bridge)

  return (
    <WebView
      ref={bridge.webViewRef}
      style={styles.webview}
      source={{ html: EDITOR_HTML, baseUrl: '' }}
      originWhitelist={['*']}
      scrollEnabled={false}
      keyboardDisplayRequiresUserAction={false}
      allowsInlineMediaPlayback
      // Desktop platforms: disable scaling
      scalesPageToFit={false}
      // Allow local file access for any linked assets
      allowFileAccess
      // Receive postMessage events from the editor JS
      onMessage={(event) => bridge.onMessage(event.nativeEvent.data)}
      // Keep the editor in a consistent editable state
      injectedJavaScriptBeforeContentLoaded={
        editable
          ? undefined
          : `document.addEventListener('DOMContentLoaded', () => {
               window._editable = false;
             }); true;`
      }
    />
  )
})

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
})
