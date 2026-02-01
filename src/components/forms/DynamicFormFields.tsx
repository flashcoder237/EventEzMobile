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
import DateTimePicker from '@react-native-community/datetimepicker';

import { FormField } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);

  // Group fields by step
  const stepGroups = useMemo(() => {
    const groups: Record<number, StepGroup> = {};

    formFields.forEach(field => {
      const stepNum = (field as any).step || 1;
      if (!groups[stepNum]) {
        groups[stepNum] = {
          fields: [],
          title: (field as any).step_title || `Étape ${stepNum}`,
        };
      }
      groups[stepNum].fields.push(field);
    });

    // Sort fields within each step by order
    Object.values(groups).forEach(group => {
      group.fields.sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [formFields]);

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderField = (field: FormField, index: number) => {
    const value = formData[field.label];
    const error = errors[field.label];
    const options = (field as any).options?.split(',').map((o: string) => o.trim()) || [];

    return (
      <View key={field.id} style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{field.label}</Text>
          {field.required && <Text style={styles.required}>*</Text>}
        </View>

        {/* Text, Email, Number, Phone, URL fields */}
        {['text', 'email', 'number', 'phone', 'tel', 'url'].includes(field.field_type) && (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={value || ''}
            onChangeText={(text) => onFieldChange(field.label, text)}
            placeholder={field.placeholder || ''}
            placeholderTextColor={Colors.gray400}
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
            style={[styles.input, styles.textArea, error && styles.inputError]}
            value={value || ''}
            onChangeText={(text) => onFieldChange(field.label, text)}
            placeholder={field.placeholder || ''}
            placeholderTextColor={Colors.gray400}
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
                style={[
                  styles.selectOption,
                  value === option && styles.selectOptionActive,
                ]}
                onPress={() => onFieldChange(field.label, option)}
              >
                <Text style={[
                  styles.selectOptionText,
                  value === option && styles.selectOptionTextActive,
                ]}>
                  {option}
                </Text>
                {value === option && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
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
                  value === option && styles.radioCircleActive,
                ]}>
                  {value === option && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{option}</Text>
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
            <View style={[styles.checkbox, value && styles.checkboxActive]}>
              {value && <Ionicons name="checkmark" size={16} color={Colors.white} />}
            </View>
            <Text style={styles.checkboxText}>
              {field.placeholder || field.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Date */}
        {field.field_type === 'date' && (
          <TouchableOpacity
            style={[styles.input, styles.dateInput, error && styles.inputError]}
            onPress={() => setShowDatePicker(field.label)}
          >
            <Text style={value ? styles.dateText : styles.datePlaceholder}>
              {value ? formatDate(new Date(value)) : 'Sélectionner une date'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Time */}
        {field.field_type === 'time' && (
          <TouchableOpacity
            style={[styles.input, styles.dateInput, error && styles.inputError]}
            onPress={() => setShowTimePicker(field.label)}
          >
            <Text style={value ? styles.dateText : styles.datePlaceholder}>
              {value || 'Sélectionner une heure'}
            </Text>
            <Ionicons name="time-outline" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Help Text */}
        {field.help_text && (
          <Text style={styles.helpText}>{field.help_text}</Text>
        )}

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Date Picker Modal */}
        {showDatePicker === field.label && (
          <DateTimePicker
            value={value ? new Date(value) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(null);
              if (selectedDate && event.type !== 'dismissed') {
                onFieldChange(field.label, selectedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker === field.label && (
          <DateTimePicker
            value={value ? new Date(`2000-01-01T${value}`) : new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowTimePicker(null);
              if (selectedDate && event.type !== 'dismissed') {
                onFieldChange(field.label, formatTime(selectedDate));
              }
            }}
          />
        )}
      </View>
    );
  };

  // Single step form
  if (!isMultiStep) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Informations requises</Text>
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
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
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
                      (isCompleted || isCurrent) && styles.stepNumberActive,
                    ]}>
                      {step}
                    </Text>
                  )}
                </TouchableOpacity>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    isCompleted && styles.stepLineCompleted,
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <Text style={styles.stepTitle}>{currentStepData?.title}</Text>
        <Text style={styles.stepProgress}>
          Étape {steps.indexOf(currentStep) + 1} sur {totalSteps}
        </Text>
      </View>

      {/* Current Step Fields */}
      <View style={styles.fieldsContainer}>
        {currentStepData?.fields.map((field, index) => renderField(field, index))}
      </View>

      {/* Step Navigation */}
      <View style={styles.stepNavigation}>
        <TouchableOpacity
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={isFirstStep}
        >
          <Ionicons name="chevron-back" size={20} color={isFirstStep ? Colors.gray300 : Colors.gray700} />
          <Text style={[styles.navButtonText, isFirstStep && styles.navButtonTextDisabled]}>
            Précédent
          </Text>
        </TouchableOpacity>

        {!isLastStep && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>Suivant</Text>
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
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  required: {
    color: '#EF4444',
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  inputError: {
    borderColor: '#EF4444',
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
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F3E8FF',
  },
  selectOptionText: {
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  selectOptionTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
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
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  datePlaceholder: {
    fontSize: FontSizes.base,
    color: Colors.gray400,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 4,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: '#EF4444',
    marginTop: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#E9D5FF',
  },
  stepNumber: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
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
    backgroundColor: '#10B981',
  },
  stepTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  stepProgress: {
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  navButtonTextDisabled: {
    color: Colors.gray300,
  },
  navButtonTextPrimary: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
});
