import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FormField } from '../../types';
import DatePickerField from '../ui/DatePickerField';
import TimePickerField from '../ui/TimePickerField';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface DynamicFormFieldsProps {
  formFields: FormField[];
  formData: Record<string, any>;
  onFieldChange: (fieldLabel: string, value: any) => void;
  errors?: Record<string, string>;
}

interface StepGroup {
  fields: FormField[];
  title: string;
}

export default function DynamicFormFields({
  formFields,
  formData,
  onFieldChange,
  errors = {},
}: DynamicFormFieldsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);

  // Group fields by step
  const stepGroups = useMemo(() => {
    const groups: Record<number, StepGroup> = {};

    formFields.forEach(field => {
      const stepNum = (field as any).step || 1;
      if (!groups[stepNum]) {
        groups[stepNum] = {
          fields: [],
          title: (field as any).step_title || t('componentsForms.dynamicFields.stepFallback', { step: stepNum }),
        };
      }
      groups[stepNum].fields.push(field);
    });

    // Sort fields within each step by order
    Object.values(groups).forEach(group => {
      group.fields.sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [formFields, t]);

  const steps = Object.keys(stepGroups).map(Number).sort((a, b) => a - b);
  const totalSteps = steps.length;
  const isMultiStep = totalSteps > 1;
  const isLastStep = currentStep === steps[steps.length - 1];
  const isFirstStep = currentStep === steps[0];

  // Validate current step fields
  const validateCurrentStep = (): boolean => {
    const currentFields = stepGroups[currentStep]?.fields || [];
    for (const field of currentFields) {
      if (field.required && !formData[field.label]) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const renderField = (field: FormField, index: number) => {
    const value = formData[field.label];
    const error = errors[field.label];
    const options = (field as any).options?.split(',').map((o: string) => o.trim()) || [];

    return (
      <View key={field.id} style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.gray600 }]}>{field.label}</Text>
          {field.required && <Text style={[styles.required, { color: colors.error }]}>*</Text>}
        </View>

        {/* Text, Email, Number, Phone, URL fields */}
        {['text', 'email', 'number', 'phone', 'tel', 'url'].includes(field.field_type) && (
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }, error && { borderColor: colors.error }]}
            value={value || ''}
            onChangeText={(text) => onFieldChange(field.label, text)}
            placeholder={field.placeholder || ''}
            placeholderTextColor={colors.gray400}
            keyboardType={
              field.field_type === 'email' ? 'email-address' :
              field.field_type === 'number' ? 'numeric' :
              ['phone', 'tel'].includes(field.field_type) ? 'phone-pad' :
              field.field_type === 'url' ? 'url' : 'default'
            }
            autoCapitalize={field.field_type === 'email' ? 'none' : 'sentences'}
          />
        )}

        {/* Textarea */}
        {field.field_type === 'textarea' && (
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }, error && { borderColor: colors.error }]}
            value={value || ''}
            onChangeText={(text) => onFieldChange(field.label, text)}
            placeholder={field.placeholder || ''}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        )}

        {/* Select */}
        {field.field_type === 'select' && (
          <View style={styles.selectContainer}>
            {options.map((option: string, optIndex: number) => (
              <TouchableOpacity
                key={optIndex}
                activeOpacity={0.85}
                style={[
                  styles.selectOption,
                  { backgroundColor: colors.card, borderColor: colors.gray200 },
                  value === option && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? colors.primaryBg : colors.primaryBgLight,
                  },
                ]}
                onPress={() => onFieldChange(field.label, option)}
              >
                <Text style={[
                  styles.selectOptionText,
                  { color: colors.gray700 },
                  value === option && { color: colors.primary, fontFamily: FontFamily.bold },
                ]}>
                  {option}
                </Text>
                {value === option && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Radio */}
        {field.field_type === 'radio' && (
          <View style={styles.radioContainer}>
            {options.map((option: string, optIndex: number) => (
              <TouchableOpacity
                key={optIndex}
                style={styles.radioOption}
                onPress={() => onFieldChange(field.label, option)}
              >
                <View style={[
                  styles.radioCircle,
                  { borderColor: colors.gray300 },
                  value === option && { borderColor: colors.primary },
                ]}>
                  {value === option && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.radioText, { color: colors.gray700 }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Checkbox */}
        {field.field_type === 'checkbox' && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => onFieldChange(field.label, !value)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: colors.gray300 },
              value && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}>
              {value && <Ionicons name="checkmark" size={16} color={Colors.white} />}
            </View>
            <Text style={[styles.checkboxText, { color: colors.gray700 }]}>
              {field.placeholder || field.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Date */}
        {field.field_type === 'date' && (
          <DatePickerField
            value={value ? new Date(value) : undefined}
            onChange={(date) => onFieldChange(field.label, date.toISOString().split('T')[0])}
            error={error}
            placeholder={field.placeholder || t('componentsForms.dynamicFields.selectDatePlaceholder')}
          />
        )}

        {/* Time */}
        {field.field_type === 'time' && (
          <TimePickerField
            value={value ? new Date(`2000-01-01T${value}`) : undefined}
            onChange={(date) => {
              const h = date.getHours().toString().padStart(2, '0');
              const m = date.getMinutes().toString().padStart(2, '0');
              onFieldChange(field.label, `${h}:${m}`);
            }}
            error={error}
            placeholder={field.placeholder || t('componentsForms.dynamicFields.selectTimePlaceholder')}
          />
        )}

        {/* Help Text */}
        {field.help_text && (
          <Text style={[styles.helpText, { color: colors.gray500 }]}>{field.help_text}</Text>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  // Single step form
  if (!isMultiStep) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('componentsForms.dynamicFields.sectionTitle')}</Text>
        {formFields
          .sort((a, b) => a.order - b.order)
          .map((field, index) => renderField(field, index))}
      </View>
    );
  }

  // Multi-step form
  const currentStepData = stepGroups[currentStep];

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={styles.stepRow}>
          {steps.map((step, index) => {
            const stepIndex = steps.indexOf(currentStep);
            const isCompleted = index < stepIndex;
            const isCurrent = step === currentStep;

            return (
              <React.Fragment key={step}>
                <TouchableOpacity
                  style={[
                    styles.stepCircle,
                    { backgroundColor: colors.gray200 },
                    isCompleted && { backgroundColor: colors.success },
                    isCurrent && { backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    if (index <= stepIndex) setCurrentStep(step);
                  }}
                  disabled={index > stepIndex}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  ) : (
                    <Text style={[
                      styles.stepNumber,
                      { color: colors.gray500 },
                      (isCompleted || isCurrent) && { color: Colors.white },
                    ]}>
                      {step}
                    </Text>
                  )}
                </TouchableOpacity>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    { backgroundColor: colors.gray200 },
                    isCompleted && { backgroundColor: colors.success },
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <Text style={[styles.stepTitle, { color: colors.gray900 }]}>{currentStepData?.title}</Text>
        <Text style={[styles.stepProgress, { color: colors.gray500 }]}>
          {t('componentsForms.dynamicFields.stepProgress', { current: steps.indexOf(currentStep) + 1, total: totalSteps })}
        </Text>
      </View>

      {/* Current Step Fields */}
      <View style={styles.fieldsContainer}>
        {currentStepData?.fields.map((field, index) => renderField(field, index))}
      </View>

      {/* Step Navigation */}
      <View style={[styles.stepNavigation, { borderTopColor: colors.gray200 }]}>
        <TouchableOpacity
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={isFirstStep}
        >
          <Ionicons name="chevron-back" size={20} color={isFirstStep ? colors.gray300 : colors.gray700} />
          <Text style={[styles.navButtonText, { color: colors.gray700 }, isFirstStep && { color: colors.gray300 }]}>
            {t('componentsForms.dynamicFields.previous')}
          </Text>
        </TouchableOpacity>

        {!isLastStep && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>{t('componentsForms.dynamicFields.next')}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.5,
    color: Colors.gray900,
    marginBottom: Spacing.lg,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray600,
  },
  required: {
    color: Colors.error,
    marginLeft: 4,
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    gap: Spacing.xs,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
  },
  selectOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  selectOptionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.1,
    color: Colors.gray700,
  },
  selectOptionTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  radioContainer: {
    gap: Spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  radioText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    color: Colors.error,
  },
  stepIndicator: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: Colors.success,
  },
  stepCircleCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  stepNumber: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.gray500,
  },
  stepNumberActive: {
    color: Colors.white,
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: Colors.success,
  },
  stepTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.5,
    color: Colors.gray900,
    marginBottom: 4,
    textAlign: 'center',
  },
  stepProgress: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray500,
  },
  fieldsContainer: {
    minHeight: 200,
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    marginTop: Spacing.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  navButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
    color: Colors.gray700,
  },
  navButtonTextDisabled: {
    color: Colors.gray300,
  },
  navButtonTextPrimary: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.1,
    color: Colors.white,
  },
});
