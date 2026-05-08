import React, { useCallback, useRef } from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { LLEVA_COLORS } from '@lleva/shared-constants'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'full'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  style?: StyleProp<ViewStyle>
  hapticStyle?: Haptics.ImpactFeedbackStyle | null
}

const VARIANT_CONTAINER: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: LLEVA_COLORS.brand.blue,
  },
  secondary: {
    backgroundColor: LLEVA_COLORS.semantic.success,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: LLEVA_COLORS.brand.blue,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: LLEVA_COLORS.semantic.error,
  },
}

const VARIANT_TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: LLEVA_COLORS.neutral[0],
  secondary: LLEVA_COLORS.neutral[0],
  outline: LLEVA_COLORS.brand.blue,
  ghost: LLEVA_COLORS.brand.blue,
  danger: LLEVA_COLORS.neutral[0],
}

const VARIANT_PRESSED_BG: Record<ButtonVariant, string> = {
  primary: LLEVA_COLORS.primary[600],
  secondary: LLEVA_COLORS.semantic.successDark,
  outline: LLEVA_COLORS.primary[50],
  ghost: LLEVA_COLORS.primary[50],
  danger: LLEVA_COLORS.semantic.errorDark,
}

const VARIANT_SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: LLEVA_COLORS.neutral[0],
  secondary: LLEVA_COLORS.neutral[0],
  outline: LLEVA_COLORS.brand.blue,
  ghost: LLEVA_COLORS.brand.blue,
  danger: LLEVA_COLORS.neutral[0],
}

const SIZE_CONTAINER: Record<ButtonSize, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: 12, borderRadius: 8 },
  md: { height: 48, paddingHorizontal: 16, borderRadius: 12 },
  lg: { height: 56, paddingHorizontal: 24, borderRadius: 14 },
  full: { height: 56, paddingHorizontal: 16, borderRadius: 14, width: '100%' },
}

const SIZE_FONT: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  full: 16,
}

const SIZE_ICON_GAP: Record<ButtonSize, number> = {
  sm: 6,
  md: 8,
  lg: 10,
  full: 8,
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  const scaleAnim = useRef(new Animated.Value(1)).current

  const animatePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start()
  }, [scaleAnim])

  const animatePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }, [scaleAnim])

  const handlePress = useCallback(
    async (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (isDisabled) return

      if (hapticStyle !== null) {
        try {
          await Haptics.impactAsync(hapticStyle)
        } catch {
          // Haptics may fail on simulator
        }
      }

      onPress?.(event)
    },
    [isDisabled, hapticStyle, onPress]
  )

  const containerVariantStyle = VARIANT_CONTAINER[variant]
  const sizeStyle = SIZE_CONTAINER[size]
  const textColor = VARIANT_TEXT_COLOR[variant]
  const fontSize = SIZE_FONT[size]
  const iconGap = SIZE_ICON_GAP[size]
  const spinnerColor = VARIANT_SPINNER_COLOR[variant]

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        variant === 'primary' && !isDisabled
          ? {
              shadowColor: LLEVA_COLORS.brand.blue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }
          : undefined,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          containerVariantStyle,
          sizeStyle,
          pressed && !isDisabled && {
            backgroundColor: VARIANT_PRESSED_BG[variant],
          },
          isDisabled && {
            opacity: 0.45,
          },
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          <>
            {leftIcon && (
              <Animated.View style={{ marginRight: iconGap }}>
                {leftIcon}
              </Animated.View>
            )}
            <Text
              style={{
                color: textColor,
                fontSize,
                fontWeight: '600',
                letterSpacing: 0.2,
                fontFamily: 'Inter',
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            {rightIcon && (
              <Animated.View style={{ marginLeft: iconGap }}>
                {rightIcon}
              </Animated.View>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}