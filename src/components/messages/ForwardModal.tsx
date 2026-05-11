/**
 * Modal pour transférer un message à un autre utilisateur — Bottom Sheet
 */

import React, { memo, useEffect, useState } from 'react';
import { LoadingSpinner } from '../ui/LoadingOverlay';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { User } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getDisplayName,
  getUserInitials,
  MESSAGE_AVATAR_SIZE,
} from '../../lib/utils/messagingHelpers';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface ForwardModalProps {
  visible: boolean;
  targets: User[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  /** Appelé avec la liste complète des userIds sélectionnés au tap "Envoyer".
   *  Le composant gère la sélection multiple en interne. */
  onSendToTargets: (userIds: string[]) => void;
}

// Hauteur estimée d'une ligne cible (avatar + nom)
const FORWARD_TARGET_HEIGHT = 72;

function ForwardModal({
  visible,
  targets,
  loading,
  searchQuery,
  onSearchChange,
  onClose,
  onSendToTargets,
}: ForwardModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);
  // Sélection multiple — Set d'userIds. Reset à chaque ouverture pour éviter
  // qu'un user re-trouve une sélection fantôme d'une session précédente.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (visible) setSelectedIds(new Set());
  }, [visible]);

  const toggleSelection = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    onSendToTargets(Array.from(selectedIds));
  };

  const filteredTargets = targets.filter((user) => {
    const name = getDisplayName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const renderTarget = ({ item }: { item: User }) => {
    const name = getDisplayName(item);
    const avatar = item.profile_picture || item.image;
    const initials = getUserInitials(name);
    const id = String(item.id);
    const selected = selectedIds.has(id);

    return (
      <TouchableOpacity
        style={[
          styles.targetItem,
          {
            borderBottomColor: colors.gray50,
            backgroundColor: selected ? `${colors.primary}10` : 'transparent',
          },
        ]}
        onPress={() => toggleSelection(id)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
      >
        {avatar ? (
          <Image source={avatar} style={styles.avatar} cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.targetInfo}>
          <Text style={[styles.targetName, { color: colors.gray900 }]}>{name}</Text>
          {item.email && (
            <Text style={[styles.targetEmail, { color: colors.gray500 }]}>{item.email}</Text>
          )}
        </View>
        {/* Checkbox state — coche pleine quand sélectionné, cercle vide sinon */}
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? colors.primary : colors.gray300,
              backgroundColor: selected ? colors.primary : 'transparent',
            },
          ]}
        >
          {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color={colors.gray300} />
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery ? t('componentsMessages.forwardEmptyNoResult') : t('componentsMessages.forwardEmptyNoContact')}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* KAV for keyboard avoidance */}
      <KeyboardAvoidingView
        style={[StyleSheet.absoluteFill, styles.kav]}
        behavior="padding"
        pointerEvents="box-none"
      >
        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.md),
            },
            sheetAnim,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.title, { color: colors.gray900 }]}>{t('componentsMessages.forwardTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray700} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="search" size={18} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.gray900 }]}
              placeholder={t('componentsMessages.forwardSearchPlaceholder')}
              placeholderTextColor={colors.gray400}
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner />
            </View>
          ) : (
            <FlatList
              data={filteredTargets}
              renderItem={renderTarget}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews
              getItemLayout={(_, i) => ({ length: FORWARD_TARGET_HEIGHT, offset: FORWARD_TARGET_HEIGHT * i, index: i })}
            />
          )}

          {/* Bouton sticky d'envoi multi-cibles. Désactivé tant qu'aucune
              sélection. Affiche le compteur pour la transparence. */}
          {selectedIds.size > 0 && (
            <View style={[styles.sendCtaWrap, { borderTopColor: colors.gray100, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.sendCta, { backgroundColor: colors.primary }]}
                onPress={handleSend}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('componentsMessages.forwardSendA11y', { count: selectedIds.size })}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendCtaText}>
                  {selectedIds.size === 1
                    ? t('componentsMessages.forwardSendSingular')
                    : t('componentsMessages.forwardSendPlural', { count: selectedIds.size })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ForwardModal);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
  },
  loadingContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  targetInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  targetName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
  },
  targetEmail: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCtaWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  sendCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  sendCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
