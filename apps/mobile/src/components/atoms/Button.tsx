import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'full'

interface ButtonProps extends TouchableOpacityProps {
  label:      string
  variant?:   ButtonVariant
  size?:      ButtonSize
  isLoading?: boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-blue-600',
  secondary: 'bg-green-600',
  outline:   'border-2 border-blue-600 bg-transparent',
  ghost:     'bg-transparent',
  danger:    'bg-red-600',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm:   'h-9 px-3',
  md:   'h-12 px-4',
  lg:   'h-14 px-6',
  full: 'h-14 px-4 w-full',
}

const textVariantStyles: Record<ButtonVariant, string> = {
  primary:   'text-white',
  secondary: 'text-white',
  outline:  'text-blue-600',
  ghost:     'text-blue-600',
  danger:    'text-white',
}

const textSizeStyles: Record<ButtonSize, string> = {
  sm:   'text-sm',
  md:   'text-base',
  lg:   'text-lg',
  full: 'text-base',
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading
  const loadingColor = variant === 'outline' || variant === 'ghost' ? '#2563eb' : '#ffffff'

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-xl ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50' : 'active:opacity-80'}`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={loadingColor} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text className={`font-semibold text-center ${textVariantStyles[variant]} ${textSizeStyles[size]}`}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  )
}