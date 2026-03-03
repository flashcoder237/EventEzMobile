import { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Hook that returns dynamic color overrides for eventCreateStyles.
 * Since eventCreateStyles.ts is a module-level StyleSheet (cannot use hooks),
 * this hook provides themed overrides to spread on top of the static styles.
 *
 * Usage: const themed = useEventCreateThemedStyles();
 *        <TextInput style={[styles.input, themed.input]} />
 */
export function useEventCreateThemedStyles() {
  const { colors } = useTheme();

  return useMemo(() => ({
    // Text styles
    stepTitle: { color: colors.gray900 },
    stepDescription: { color: colors.gray500 },
    label: { color: colors.gray900 },
    charCount: { color: colors.gray400 },
    inputHint: { color: colors.gray500 },
    subSectionTitle: { color: colors.gray800 },

    // Input
    input: {
      backgroundColor: colors.gray50,
      color: colors.gray900,
      borderColor: colors.gray200,
    },

    // Image picker
    imagePickerButton: { borderColor: colors.gray200 },
    imagePickerPlaceholder: { backgroundColor: colors.gray50 },
    imagePickerText: { color: colors.gray500 },

    // Type selector
    typeOption: { backgroundColor: colors.gray100, borderColor: colors.gray200 },
    typeOptionText: { color: colors.gray600 },

    // Category chips
    categoryChip: { backgroundColor: colors.gray100, borderColor: colors.gray200 },
    categoryChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
    categoryChipText: { color: colors.gray600 },
    categoryChipTextActive: { color: colors.primary },

    // Generic chips
    chip: { backgroundColor: colors.gray100, borderColor: colors.gray200 },
    chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
    chipText: { color: colors.gray600 },
    chipTextActive: { color: colors.primary },

    // Location
    locationTypeOption: { backgroundColor: colors.gray50, borderColor: colors.gray200 },
    locationTypeOptionActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
    locationTypeLabel: { color: colors.gray700 },
    locationTypeLabelActive: { color: colors.primary },
    locationTypeDesc: { color: colors.gray500 },
    locationFields: { borderTopColor: colors.gray100 },

    // Switch row
    switchRow: { borderBottomColor: colors.gray100 },
    switchLabel: { color: colors.gray900 },
    switchDescription: { color: colors.gray500 },

    // Map picker
    mapPickerButton: { backgroundColor: colors.gray50, borderColor: colors.gray200 },
    mapPickerButtonText: { color: colors.primary },

    // Coordinates
    selectedCoordsContainer: { backgroundColor: colors.successLight },
    selectedCoordsText: { color: colors.successDark },

    // Info boxes
    infoBox: { backgroundColor: colors.primaryBg },
    infoBoxText: { color: colors.primary },
    warningInfoBox: { backgroundColor: colors.warningLight },
    warningInfoBoxText: { color: colors.warningDark },

    // Empty state
    emptyContainer: { backgroundColor: colors.gray50, borderColor: colors.gray200 },
    emptyIcon: { backgroundColor: colors.gray100 },
    emptyTitle: { color: colors.gray700 },
    emptyText: { color: colors.gray500 },

    // Add button
    addButton: { backgroundColor: colors.primary },
    addButtonText: { color: colors.white },

    // Card
    card: { backgroundColor: colors.card, borderColor: colors.gray200 },
    cardHeader: { borderBottomColor: colors.gray100 },
    cardTitle: { color: colors.gray900 },

    // Add another
    addAnotherButton: { borderColor: colors.gray200, backgroundColor: colors.gray50 },
    addAnotherText: { color: colors.primary },

    // Summary
    summaryCard: { backgroundColor: colors.gray50 },
    summaryRow: { borderBottomColor: colors.gray200 },
    summaryLabel: { color: colors.gray500 },
    summaryValue: { color: colors.gray900 },

    // Section header
    sectionIconContainer: { backgroundColor: colors.primaryBg },
    sectionHeaderTitle: { color: colors.gray900 },
    sectionHeaderDescription: { color: colors.gray500 },
    sectionDivider: { borderTopColor: colors.gray200 },

    // Advanced toggle
    advancedToggle: { backgroundColor: colors.gray50, borderColor: colors.gray200 },
    advancedToggleText: { color: colors.gray700 },
  }), [colors]);
}
