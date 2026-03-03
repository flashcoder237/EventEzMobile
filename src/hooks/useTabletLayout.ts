import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Spacing } from '../constants/theme';

interface TabletLayout {
  isTablet: boolean;
  columns: number;
  padding: number;
  cardGap: number;
}

export function useTabletLayout(): TabletLayout {
  const [layout, setLayout] = useState<TabletLayout>(() => computeLayout());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setLayout(computeLayout());
    });
    return () => subscription.remove();
  }, []);

  return layout;
}

function computeLayout(): TabletLayout {
  const { width, height } = Dimensions.get('window');
  const minDim = Math.min(width, height);
  const isTablet = minDim >= 600;

  return {
    isTablet,
    columns: isTablet ? 2 : 1,
    padding: isTablet ? Spacing.xl : Spacing.base,
    cardGap: isTablet ? Spacing.base : Spacing.md,
  };
}
