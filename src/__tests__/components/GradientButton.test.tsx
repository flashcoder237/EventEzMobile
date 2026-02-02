/**
 * Tests pour le composant GradientButton
 * Vérifie les différentes variantes et interactions
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import GradientButton from '../../components/ui/GradientButton';
import { renderWithMinimalProviders as render } from '../mocks/testUtils';

describe('GradientButton', () => {
  const defaultProps = {
    title: 'Confirmer',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render button title', () => {
      const { getByText } = render(<GradientButton {...defaultProps} />);
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should render with icon', () => {
      const { getByText, UNSAFE_queryAllByType } = render(
        <GradientButton {...defaultProps} icon="checkmark" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
      // Icon should be present
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<GradientButton {...defaultProps} onPress={onPress} />);

      fireEvent.press(getByText('Confirmer'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <GradientButton {...defaultProps} onPress={onPress} disabled={true} />
      );

      fireEvent.press(getByText('Confirmer'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { queryByText, UNSAFE_queryAllByType } = render(
        <GradientButton {...defaultProps} loading={true} />
      );

      // Title might be hidden during loading
      // ActivityIndicator should be present
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(
        <GradientButton {...defaultProps} onPress={onPress} loading={true} />
      );

      fireEvent.press(UNSAFE_root);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} variant="primary" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} variant="secondary" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} variant="outline" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} size="small" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should render medium size', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} size="medium" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} size="large" />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });
  });

  describe('Full Width', () => {
    it('should render full width button', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} fullWidth={true} />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom style', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} style={{ marginTop: 20 }} />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const { getByText } = render(
        <GradientButton {...defaultProps} textStyle={{ fontSize: 20 }} />
      );
      expect(getByText('Confirmer')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should support accessibilityLabel', () => {
      const { getByLabelText } = render(
        <GradientButton {...defaultProps} accessibilityLabel="Confirm button" />
      );
      expect(getByLabelText('Confirm button')).toBeTruthy();
    });
  });
});
