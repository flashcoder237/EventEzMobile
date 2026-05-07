// ============================================
// SearchableSelectModal — modal générique de sélection avec recherche
// ============================================
//
// Remplace les listes inline (chips horizontaux, ScrollView de cards) par un
// pattern bouton-trigger + bottom-sheet modal. Avantages :
//   - Recherche live (filtrage côté client, sensible aux accents)
//   - Liste scrollable verticalement (pas de débordement horizontal)
//   - Empty state propre quand la recherche ne renvoie rien
//   - Même UX pour catégorie / template / et tout autre select à venir
//
// Le composant est générique sur T : on lui passe les items et 4 accesseurs
// (key, label, optionnel description, optionnel icon) — il s'occupe du
// rendu. `renderItemExtra` permet d'injecter du contenu spécifique sous le
// label (ex : pills pour les templates).

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

interface Props<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Petit eyebrow au-dessus du titre. Optionnel. */
  eyebrow?: string;
  items: T[];
  /** Identifiant unique stringifiable de l'item (utilisé pour la sélection). */
  getKey: (item: T) => string;
  /** Texte principal affiché. Sert aussi au matching de la recherche. */
  getLabel: (item: T) => string;
  /** Texte secondaire optionnel sous le label. Sert aussi au matching. */
  getDescription?: (item: T) => string | undefined;
  /** Icône Ionicons optionnelle à gauche de chaque item. */
  getIcon?: (item: T) => keyof typeof Ionicons.glyphMap | undefined;
  /** Key actuellement sélectionnée — coche bleue + fond surligné. */
  selectedKey?: string | null;
  /** Callback de sélection. Le modal se ferme automatiquement après. */
  onSelect: (item: T) => void;
  /** Si fourni, affiche un bouton "Effacer la sélection" en pied de modal. */
  onClear?: () => void;
  searchPlaceholder?: string;
  /** Render slot custom sous le label (ex : pills meta). */
  renderItemExtra?: (item: T) => React.ReactNode;
  /** Texte affiché quand items est vide ou search ne renvoie rien. */
  emptyText?: string;
}

// Normalise pour un matching insensible aux accents/casse
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function SearchableSelectModal<T>({
  visible,
  onClose,
  title,
  eyebrow,
  items,
  getKey,
  getLabel,
  getDescription,
  getIcon,
  selectedKey,
  onSelect,
  onClear,
  searchPlaceholder = 'Rechercher...',
  renderItemExtra,
  emptyText = 'Aucun résultat.',
}: Props<T>) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,16,0.08)';
  const [query, setQuery] = useState('');

  // Filtrage live — match label OU description, normalisé
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items;
    return items.filter(it => {
      const label = norm(getLabel(it));
      const desc = getDescription ? norm(getDescription(it) || '') : '';
      return label.includes(q) || desc.includes(q);
    });
  }, [items, query, getLabel, getDescription]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header — paddingTop = inset.top pour respecter le notch */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + Spacing.md, borderBottomColor: hairline },
          ]}
        >
          <View style={{ flex: 1 }}>
            {eyebrow && (
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
            )}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: hairline }]}
            hitSlop={8}
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.card, borderColor: hairline },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.gray500} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={getKey}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: hairline }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={28} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>{emptyText}</Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (onClear ? 80 : 24) + insets.bottom },
          ]}
          renderItem={({ item }) => {
            const key = getKey(item);
            const label = getLabel(item);
            const desc = getDescription?.(item);
            const icon = getIcon?.(item);
            const selected = selectedKey != null && key === selectedKey;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.row,
                  selected && { backgroundColor: `${colors.primary}10` },
                  pressed && !selected && { backgroundColor: colors.gray100 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {icon && (
                  <View style={[styles.iconWell, { backgroundColor: `${colors.primary}14` }]}>
                    <Ionicons name={icon} size={18} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                  {!!desc && (
                    <Text
                      style={[styles.desc, { color: colors.gray500 }]}
                      numberOfLines={2}
                    >
                      {desc}
                    </Text>
                  )}
                  {renderItemExtra?.(item)}
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            );
          }}
        />

        {/* Footer "Effacer" optionnel */}
        {onClear && selectedKey != null && (
          <View
            style={[
              styles.footer,
              { borderTopColor: hairline, paddingBottom: Spacing.md + insets.bottom },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                onClear();
                handleClose();
              }}
              style={[styles.clearBtn, { borderColor: hairline }]}
              accessibilityRole="button"
              accessibilityLabel="Effacer la sélection"
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.clearText, { color: colors.error }]}>
                Effacer la sélection
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    paddingVertical: 4,
  },
  listContent: {
    paddingTop: Spacing.xs,
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.lg + 36 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  desc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  clearText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: 0.2,
  },
});
