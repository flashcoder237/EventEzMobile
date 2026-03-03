import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface RegistrationSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

function RegistrationSearchBar({ onSearch, placeholder = 'Rechercher un participant...' }: RegistrationSearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(text), 300);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
      <Ionicons name="search-outline" size={18} color={colors.gray400} />
      <TextInput
        style={[styles.input, { color: colors.gray900 }]}
        value={query}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={colors.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default memo(RegistrationSearchBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },
});
