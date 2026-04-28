import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../ui/AnimatedPressable';
import { AnimatedBookmark } from '../ui/Animations';
import {
  formatCardPrice,
  formatPriceShort,
} from '../../lib/utils/eventCardFormatters';
import { getMediaUrl } from '../../api';
import { DEFAULT_BLUR_DATA_URL } from '../../utils/imageUtils';
import {
  Colors,
  FontFamily,
  FontSizes,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_EVENT_IMAGE = require('../../../assets/defaults/default-event.png');

const MONTHS_FR = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function splitDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { day: '--', month: '---' };
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS_FR[d.getMonth()],
  };
}

function daysUntil(iso: string): number | null {
  try {
    const now = new Date();
    const target = new Date(iso);
    if (isNaN(target.getTime())) return null;
    const ms = target.getTime() - now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
}

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  imageUrl?: string;
  imagePlaceholder?: string;
  category?: string;
  price?: string | number;
  priceMax?: number;
  attendees?: number;
  isFree?: boolean;
  isLiked?: boolean;
  isFeatured?: boolean;
  locationType?: 'in_person' | 'online' | 'hybrid';
  eventType?: 'billetterie' | 'inscription';
  currency?: string;
  variant?: 'default' | 'featured' | 'horizontal' | 'compact' | 'grid';
  fullWidth?: boolean;
  onPress?: () => void;
  onLikePress?: () => void;
}

