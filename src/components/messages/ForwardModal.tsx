/**
 * Modal pour transferer un message a un autre utilisateur
 */

import React, { memo } from 'react';
import { LoadingSpinner } from '../ui/LoadingOverlay';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getDisplayName, getUserInitials, MESSAGE_AVATAR_SIZE } from '../../lib/utils/messagingHelpers';

interface ForwardModalProps {
  visible: boolean;
  targets: User[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onSelectTarget: (userId: string) => void;
}

function ForwardModal({
  visible,
  targets,
  loading,
  searchQuery,
  onSearchChange,
  onClose,
  onSelectTarget,
}: ForwardModalProps) {
  const { colors, isDark } = useTheme();

  // Filtrer les cibles par recherche
  const filteredTargets = targets.filter(user => {
    const name = getDisplayName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const renderTarget = ({ item }: { item: User }) => {
    const name = getDisplayName(item);
    const avatar = item.profile_picture || item.image;
    const initials = getUserInitials(name);

    return (
      <TouchableOpacity
        style={[styles.targetItem, { borderBottomColor: colors.gray50 }]}
        onPress={() => onSelectTarget(String(item.id))}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
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
        <Ionicons name="send" size={18} color={colors.primary} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color={colors.gray300} />
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery ? 'Aucun resultat' : 'Aucun contact disponible'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <Text style={[styles.title, { color: colors.gray900 }]}>Transferer a</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray700} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="search" size={18} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.gray900 }]}
              placeholder="Rechercher un contact..."
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
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default memo(ForwardModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
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
    color: Colors.gray900,
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
    borderBottomColor: Colors.gray50,
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
    backgroundColor: Colors.primary,
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
    color: Colors.gray900,
  },
  targetEmail: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
});
