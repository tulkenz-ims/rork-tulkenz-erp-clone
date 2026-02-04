import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ChevronDown, Check, Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FormField, FormFieldOption } from '@/types/taskFeedTemplates';

interface DynamicFormRendererProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  onDropdownPress?: (field: FormField) => void;
}

export default function DynamicFormRenderer({
  fields,
  values,
  onChange,
  errors = {},
  onDropdownPress,
}: DynamicFormRendererProps) {
  const { colors } = useTheme();

  const sortedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  const renderField = useCallback((field: FormField) => {
    const value = values[field.id];
    const error = errors[field.id];

    switch (field.fieldType) {
      case 'dropdown':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                { backgroundColor: colors.surface, borderColor: error ? '#EF4444' : colors.border },
              ]}
              onPress={() => onDropdownPress?.(field)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  { color: value ? colors.text : colors.textTertiary },
                ]}
              >
                {value
                  ? field.options?.find(o => o.value === value)?.label || value
                  : field.placeholder || `Select ${field.label}`}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'text_input':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, color: colors.text, borderColor: error ? '#EF4444' : colors.border },
              ]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value || ''}
              onChangeText={(text) => onChange(field.id, text)}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'text_area':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.surface, color: colors.text, borderColor: error ? '#EF4444' : colors.border },
              ]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value || ''}
              onChangeText={(text) => onChange(field.id, text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'radio':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.radioGroup}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    { 
                      backgroundColor: value === option.value ? colors.primary + '15' : colors.surface,
                      borderColor: value === option.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onChange(field.id, option.value)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: value === option.value ? colors.primary : colors.textTertiary },
                    ]}
                  >
                    {value === option.value && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[styles.radioLabel, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'checkbox':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.checkboxGroup}>
              {field.options?.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.checkboxOption,
                      { 
                        backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        onChange(field.id, selectedValues.filter(v => v !== option.value));
                      } else {
                        onChange(field.id, [...selectedValues, option.value]);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { 
                          borderColor: isSelected ? colors.primary : colors.textTertiary,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Check size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, color: colors.text, borderColor: error ? '#EF4444' : colors.border },
              ]}
              placeholder={field.placeholder || '0'}
              placeholderTextColor={colors.textTertiary}
              value={value?.toString() || ''}
              onChangeText={(text) => onChange(field.id, text ? parseFloat(text) || text : '')}
              keyboardType="numeric"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      case 'date':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.surface, borderColor: error ? '#EF4444' : colors.border },
              ]}
              onPress={() => onDropdownPress?.(field)}
            >
              <Calendar size={18} color={colors.textSecondary} />
              <Text
                style={[
                  styles.dateText,
                  { color: value ? colors.text : colors.textTertiary },
                ]}
              >
                {value || field.placeholder || 'Select date'}
              </Text>
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {field.helpText && (
              <Text style={[styles.helpText, { color: colors.textTertiary }]}>{field.helpText}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  }, [values, errors, colors, onChange, onDropdownPress]);

  return (
    <View style={styles.container}>
      {sortedFields.map(renderField)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 15,
    flex: 1,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 15,
    flex: 1,
  },
  checkboxGroup: {
    gap: 8,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
});
