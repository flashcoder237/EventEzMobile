import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '../../constants/theme';
import { LocationType } from '../../types';
import { LOCATION_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import DatePickerField from '../ui/DatePickerField';
import styles from './eventCreateStyles';

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
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date et Lieu</Text>
      <Text style={styles.stepDescription}>Quand et o\u00f9 se d\u00e9roulera votre \u00e9v\u00e9nement ?</Text>

      {/* Dates */}
      <DateTimePickerField
        label="Date de d\u00e9but *"
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
      <View style={styles.switchRow}>
        <View style={styles.switchContent}>
          <Text style={styles.switchLabel}>Date limite d'inscription</Text>
          <Text style={styles.switchDescription}>Definir une date limite pour s'inscrire</Text>
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
          trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
          thumbColor={hasRegistrationDeadline ? Colors.primary : Colors.gray400}
        />
      </View>

      {hasRegistrationDeadline && (
        <DatePickerField
          label="Date limite"
          value={registrationDeadline || undefined}
          onChange={(date) => onRegistrationDeadlineChange(date)}
          maximumDate={startDate}
          placeholder="S\u00e9lectionner une date"
        />
      )}

      {/* Location Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type de lieu *</Text>
        <View style={styles.locationTypeSelector}>
          {LOCATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.locationTypeOption, locationType === type.value && styles.locationTypeOptionActive]}
              onPress={() => onLocationTypeChange(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={24}
                color={locationType === type.value ? Colors.primary : Colors.gray500}
              />
              <Text style={[styles.locationTypeLabel, locationType === type.value && styles.locationTypeLabelActive]}>
                {type.label}
              </Text>
              <Text style={styles.locationTypeDesc}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Physical Location Fields */}
      {(locationType === 'in_person' || locationType === 'hybrid') && (
        <View style={styles.locationFields}>
          <Text style={styles.subSectionTitle}>Lieu physique</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du lieu</Text>
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={onLocationNameChange}
              placeholder="Ex: Palais des Congr\u00e8s"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              value={locationCity}
              onChangeText={onLocationCityChange}
              placeholder="Ex: Douala"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              value={locationAddress}
              onChangeText={onLocationAddressChange}
              placeholder="Adresse compl\u00e8te"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          {/* Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emplacement sur la carte</Text>
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={onShowMapPicker}
            >
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.mapPickerButtonText}>
                {locationLatitude && locationLongitude
                  ? 'Modifier l\'emplacement sur la carte'
                  : 'Choisir sur la carte'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
            </TouchableOpacity>

            {locationLatitude && locationLongitude && (
              <View style={styles.selectedCoordsContainer}>
                <Ionicons name="location" size={16} color={Colors.success} />
                <Text style={styles.selectedCoordsText}>
                  {locationLatitude}, {locationLongitude}
                </Text>
              </View>
            )}

            <Text style={styles.inputHint}>
              Pour afficher l'\u00e9v\u00e9nement sur la carte et permettre la navigation
            </Text>
          </View>
        </View>
      )}

      {/* Online Location Fields */}
      {(locationType === 'online' || locationType === 'hybrid') && (
        <View style={styles.locationFields}>
          <Text style={styles.subSectionTitle}>Lieu virtuel</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plateforme</Text>
            <TextInput
              style={styles.input}
              value={onlinePlatform}
              onChangeText={onOnlinePlatformChange}
              placeholder="Ex: Zoom, Google Meet, Teams"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lien de connexion</Text>
            <TextInput
              style={styles.input}
              value={onlineUrl}
              onChangeText={onOnlineUrlChange}
              placeholder="https://..."
              placeholderTextColor={Colors.gray400}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID de r\u00e9union</Text>
            <TextInput
              style={styles.input}
              value={onlineMeetingId}
              onChangeText={onOnlineMeetingIdChange}
              placeholder="Ex: 123 456 7890"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Code d'acc\u00e8s</Text>
            <TextInput
              style={styles.input}
              value={onlinePasscode}
              onChangeText={onOnlinePasscodeChange}
              placeholder="Ex: abc123"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions de connexion</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              value={onlineInstructions}
              onChangeText={onOnlineInstructionsChange}
              placeholder="Instructions pour rejoindre l'\u00e9v\u00e9nement..."
              placeholderTextColor={Colors.gray400}
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
