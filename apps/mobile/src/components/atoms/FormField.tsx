import React, { useState, useRef, useCallback, type ReactNode } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { LLEVA_COLORS } from '@lleva/shared-constants'

interface FormFieldProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
  isRequired?: boolean
  isPassword?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  containerStyle?: StyleProp<ViewStyle>
}

const BORDER_COLORS = {
  default: LLEVA_COLORS.surface.border,
  focus: LLEVA_COLORS.brand.blue,
  error: LLEVA_COLORS.semantic.error,
} as const

const BACKGROUND_COLORS = {
  default: LLEVA_COLORS.surface.background,
  focus: LLEVA_COLORS.surface.background,
  error: LLEVA_COLORS.semantic.errorLight,
} as const

export function FormField({
  label,
  error,
  hint,
  isRequired = false,
  isPassword = false,
  leftIcon,
  rightIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...inputProps
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const borderColorAnim = useRef(new Animated.Value(0)).current

  const hasError = Boolean(error)
  const currentState = hasError ? 'error' : isFocused ? 'focus' : 'default'

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true)
      if (!hasError) {
        Animated.timing(borderColorAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start()
      }
      onFocus?.(e)
    },
    [hasError, borderColorAnim, onFocus]
  )

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false)
      if (!hasError) {
        Animated.timing(borderColorAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start()
      }
      onBlur?.(e)
    },
    [hasError, borderColorAnim, onBlur]
  )

  const animatedBorderColor = hasError
    ? BORDER_COLORS.error
    : borderColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BORDER_COLORS.default, BORDER_COLORS.focus],
      })

  const containerBackground = BACKGROUND_COLORS[currentState]

  return (
    <View style={[{ marginBottom: 16, width: '100%' }, containerStyle]}>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isFocused && !hasError
              ? LLEVA_COLORS.brand.blue
              : LLEVA_COLORS.text.secondary,
          }}
        >
          {label}
        </Text>
        {isRequired && (
          <Text style={{ marginLeft: 3, fontSize: 14, color: LLEVA_COLORS.semantic.error }}>
            *
          </Text>
        )}
      </View>

      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: animatedBorderColor,
          borderRadius: 12,
          backgroundColor: containerBackground,
          paddingHorizontal: 14,
          minHeight: 52,
        }}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}

        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: LLEVA_COLORS.text.primary,
            paddingVertical: 14,
            fontFamily: 'Inter',
          }}
          placeholderTextColor={LLEVA_COLORS.text.placeholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityInvalid={hasError}
          accessibilityRequired={isRequired}
          {...inputProps}
        />

        {isPassword && !rightIcon ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{ padding: 4 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: LLEVA_COLORS.brand.blue }}>
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : rightIcon ? (
          <View style={{ marginLeft: 10 }}>{rightIcon}</View>
        ) : null}
      </Animated.View>

      {hasError ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 9999,
              backgroundColor: LLEVA_COLORS.semantic.error,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: LLEVA_COLORS.semantic.error, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={{ marginTop: 6, fontSize: 12, color: LLEVA_COLORS.text.tertiary }}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}