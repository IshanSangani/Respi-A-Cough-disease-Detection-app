import React from 'react';
import { TextInput, View, Text, TextInputProps, StyleSheet } from 'react-native';

interface InputProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, containerClassName, ...rest }) => {
  return (
    <View style={[styles.container, containerClassName && { }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor="#94a3b8"
        style={[styles.input, error && styles.inputError, rest.style as any]}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '500', color: '#0553b4' },
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#b8deff',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: '#dc2626' },
  error: { marginTop: 4, fontSize: 12, color: '#dc2626' },
});

export default Input;