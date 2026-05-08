import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../constants/theme';
import { LocationType } from '../../types';
import { LOCATION_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import DatePickerField from '../ui/DatePickerField';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

// ============================================
// Props
// ============================================

interface EventStep2DateTimeProps {
  // Date state
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  hasRegistrationDeadline: boolean;

  // Location state
  locationType: LocationType;
  locationName: string;
  locationCity: string;
  locationAddress: string;
  locationLatitude: string;
  locationLongitude: string;

  // Online state
  onlineUrl: string;
  onlinePlatform: string;
  onlineInstructions: string;
  onlineMeetingId: string;
  onlinePasscode: string;

  // Date handlers
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onRegistrationDeadlineChange: (date: Date | null) => void;
  onHasRegistrationDeadlineChange: (value: boolean) => void;

  // Location handlers
  onLocationTypeChange: (value: LocationType) => void;
  onLocationNameChange: (value: string) => void;
  onLocationCityChange: (value: string) => void;
  onLocationAddressChange: (value: string) => void;
  onShowMapPicker: () => void;

  // Online handlers
  onOnlineUrlChange: (value: string) => void;
  onOnlinePlatformChange: (value: string) => void;
  onOnlineInstructionsChange: (value: string) => void;
  onOnlineMeetingIdChange: (value: string) => void;
  onOnlinePasscodeChange: (value: string) => void;
  /** Map field → message d'erreur (peuplé après goToNextStep raté) */
  stepErrors?: Record<string, string>;
}

// ============================================
// Component
// ============================================

export default function EventStep2DateTime({
  startDate,
  endDate,
  registrationDeadline,
  hasRegistrationDeadline,
  locationType,
  locationName,
  locationCity,
  locationAddress,
  locationLatitude,
  locationLongitude,
  onlineUrl,
  onlinePlatform,
  onlineInstructions,
  onlineMeetingId,
  onlinePasscode,
  onStartDateChange,
  onEndDateChange,
  onRegistrationDeadlineChange,
  onHasRegistrationDeadlineChange,
  onLocationTypeChange,
  onLocationNameChange,
  onLocationCityChange,
  onLocationAddressChange,
  onShowMapPicker,
  onOnlineUrlChange,
  onOnlinePlatformChange,
  onOnlineInstructionsChange,
  onOnlineMeetingIdChange,
  onOnlinePasscodeChange,
  stepErrors = {},
}: EventStep2DateTimeProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>{t('componentsOrganizer.step2.title')}</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>{t('componentsOrganizer.step2.description')}</Text>

      {/* Dates */}
      <DateTimePickerField
        label={t('componentsOrganizer.step2.startDateLabel')}
        value={startDate}
        onChange={(date) => {
          onStartDateChange(date);
          if (date > endDate) {
            onEndDateChange(new Date(date.getTime() + 3600000));
          }
        }}
      />

      <DateTimePickerField
        label={t('componentsOrganizer.step2.endDateLabel')}
        value={endDate}
        onChange={onEndDateChange}
        minimumDate={startDate}
      />

      {/* Registration Deadline */}
      <View style={[styles.switchRow, themed.switchRow]}>
        <View style={styles.switchContent}>
          <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step2.deadlineToggleLabel')}</Text>
          <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step2.deadlineToggleDesc')}</Text>
        </View>
        <Switch
          value={hasRegistrationDeadline}
          onValueChange={(value) => {
            onHasRegistrationDeadlineChange(value);
            if (value && !registrationDeadline) {
              const deadline = new Date(startDate);
              deadline.setDate(deadline.getDate() - 1);
              onRegistrationDeadlineChange(deadline);
            }
          }}
          trackColor={{ false: colors.gray200, true: colors.primaryLight }}
          thumbColor={hasRegistrationDeadline ? colors.primary : colors.gray400}
        />
      </View>

      {hasRegistrationDeadline && (
        <DatePickerField
          label={t('componentsOrganizer.step2.deadlineLabel')}
          value={registrationDeadline || undefined}
          onChange={(date) => onRegistrationDeadlineChange(date)}
          maximumDate={startDate}
          placeholder={t('componentsOrganizer.step2.deadlinePlaceholder')}
        />
      )}

      {/* Location Type */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.locationTypeLabel')}</Text>
        <View style={styles.locationTypeSelector}>
          {LOCATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.locationTypeOption, themed.locationTypeOption, locationType === type.value && [styles.locationTypeOptionActive, themed.locationTypeOptionActive]]}
              onPress={() => onLocationTypeChange(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={24}
                color={locationType === type.value ? colors.primary : colors.gray500}
              />
              <Text style={[styles.locationTypeLabel, themed.locationTypeLabel, locationType === type.value && [styles.locationTypeLabelActive, themed.locationTypeLabelActive]]}>
                {type.label}
              </Text>
              <Text style={[styles.locationTypeDesc, themed.locationTypeDesc]}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Physical Location Fields */}
      {(locationType === 'in_person' || locationType === 'hybrid') && (
        <View style={[styles.locationFields, themed.locationFields]}>
          <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>{t('componentsOrganizer.step2.physicalLocationTitle')}</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.venueNameLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={locationName}
              onChangeText={onLocationNameChange}
              placeholder={t('componentsOrganizer.step2.venueNamePlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.cityLabel')}</Text>
            <TextInput
              style={[
                styles.input,
                themed.input,
                stepErrors.locationCity && { borderColor: '#EF4444', borderWidth: 1.5 },
              ]}
              value={locationCity}
              onChangeText={onLocationCityChange}
              placeholder={t('componentsOrganizer.step2.cityPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
            {stepErrors.locationCity && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{stepErrors.locationCity}</Text>
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.addressLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={locationAddress}
              onChangeText={onLocationAddressChange}
              placeholder={t('componentsOrganizer.step2.addressPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.mapLocationLabel')}</Text>
            <TouchableOpacity
              style={[styles.mapPickerButton, themed.mapPickerButton]}
              onPress={onShowMapPicker}
            >
              <Ionicons name="map-outline" size={20} color={colors.primary} />
              <Text style={[styles.mapPickerButtonText, themed.mapPickerButtonText]}>
                {locationLatitude && locationLongitude
                  ? t('componentsOrganizer.step2.mapEditLocation')
                  : t('componentsOrganizer.step2.mapChooseLocation')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>

            {locationLatitude && locationLongitude && (
              <View style={[styles.selectedCoordsContainer, themed.selectedCoordsContainer]}>
                <Ionicons name="location" size={16} color={colors.success} />
                <Text style={[styles.selectedCoordsText, themed.selectedCoordsText]}>
                  {locationLatitude}, {locationLongitude}
                </Text>
              </View>
            )}

            <Text style={[styles.inputHint, themed.inputHint]}>
              {t('componentsOrganizer.step2.mapHint')}
            </Text>
          </View>
        </View>
      )}

      {/* Online Location Fields */}
      {(locationType === 'online' || locationType === 'hybrid') && (
        <View style={[styles.locationFields, themed.locationFields]}>
          <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>{t('componentsOrganizer.step2.virtualLocationTitle')}</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.platformLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlinePlatform}
              onChangeText={onOnlinePlatformChange}
              placeholder={t('componentsOrganizer.step2.platformPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.connectionUrlLabel')} <Text style={{ color: colors.error || '#EF4444' }}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                themed.input,
                stepErrors.onlineUrl && { borderColor: '#EF4444', borderWidth: 1.5 },
              ]}
              value={onlineUrl}
              onChangeText={onOnlineUrlChange}
              placeholder={t('componentsOrganizer.step2.connectionUrlPlaceholder')}
              placeholderTextColor={colors.gray400}
              keyboardType="url"
              autoCapitalize="none"
            />
            {stepErrors.onlineUrl && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{stepErrors.onlineUrl}</Text>
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.meetingIdLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlineMeetingId}
              onChangeText={onOnlineMeetingIdChange}
              placeholder={t('componentsOrganizer.step2.meetingIdPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.passcodeLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlinePasscode}
              onChangeText={onOnlinePasscodeChange}
              placeholder={t('componentsOrganizer.step2.passcodePlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step2.instructionsLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall, themed.input]}
              value={onlineInstructions}
              onChangeText={onOnlineInstructionsChange}
              placeholder={t('componentsOrganizer.step2.instructionsPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </View>
  );
}
