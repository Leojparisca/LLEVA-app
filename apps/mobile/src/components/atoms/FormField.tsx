import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'

interface FormFieldProps extends React.ComponentProps<typeof TextInput> {
  label:       string
  error?:      string
  hint?:       string
  isRequired?: boolean
  isPassword?: boolean
}

export function FormField({
  label,
  error,
  hint,
  isRequired = false,
  isPassword = false,
  ...props
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const hasError = Boolean(error)

  return (
    <View className="mb-4 w-full">
      <View className="mb-1.5 flex-row">
        <Text className="text-sm font-medium text-neutral-700">
          {label}
        </Text>
        {isRequired && (
          <Text className="ml-1 text-sm text-red-500">*</Text>
        )}
      </View>

      <View
        className={`flex-row items-center rounded-xl border px-4 ${
          hasError
            ? 'border-red-500 bg-red-50'
            : 'border-neutral-300 bg-white'
        }`}
      >
        <TextInput
          className="flex-1 py-3.5 text-base text-neutral-900"
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !showPassword}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityInvalid={hasError}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword
              ? <EyeOff size={20} color="#64748b" />
              : <Eye size={20} color="#64748b" />
            }
          </TouchableOpacity>
        )}
      </View>

      {hasError ? (
        <Text className="mt-1 text-xs text-red-500" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>
      ) : null}
    </View>
  )
}