/**
 * Tests de performance — composants critiques en boucle.
 *
 * Mesure le rendu de N instances pour detecter les regressions sur les
 * composants qui apparaissent dans les longues listes (FlatList).
 *
 * - EventCard x 50 (Discover, Following, MyEvents, ...)
 * - MessageBubble x 50 (ConversationScreen FlatList inversee)
 * - CategoryCard x 30 (Discover horizontal scroll)
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// ── Theme (utilise par tous les composants) ──────────────────────
const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  success: '#10B981',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../api', () => ({
  __esModule: true,
  getMediaUrl: (u: string) => u,
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

// ── EventCard (utilise AnimatedBookmark + AnimatedPressable) ──
import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';
// Import direct (pas l'index) pour eviter de pull conversationExport / expo-file-system/legacy
// qui n'est pas transformable par Jest (export ESM dans .ts)
import MessageBubble from '../../components/messages/MessageBubble';

// Warmup global : compile tous les modules avant la 1ere mesure
// (sinon le 1er render absorbe ~2s de Babel transform).
beforeAll(() => {
  render(
    <EventCard
      id="warmup"
      title="warmup"
      date="2026-01-01T00:00:00Z"
      location="x"
    />
  );
  render(<CategoryCard id="warmup" name="warmup" />);
  render(
    <MessageBubble
      message={{
        id: 'warmup',
        conversation: 'c',
        sender: { id: 1, email: 'a@b.com' },
        content: 'x',
        message_type: 'text',
        created_at: '2026-01-01T00:00:00Z',
        is_read: false,
        is_edited: false,
        is_deleted: false,
        attachments: [],
        reactions: [],
      } as any}
      isMine={true}
      onLongPress={() => {}}
    />
  );
});

describe('EventCard rendering performance', () => {
  it('renders 50 cards in less than 1500ms', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      title: `Festival Indie ${i}`,
      date: '2026-09-01T19:00:00Z',
      time: '19:00',
      location: `Douala #${i}`,
      imageUrl: `https://example.com/event-${i}.jpg`,
      category: 'Musique',
      price: i % 2 === 0 ? 5000 : 'Gratuit',
      attendees: 100 + i,
      isFree: i % 3 === 0,
      isLiked: i % 5 === 0,
      isFeatured: i % 10 === 0,
      locationType: 'in_person' as const,
      eventType: 'billetterie' as const,
      currency: 'XAF',
    }));

    const start = performance.now();
    items.forEach((item) => render(<EventCard {...item} />));
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] EventCard x 50: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(1500);
  });

  it('renders 50 featured cards in less than 1500ms', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      title: `Featured ${i}`,
      date: '2026-09-01T19:00:00Z',
      location: 'Douala',
      imageUrl: 'https://example.com/x.jpg',
      variant: 'featured' as const,
    }));

    const start = performance.now();
    items.forEach((item) => render(<EventCard {...item} />));
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] EventCard featured x 50: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(1500);
  });
});

describe('CategoryCard rendering performance', () => {
  it('renders 30 cards in less than 1000ms', () => {
    const cats = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `Categorie ${i}`,
      icon: 'musical-notes',
      color: '#4F46E5',
      eventCount: i + 1,
    }));

    const start = performance.now();
    cats.forEach((cat) => render(<CategoryCard {...cat} />));
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] CategoryCard x 30: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('MessageBubble rendering performance', () => {
  const noop = () => {};

  it('renders 50 text bubbles in less than 2000ms', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      conversation: 'conv-1',
      sender: {
        id: i % 2 === 0 ? 1 : 2,
        first_name: i % 2 === 0 ? 'Alice' : 'Bob',
        last_name: 'Doe',
        email: 'a@b.com',
      },
      content: `Hello world from message ${i}`,
      message_type: 'text',
      created_at: '2026-05-04T10:00:00Z',
      is_read: i % 3 === 0,
      is_edited: false,
      is_deleted: false,
      attachments: [],
      reactions: [],
    }));

    const start = performance.now();
    messages.forEach((m) =>
      render(
        <MessageBubble
          message={m as any}
          isMine={m.sender.id === 1}
          onLongPress={noop}
        />
      )
    );
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MessageBubble x 50: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });

  it('renders 50 grouped bubbles in less than 2000ms', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      conversation: 'conv-1',
      sender: { id: 1, first_name: 'Alice', email: 'a@b.com' },
      content: `Grouped ${i}`,
      message_type: 'text',
      created_at: '2026-05-04T10:00:00Z',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      attachments: [],
      reactions: [],
    }));

    const start = performance.now();
    messages.forEach((m) =>
      render(
        <MessageBubble
          message={m as any}
          isMine={true}
          isGrouped={true}
          onLongPress={noop}
        />
      )
    );
    const elapsed = performance.now() - start;

    // eslint-disable-next-line no-console
    console.log(`[perf] MessageBubble grouped x 50: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });
});
