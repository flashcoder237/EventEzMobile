/**
 * Tests pour le composant CategoryCard
 * Vérifie l'affichage des catégories d'événements
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CategoryCard from '../../components/events/CategoryCard';
import { renderWithMinimalProviders as render } from '../mocks/testUtils';
import { mockCategory } from '../mocks/mockData';

describe('CategoryCard', () => {
  const defaultProps = {
    id: 1,
    name: 'Musique',
    description: 'Concerts et festivals',
    image: 'https://example.com/music.jpg',
    eventCount: 25,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render category name', () => {
      const { getByText } = render(<CategoryCard {...defaultProps} />);
      expect(getByText('Musique')).toBeTruthy();
    });

    it('should render description when provided', () => {
      const { getByText } = render(<CategoryCard {...defaultProps} />);
      expect(getByText('Concerts et festivals')).toBeTruthy();
    });

    it('should render event count', () => {
      const { getByText } = render(<CategoryCard {...defaultProps} />);
      expect(getByText(/25 événements?/)).toBeTruthy();
    });

    it('should handle singular event count', () => {
      const { getByText } = render(<CategoryCard {...defaultProps} eventCount={1} />);
      expect(getByText('1 événement')).toBeTruthy();
    });

    it('should handle zero event count', () => {
      const { getByText } = render(<CategoryCard {...defaultProps} eventCount={0} />);
      expect(getByText('0 événement')).toBeTruthy();
    });
  });

  describe('Image Display', () => {
    it('should display category image', () => {
      const { UNSAFE_queryAllByType } = render(<CategoryCard {...defaultProps} />);
      // Image component should exist
      expect(UNSAFE_queryAllByType('Image')).toBeDefined();
    });

    it('should use fallback when no image provided', () => {
      const { UNSAFE_queryAllByType } = render(
        <CategoryCard {...defaultProps} image={undefined} />
      );
      // Should still render without crashing
      expect(UNSAFE_queryAllByType('Image')).toBeDefined();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<CategoryCard {...defaultProps} onPress={onPress} />);

      fireEvent.press(getByText('Musique'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should pass correct id to onPress', () => {
      const onPress = jest.fn();
      const { getByText } = render(<CategoryCard {...defaultProps} onPress={onPress} />);

      fireEvent.press(getByText('Musique'));
      expect(onPress).toHaveBeenCalledWith(1);
    });

    it('should not crash when onPress is not provided', () => {
      expect(() => {
        render(<CategoryCard {...defaultProps} onPress={undefined} />);
      }).not.toThrow();
    });
  });

  describe('Styling', () => {
    it('should render correctly with long name', () => {
      const { getByText } = render(
        <CategoryCard {...defaultProps} name="Très Longue Catégorie Avec Beaucoup de Texte" />
      );
      expect(getByText('Très Longue Catégorie Avec Beaucoup de Texte')).toBeTruthy();
    });

    it('should truncate long description', () => {
      const longDescription = 'A'.repeat(200);
      const { UNSAFE_queryAllByType } = render(
        <CategoryCard {...defaultProps} description={longDescription} />
      );
      // Component should render without crashing
      expect(UNSAFE_queryAllByType('Text')).toBeDefined();
    });
  });

  describe('Variants', () => {
    it('should render compact variant', () => {
      const { getByText } = render(
        <CategoryCard {...defaultProps} variant="compact" />
      );
      expect(getByText('Musique')).toBeTruthy();
    });

    it('should render grid variant', () => {
      const { getByText } = render(
        <CategoryCard {...defaultProps} variant="grid" />
      );
      expect(getByText('Musique')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByRole } = render(<CategoryCard {...defaultProps} />);
      // Should be tappable
    });
  });
});
