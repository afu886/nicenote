import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface TitleBarProps {
  title?: string
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
}

/**
 * Custom frameless title bar.
 *
 * macOS:  set titleBarStyle = 'hidden' in the native project; this view takes its place.
 *         The draggable region is declared via the 'app-region: drag' CSS-equivalent
 *         by setting accessibilityLabel='drag-region' (intercepted in native).
 *
 * Windows: TitleBar API is set to transparent in the XAML project config;
 *           this view renders in the client area.
 */
export function TitleBar({ title = 'NiceNote' }: TitleBarProps): React.JSX.Element {
  return (
    <View style={styles.bar} accessibilityLabel="drag-region">
      {/* macOS traffic-light placeholder area (the native buttons sit here) */}
      <View style={styles.trafficLightSpacer} />

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right-side spacer keeps the title centred */}
      <View style={styles.trafficLightSpacer} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  trafficLightSpacer: {
    width: 72, // room for the three macOS window buttons
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: '#0a0a0a',
  },
})