function EventCard({
  id,
  title,
  date,
  time,
  location,
  imageUrl,
  imagePlaceholder,
  category,
  price,
  priceMax,
  attendees,
  isFree = false,
  isLiked = false,
  isFeatured = false,
  locationType = 'in_person',
  eventType,
  currency = 'FCFA',
  variant = 'default',
  fullWidth = false,
  onPress,
  onLikePress,
}: EventCardProps) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const resolvedImageUrl = getMediaUrl(imageUrl);
  const blurPlaceholder = imagePlaceholder || DEFAULT_BLUR_DATA_URL;

  // === Derived values ===
  const priceParams = { isFree, price, priceMax, currency, eventType };
  const cardPriceText = formatCardPrice(priceParams);
  const shortPriceText = formatPriceShort(priceParams);
  const { day, month } = splitDate(date);
  const dUntil = daysUntil(date);
  const isSoon = dUntil !== null && dUntil <= 7;

  const isGratuit = isFree || cardPriceText === 'Gratuit';
  const cardShadow = isDark ? Shadows.md : Shadows.cardViolet;
  const eventAccessibilityLabel = `${title}, ${day} ${month}, ${location}`;
  const eventAccessibilityHint = "Appuyez pour voir les détails de l'événement";

  const locIcon: keyof typeof Ionicons.glyphMap =
    locationType === 'online' ? 'videocam-outline' :
    locationType === 'hybrid' ? 'globe-outline' : 'location-outline';

  // ============================================================
  // HORIZONTAL VARIANT — list item with date tile + body + bookmark
  // ============================================================
  if (variant === 'horizontal') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.horizontalCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={eventAccessibilityLabel}
        accessibilityHint={eventAccessibilityHint}
      >
        {/* Image with floating date tile */}
        <View style={styles.horizontalImageWrap}>
          <ExpoImage
            source={resolvedImageUrl ? { uri: resolvedImageUrl } : DEFAULT_EVENT_IMAGE}
            placeholder={blurPlaceholder}
            placeholderContentFit="cover"
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            style={[styles.horizontalImage, { backgroundColor: colors.gray100 }]}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.dateTileFloat, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.dateTileDay, { color: colors.text }]}>{day}</Text>
            <Text style={[styles.dateTileMonth, { color: colors.accent }]}>{month}</Text>
          </View>
        </View>

        <View style={styles.horizontalBody}>
          {category && (
            <View style={[styles.eyebrowPill, { backgroundColor: `${colors.accent}15` }]}>
              <Text style={[styles.eyebrowText, { color: colors.accent }]} numberOfLines={1}>
                {category.toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.horizontalTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={locIcon} size={11} color={colors.gray500} />
            <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
          <View style={styles.horizontalFooter}>
            {isGratuit ? (
              <View style={[styles.pricePillFree, { backgroundColor: '#10B98115' }]}>
                <Text style={styles.pricePillFreeText}>GRATUIT</Text>
              </View>
            ) : (
              <Text style={[styles.priceTextE, { color: colors.text }]}>{shortPriceText}</Text>
            )}
            {isSoon && dUntil !== null && (
              <View style={[styles.urgentPill, { backgroundColor: `${colors.accent}15` }]}>
                <Text style={[styles.urgentPillText, { color: colors.accent }]}>
                  {dUntil === 0 ? 'AUJOURD\'HUI' : dUntil === 1 ? 'DEMAIN' : `J−${dUntil}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={onLikePress}
          style={[styles.bookmarkSideBtn, { backgroundColor: colors.gray100 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedBookmark isActive={isLiked}>
            <Ionicons
              name={isLiked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isLiked ? colors.primary : colors.gray500}
            />
          </AnimatedBookmark>
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  // ============================================================
  // COMPACT VARIANT — small card 2-col
  // ============================================================
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.compactCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={eventAccessibilityLabel}
        accessibilityHint={eventAccessibilityHint}
      >
        <View style={styles.compactImageWrap}>
          <ExpoImage
            source={resolvedImageUrl ? { uri: resolvedImageUrl } : DEFAULT_EVENT_IMAGE}
            placeholder={blurPlaceholder}
            placeholderContentFit="cover"
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            style={[styles.compactImage, { backgroundColor: colors.gray100 }]}
          />
          <View style={[styles.dateTileFloatSmall, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.dateTileDaySmall, { color: colors.text }]}>{day}</Text>
            <Text style={[styles.dateTileMonthSmall, { color: colors.accent }]}>{month}</Text>
          </View>
        </View>
        <View style={styles.compactBody}>
          {category && (
            <Text style={[styles.compactEyebrow, { color: colors.accent }]} numberOfLines={1}>
              {category.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.compactFooter}>
            {isGratuit ? (
              <Text style={[styles.compactPriceFree, { color: '#10B981' }]}>GRATUIT</Text>
            ) : (
              <Text style={[styles.compactPrice, { color: colors.text }]} numberOfLines={1}>
                {shortPriceText}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ============================================================
  // FEATURED VARIANT — large hero card
  // ============================================================
  if (variant === 'featured') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.featuredCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.lg,
        ]}
        animationType="editorial"
        haptic="light"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={eventAccessibilityLabel}
        accessibilityHint={eventAccessibilityHint}
      >
        <View style={styles.featuredImageContainer}>
          <ExpoImage
            source={resolvedImageUrl ? { uri: resolvedImageUrl } : DEFAULT_EVENT_IMAGE}
            placeholder={blurPlaceholder}
            placeholderContentFit="cover"
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            style={[styles.featuredImage, { backgroundColor: colors.gray100 }]}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Top-left: featured pill */}
          {isFeatured && (
            <View style={[styles.featuredEyebrowPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <Ionicons name="star" size={10} color={colors.accent} />
              <Text style={[styles.featuredEyebrowText, { color: colors.text }]}>EN VEDETTE</Text>
            </View>
          )}

          {/* Top-right: bookmark disc */}
          <TouchableOpacity
            onPress={onLikePress}
            style={[styles.featuredBookmarkDisc, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AnimatedBookmark isActive={isLiked}>
              <Ionicons
                name={isLiked ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isLiked ? colors.accent : colors.text}
              />
            </AnimatedBookmark>
          </TouchableOpacity>

          {/* Title overlay */}
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitleOverlay} numberOfLines={2}>{title}</Text>
            {category && (
              <Text style={styles.featuredCategoryOverlay} numberOfLines={1}>
                {category}
              </Text>
            )}
          </View>
        </View>

        {/* Footer: date tile + meta + price */}
        <View style={styles.featuredFooter}>
          <View style={[styles.dateTileSolid, { backgroundColor: `${colors.accent}15` }]}>
            <Text style={[styles.dateTileDay, { color: colors.text }]}>{day}</Text>
            <Text style={[styles.dateTileMonth, { color: colors.accent }]}>{month}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.metaRow}>
              <Ionicons name={locIcon} size={11} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>
                {location}
              </Text>
            </View>
            {attendees != null && attendees > 0 && (
              <View style={[styles.metaRow, { marginTop: 4 }]}>
                <Ionicons name="people-outline" size={11} color={colors.gray500} />
                <Text style={[styles.metaText, { color: colors.gray500 }]}>
                  {attendees} inscrit{attendees > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          {isGratuit ? (
            <View style={[styles.pricePillFree, { backgroundColor: '#10B98115' }]}>
              <Text style={styles.pricePillFreeText}>GRATUIT</Text>
            </View>
          ) : (
            <View style={[styles.pricePillPaid, { backgroundColor: colors.text }]}>
              <Text style={styles.pricePillPaidText} numberOfLines={1}>{shortPriceText}</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  // ============================================================
  // GRID VARIANT — masonry/2-col tile
  // ============================================================
  if (variant === 'grid') {
    return (
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.gridCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
        animationType="both"
        scaleValue={0.98}
        haptic="light"
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={eventAccessibilityLabel}
        accessibilityHint={eventAccessibilityHint}
      >
        <View style={styles.gridImageWrap}>
          <ExpoImage
            source={resolvedImageUrl ? { uri: resolvedImageUrl } : DEFAULT_EVENT_IMAGE}
            placeholder={blurPlaceholder}
            placeholderContentFit="cover"
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            style={[styles.gridImage, { backgroundColor: colors.gray100 }]}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.dateTileFloatSmall, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.dateTileDaySmall, { color: colors.text }]}>{day}</Text>
            <Text style={[styles.dateTileMonthSmall, { color: colors.accent }]}>{month}</Text>
          </View>
          <TouchableOpacity
            onPress={onLikePress}
            style={[styles.gridBookmark, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AnimatedBookmark isActive={isLiked}>
              <Ionicons
                name={isLiked ? 'bookmark' : 'bookmark-outline'}
                size={14}
                color={isLiked ? colors.accent : colors.text}
              />
            </AnimatedBookmark>
          </TouchableOpacity>
        </View>
        <View style={styles.gridBody}>
          {category && (
            <Text style={[styles.compactEyebrow, { color: colors.accent }]} numberOfLines={1}>
              {category.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={locIcon} size={10} color={colors.gray500} />
            <Text style={[styles.gridMetaText, { color: colors.gray500 }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
          <View style={styles.gridFooter}>
            {isGratuit ? (
              <Text style={[styles.compactPriceFree, { color: '#10B981' }]}>GRATUIT</Text>
            ) : (
              <Text style={[styles.gridPrice, { color: colors.text }]} numberOfLines={1}>
                {shortPriceText}
              </Text>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ============================================================
  // DEFAULT VARIANT — standard editorial card
  // ============================================================
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.defaultCard,
        fullWidth && { width: '100%' },
        { backgroundColor: colors.card, borderColor: hairline },
        Shadows.lg,
      ]}
      animationType="both"
      scaleValue={0.97}
      haptic="light"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={eventAccessibilityLabel}
      accessibilityHint={eventAccessibilityHint}
    >
      <View style={styles.defaultImageWrap}>
        <ExpoImage
          source={resolvedImageUrl ? { uri: resolvedImageUrl } : DEFAULT_EVENT_IMAGE}
          placeholder={blurPlaceholder}
          placeholderContentFit="cover"
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          style={[styles.defaultImage, { backgroundColor: colors.gray100 }]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Top-left: category eyebrow OR featured */}
        {isFeatured ? (
          <View style={[styles.eyebrowPillFloat, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Ionicons name="star" size={10} color={colors.accent} />
            <Text style={[styles.eyebrowFloatText, { color: colors.text }]}>EN VEDETTE</Text>
          </View>
        ) : category ? (
          <View style={[styles.eyebrowPillFloat, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.eyebrowFloatText, { color: colors.text }]} numberOfLines={1}>
              {category.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {/* Top-right: bookmark disc */}
        <TouchableOpacity
          onPress={onLikePress}
          style={[styles.defaultBookmarkDisc, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedBookmark isActive={isLiked}>
            <Ionicons
              name={isLiked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isLiked ? colors.accent : colors.text}
            />
          </AnimatedBookmark>
        </TouchableOpacity>

        {/* Title overlay (display extra bold white) */}
        <View style={styles.defaultOverlay}>
          <Text style={styles.defaultTitleOverlay} numberOfLines={2}>{title}</Text>
        </View>
      </View>

      {/* Footer: date tile + meta + price */}
      <View style={styles.defaultFooter}>
        <View style={[styles.dateTileSolid, { backgroundColor: `${colors.accent}15` }]}>
          <Text style={[styles.dateTileDay, { color: colors.text }]}>{day}</Text>
          <Text style={[styles.dateTileMonth, { color: colors.accent }]}>{month}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.metaRow}>
            <Ionicons name={locIcon} size={11} color={colors.gray500} />
            <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
          {isSoon && dUntil !== null && (
            <View style={[styles.urgentPillInline, { marginTop: 4 }]}>
              <View style={[styles.urgentDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.urgentPillText, { color: colors.accent }]}>
                {dUntil === 0 ? 'AUJOURD\'HUI' : dUntil === 1 ? 'DEMAIN' : `J−${dUntil}`}
              </Text>
            </View>
          )}
        </View>
        {isGratuit ? (
          <View style={[styles.pricePillFree, { backgroundColor: '#10B98115' }]}>
            <Text style={styles.pricePillFreeText}>GRATUIT</Text>
          </View>
        ) : (
          <View style={[styles.pricePillPaid, { backgroundColor: colors.text }]}>
            <Text style={styles.pricePillPaidText} numberOfLines={1}>{shortPriceText}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // === SHARED ATOMS ===
  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eyebrowPillFloat: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  eyebrowFloatText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    maxWidth: 140,
  },

  // Date tile (floating on image OR solid in footer)
  dateTileFloat: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dateTileFloatSmall: {
    position: 'absolute',
    top: 10,
    left: 10,
    minWidth: 42,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  dateTileSolid: {
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dateTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -0.7,
  },
  dateTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  dateTileDaySmall: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  dateTileMonthSmall: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 1,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
    flex: 1,
  },

  // Price pills
  pricePillFree: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pricePillFreeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#059669',
    letterSpacing: 1,
  },
  pricePillPaid: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    maxWidth: 110,
  },
  pricePillPaidText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  priceTextE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
  },

  // Urgency pill (J-x)
  urgentPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentPillInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  urgentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgentPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },

  // ============================================================
  // DEFAULT CARD (large, image hero with overlays + footer)
  // ============================================================
  defaultCard: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  defaultImageWrap: {
    height: 220,
    position: 'relative',
  },
  defaultImage: {
    width: '100%',
    height: '100%',
  },
  defaultBookmarkDisc: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  defaultTitleOverlay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    color: Colors.white,
  },
  defaultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 0,
  },

  // ============================================================
  // HORIZONTAL CARD (list item with image left + body + bookmark right)
  // ============================================================
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 140,
  },
  horizontalImageWrap: {
    width: 130,
    position: 'relative',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalBody: {
    flex: 1,
    padding: Spacing.sm + 2,
    justifyContent: 'center',
    gap: 4,
  },
  horizontalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
    marginTop: 2,
  },
  horizontalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  bookmarkSideBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: Spacing.sm,
  },

  // ============================================================
  // COMPACT CARD (small 2-col tile)
  // ============================================================
  compactCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactImageWrap: {
    height: 110,
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactBody: {
    padding: Spacing.sm,
    gap: 4,
  },
  compactEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  compactTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  compactFooter: {
    marginTop: 2,
  },
  compactPrice: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 13,
    letterSpacing: -0.3,
  },
  compactPriceFree: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },

  // ============================================================
  // FEATURED CARD (large hero with overlays + rich footer)
  // ============================================================
  featuredCard: {
    width: SCREEN_WIDTH * 0.88,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    height: 280,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredEyebrowPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  featuredEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  featuredBookmarkDisc: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  featuredTitleOverlay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 30,
    color: Colors.white,
    marginBottom: 4,
  },
  featuredCategoryOverlay: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },

  // ============================================================
  // GRID CARD (2-col masonry with floating overlays)
  // ============================================================
  gridCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  gridImageWrap: {
    height: 150,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBookmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBody: {
    padding: Spacing.sm + 2,
    gap: 4,
  },
  gridTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
    marginTop: 2,
  },
  gridMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
    flex: 1,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridPrice: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
  },
});

export default memo(EventCard);
