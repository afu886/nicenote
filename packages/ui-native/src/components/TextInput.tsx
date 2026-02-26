import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  View,
} from 'react-native'

import { borderRadius, colors, fontSize, spacing } from '../theme/tokens'

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string
  error?: string
}

export function TextInput({ label, error, ...rest }: TextInputProps): React.JSX.Element {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <RNTextInput
        {...rest}
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError]}
        placeholderTextColor={colors.light.mutedForeground}
        onFocus={(e) => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          rest.onBlur?.(e)
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs / 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.light.foreground,
  },
  input: {
    fontSize: fontSize.base,
    color: colors.light.foreground,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputFocused: {
    borderColor: colors.light.primary,
  },
  inputError: {
    borderColor: colors.light.destructive,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.light.destructive,
  },
})
