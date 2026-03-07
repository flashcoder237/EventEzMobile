import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../../contexts/ThemeContext';
import { eventsAPI } from '../../api/client';
import { Event } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

interface AddToCalendarButtonProps {
  event: Event;
  size?: 'sm' | 'md';
}

function AddToCalendarButton({ event, size = 'md' }: AddToCalendarButtonProps) {
  const { colors, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState<'google' | 'ical' | null>(null);

  const handleGoogleCalendar = async () => {
    setLoading('google');
    try {
      const res = await eventsAPI.getGoogleCalendarLink(event.id);
      const url = res.data?.url || res.data?.google_calendar_url;
      if (url) {
        await Linking.openURL(url);
      } else {
        // Fallback: build Google Calendar URL manually
        const startDate = event.start_date ? new Date(event.start_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : '';
        const endDate = event.end_date ? new Date(event.end_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : '';
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title || '')}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.short_description || '')}&location=${encodeURIComponent(event.location_name || '')}`;
        await Linking.openURL(gcalUrl);
      }
      setShowModal(false);
    } catch (error) {
      if (__DEV__) console.error('Erreur Google Calendar:', error);
      // Fallback URL
      const startDate = event.start_date ? new Date(event.start_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : '';
      const endDate = event.end_date ? new Date(event.end_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : '';
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title || '')}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.short_description || '')}&location=${encodeURIComponent(event.location_name || '')}`;
      await Linking.openURL(gcalUrl);
      setShowModal(false);
    } finally {
      setLoading(null);
    }
  };

  const handleIcal = async () => {
    setLoading('ical');
    try {
      const res = await eventsAPI.exportIcal(event.id);
      const icsContent = typeof res.data === 'string' ? res.data : generateIcsContent();
      const file = new File(Paths.cache, `event-${event.id}.ics`);
      file.write(icsContent);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Ajouter au calendrier',
          UTI: 'com.apple.ical.ics',
        });
      }
      setShowModal(false);
    } catch (error) {
      if (__DEV__) console.error('Erreur export iCal:', error);
      // Fallback: generate ICS locally
      try {
        const icsContent = generateIcsContent();
        const fallbackFile = new File(Paths.cache, `event-${event.id}.ics`);
        fallbackFile.write(icsContent);
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fallbackFile.uri, {
            mimeType: 'text/calendar',
            dialogTitle: 'Ajouter au calendrier',
            UTI: 'com.apple.ical.ics',
          });
        }
        setShowModal(false);
      } catch (fallbackError) {
        if (__DEV__) console.error('Erreur fallback iCal:', fallbackError);
      }
    } finally {
      setLoading(null);
    }
  };

  const generateIcsContent = (): string => {
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventEz//EventEz App//FR',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(event.start_date)}`,
      `DTEND:${formatDate(event.end_date)}`,
      `SUMMARY:${(event.title || '').replace(/[,;\\]/g, '\\$&')}`,
      `DESCRIPTION:${(event.short_description || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')}`,
      `LOCATION:${(event.location_name || '').replace(/[,;\\]/g, '\\$&')}`,
      `UID:${event.id}@eventez.app`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  };

  const isSmall = size === 'sm';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          isSmall && styles.buttonSmall,
          { backgroundColor: colors.gray100 },
        ]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={isSmall ? 18 : 20}
          color={colors.gray600}
        />
        {!isSmall && (
          <Text style={[styles.buttonLabel, { color: colors.gray600 }]}>
            Calendrier
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />
            <Text style={[styles.sheetTitle, { color: colors.gray900 }]}>
              Ajouter au calendrier
            </Text>

            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
              onPress={handleGoogleCalendar}
              disabled={loading !== null}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9' }]}>
                {loading === 'google' ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                )}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.gray900 }]}>
                  Google Calendar
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.gray500 }]}>
                  Ouvrir dans Google Calendar
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
              onPress={handleIcal}
              disabled={loading !== null}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: isDark ? '#1A1A2E' : '#EDE9FE' }]}>
                {loading === 'ical' ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : (
                  <Ionicons name="calendar" size={24} color="#7C3AED" />
                )}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.gray900 }]}>
                  {Platform.OS === 'ios' ? 'Apple Calendar' : 'Calendrier (iCal)'}
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.gray500 }]}>
                  Telecharger le fichier .ics
                </Text>
              </View>
              <Ionicons name="download-outline" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.gray100 }]}
              onPress={() => setShowModal(false)}
            >
              <Text style={[styles.cancelText, { color: colors.gray700 }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default memo(AddToCalendarButton);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  buttonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    ...TextStyles.h3,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  optionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
  optionSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
});
