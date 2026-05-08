import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import { LLEVA_COLORS } from '@lleva/shared-constants'

interface FormFieldProps extends React.ComponentProps<typeof TextInput> {
  label: string
  error?: string
  hint?: string
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
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
        </Text>
        {isRequired && (
          <Text style={styles.required}>*</Text>
        )}
      </View>

      <View
        style={[
          styles.inputContainer,
          hasError
            ? { borderColor: LLEVA_COLORS.semantic.error, backgroundColor: LLEVA_COLORS.semantic.errorLight }
            : { borderColor: LLEVA_COLORS.neutral[300], backgroundColor: LLEVA_COLORS.neutral[0] },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={LLEVA_COLORS.neutral[400]}
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
              ? <EyeOff size={20} color={LLEVA_COLORS.neutral[500]} />
              : <Eye size={20} color={LLEVA_COLORS.neutral[500]} />
            }
          </TouchableOpacity>
        )}
      </View>

      {hasError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: LLEVA_COLORS.text.primary,
  },
  required: { marginLeft: 4, fontSize: 14, color: LLEVA_COLORS.semantic.error },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: LLEVA_COLORS.text.primary,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: LLEVA_COLORS.semantic.error,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: LLEVA_COLORS.text.secondary,
  },
})