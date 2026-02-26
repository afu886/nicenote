import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native'

import { borderRadius, colors, fontSize, spacing } from '../theme/tokens'

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: string
  style?: StyleProp<ViewStyle>
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && pressedVariantStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'destructive' ? '#ffffff' : colors.light.primary
          }
        />
      ) : (
        <Text style={[styles.label, sizeLabelStyles[size], variantLabelStyles[variant]]}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  disabled: { opacity: 0.4 },
  label: { fontWeight: '600' },
})

const sizeStyles = StyleSheet.create({
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs - 2 },
  md: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
})

const sizeLabelStyles = StyleSheet.create({
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.base },
  lg: { fontSize: fontSize.lg },
})

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.light.primary },
  secondary: {
    backgroundColor: colors.light.muted,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.light.destructive },
})

const pressedVariantStyles = StyleSheet.create({
  primary: { backgroundColor: '#333333' },
  secondary: { backgroundColor: colors.light.border },
  ghost: { backgroundColor: colors.light.muted },
  destructive: { backgroundColor: '#dc2626' },
})

const variantLabelStyles = StyleSheet.create({
  primary: { color: colors.light.primaryForeground },
  secondary: { color: colors.light.foreground },
  ghost: { color: colors.light.foreground },
  destructive: { color: '#ffffff' },
})
