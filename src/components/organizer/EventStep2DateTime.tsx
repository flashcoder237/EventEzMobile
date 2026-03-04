import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}: EventStep2DateTimeProps) {
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>Date et Lieu</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>Quand et où se déroulera votre événement ?</Text>

      {/* Dates */}
      <DateTimePickerField
        label="Date de début *"
        value={startDate}
        onChange={(date) => {
          onStartDateChange(date);
          if (date > endDate) {
            onEndDateChange(new Date(date.getTime() + 3600000));
          }
        }}
      />

      <DateTimePickerField
        label="Date de fin *"
        value={endDate}
        onChange={onEndDateChange}
        minimumDate={startDate}
      />

      {/* Registration Deadline */}
      <View style={[styles.switchRow, themed.switchRow]}>
        <View style={styles.switchContent}>
          <Text style={[styles.switchLabel, themed.switchLabel]}>Date limite d'inscription</Text>
          <Text style={[styles.switchDescription, themed.switchDescription]}>Definir une date limite pour s'inscrire</Text>
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
          label="Date limite"
          value={registrationDeadline || undefined}
          onChange={(date) => onRegistrationDeadlineChange(date)}
          maximumDate={startDate}
          placeholder="Sélectionner une date"
        />
      )}

      {/* Location Type */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Type de lieu *</Text>
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
          <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>Lieu physique</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Nom du lieu</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={locationName}
              onChangeText={onLocationNameChange}
              placeholder="Ex: Palais des Congrès"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Ville *</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={locationCity}
              onChangeText={onLocationCityChange}
              placeholder="Ex: Douala"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Adresse</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={locationAddress}
              onChangeText={onLocationAddressChange}
              placeholder="Adresse complète"
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Emplacement sur la carte</Text>
            <TouchableOpacity
              style={[styles.mapPickerButton, themed.mapPickerButton]}
              onPress={onShowMapPicker}
            >
              <Ionicons name="map-outline" size={20} color={colors.primary} />
              <Text style={[styles.mapPickerButtonText, themed.mapPickerButtonText]}>
                {locationLatitude && locationLongitude
                  ? 'Modifier l\'emplacement sur la carte'
                  : 'Choisir sur la carte'}
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
              Pour afficher l'événement sur la carte et permettre la navigation
            </Text>
          </View>
        </View>
      )}

      {/* Online Location Fields */}
      {(locationType === 'online' || locationType === 'hybrid') && (
        <View style={[styles.locationFields, themed.locationFields]}>
          <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>Lieu virtuel</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Plateforme</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlinePlatform}
              onChangeText={onOnlinePlatformChange}
              placeholder="Ex: Zoom, Google Meet, Teams"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Lien de connexion</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlineUrl}
              onChangeText={onOnlineUrlChange}
              placeholder="https://..."
              placeholderTextColor={colors.gray400}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>ID de réunion</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlineMeetingId}
              onChangeText={onOnlineMeetingIdChange}
              placeholder="Ex: 123 456 7890"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Code d'accès</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={onlinePasscode}
              onChangeText={onOnlinePasscodeChange}
              placeholder="Ex: abc123"
              placeholderTextColor={colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Instructions de connexion</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall, themed.input]}
              value={onlineInstructions}
              onChangeText={onOnlineInstructionsChange}
              placeholder="Instructions pour rejoindre l'événement..."
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
