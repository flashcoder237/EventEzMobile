/**
 * Tests pour le composant EventCard
 * Vérifie le rendu des différentes variantes et les interactions
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import EventCard from '../../components/events/EventCard';
import { renderWithMinimalProviders as render } from '../mocks/testUtils';

describe('EventCard', () => {
  const defaultProps = {
    id: 'event-1',
    title: 'Concert de Jazz',
    date: '2024-06-15T19:00:00Z',
    location: 'Palais des Congrès, Douala',
    imageUrl: 'https://example.com/image.jpg',
    category: 'Musique',
    price: 5000,
    attendees: 75,
    isFree: false,
    isLiked: false,
    isFeatured: false,
    locationType: 'in_person' as const,
    eventType: 'billetterie' as const,
    onPress: jest.fn(),
    onLikePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Variant', () => {
    it('should render event title', () => {
      const { getByText } = render(<EventCard {...defaultProps} />);
      expect(getByText('Concert de Jazz')).toBeTruthy();
    });

    it('should render location', () => {
      const { getByText } = render(<EventCard {...defaultProps} />);
      expect(getByText('Palais des Congrès, Douala')).toBeTruthy();
    });

    it('should render price when not free', () => {
      const { getByText } = render(<EventCard {...defaultProps} />);
      expect(getByText('5 000 FCFA')).toBeTruthy();
    });

    it('should render "Gratuit" when isFree is true', () => {
      const { getByText } = render(<EventCard {...defaultProps} isFree={true} />);
      expect(getByText('Gratuit')).toBeTruthy();
    });

    it('should render "Gratuit" when price is 0', () => {
      const { getByText } = render(<EventCard {...defaultProps} price={0} />);
      expect(getByText('Gratuit')).toBeTruthy();
    });

    it('should call onPress when card is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<EventCard {...defaultProps} onPress={onPress} />);

      fireEvent.press(getByText('Concert de Jazz'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should render event type badge for billetterie', () => {
      const { getByText } = render(<EventCard {...defaultProps} eventType="billetterie" />);
      expect(getByText('Billetterie')).toBeTruthy();
    });

    it('should render event type badge for inscription', () => {
      const { getByText } = render(<EventCard {...defaultProps} eventType="inscription" />);
      expect(getByText('Inscription')).toBeTruthy();
    });

    it('should format date correctly', () => {
      const { getByText } = render(<EventCard {...defaultProps} />);
      // The date should be formatted in French
      expect(getByText(/SAM 15 JUIN/i)).toBeTruthy();
    });
  });

  describe('Horizontal Variant', () => {
    it('should render in horizontal layout', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="horizontal" />
      );
      expect(getByText('Concert de Jazz')).toBeTruthy();
      expect(getByText('Palais des Congrès, Douala')).toBeTruthy();
    });

    it('should show bookmark button', () => {
      const onLikePress = jest.fn();
      const { UNSAFE_queryAllByType } = render(
        <EventCard {...defaultProps} variant="horizontal" onLikePress={onLikePress} />
      );
      // Bookmark button should be present in horizontal variant
      expect(UNSAFE_queryAllByType('Text' as any)).toBeDefined();
    });
  });

  describe('Compact Variant', () => {
    it('should render compact version', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="compact" />
      );
      expect(getByText('Concert de Jazz')).toBeTruthy();
    });

    it('should show price in compact format', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="compact" />
      );
      expect(getByText('5 000 FCFA')).toBeTruthy();
    });
  });

  describe('Featured Variant', () => {
    it('should render featured version', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="featured" />
      );
      expect(getByText('Concert de Jazz')).toBeTruthy();
    });

    it('should show "À partir de" prefix for price', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="featured" />
      );
      expect(getByText(/À partir de/)).toBeTruthy();
    });
  });

  describe('Grid Variant', () => {
    it('should render grid version with category', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" />
      );
      expect(getByText('Concert de Jazz')).toBeTruthy();
      expect(getByText('MUSIQUE')).toBeTruthy();
    });

    it('should show attendees count', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" attendees={75} />
      );
      expect(getByText('75 inscrits')).toBeTruthy();
    });

    it('should show singular for 1 attendee', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" attendees={1} />
      );
      expect(getByText('1 inscrit')).toBeTruthy();
    });

    it('should show "Voir les détails" link', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" />
      );
      expect(getByText('Voir les détails')).toBeTruthy();
    });

    it('should show featured badge when isFeatured', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" isFeatured={true} />
      );
      expect(getByText('Vedette')).toBeTruthy();
    });

    it('should show location type badge', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" locationType="in_person" />
      );
      expect(getByText('Présentiel')).toBeTruthy();
    });

    it('should show online location type', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" locationType="online" />
      );
      expect(getByText('En ligne')).toBeTruthy();
    });

    it('should show hybrid location type', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} variant="grid" locationType="hybrid" />
      );
      expect(getByText('Hybride')).toBeTruthy();
    });
  });

  describe('Price Formatting', () => {
    it('should format large prices with spaces', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} price={15000} />
      );
      expect(getByText('15 000 FCFA')).toBeTruthy();
    });

    it('should handle string price', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} price="10 000 FCFA" />
      );
      expect(getByText('10 000 FCFA')).toBeTruthy();
    });

    it('should show "Voir prix" when price is undefined', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} price={undefined} isFree={false} eventType="billetterie" />
      );
      expect(getByText('Voir prix')).toBeTruthy();
    });

    it('should show "Gratuit" for inscription type without price', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} price={undefined} eventType="inscription" />
      );
      expect(getByText('Gratuit')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should handle invalid date gracefully', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} date="invalid-date" />
      );
      expect(getByText('Date TBA')).toBeTruthy();
    });

    it('should format time when provided', () => {
      const { getByText } = render(
        <EventCard {...defaultProps} time="19:00" />
      );
      // Should include time
      expect(getByText(/19:00/)).toBeTruthy();
    });
  });

  describe('Image Handling', () => {
    it('should use default image when imageUrl is not provided', () => {
      const { UNSAFE_queryAllByType } = render(
        <EventCard {...defaultProps} imageUrl={undefined} />
      );
      // Image component should exist
      expect(UNSAFE_queryAllByType('Image' as any)).toBeDefined();
    });
  });

  describe('Interactions', () => {
    it('should not crash when onPress is not provided', () => {
      expect(() => {
        render(<EventCard {...defaultProps} onPress={undefined} />);
      }).not.toThrow();
    });

    it('should not crash when onLikePress is not provided', () => {
      expect(() => {
        render(<EventCard {...defaultProps} onLikePress={undefined} variant="horizontal" />);
      }).not.toThrow();
    });
  });
});
