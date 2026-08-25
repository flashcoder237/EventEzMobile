import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useOrganizerWallet } from '../../hooks/useOrganizerWallet';
import { useTicketPriceCap } from '../../hooks/useTicketPriceCap';
import { Spacing, FontFamily } from '../../constants/theme';
import { LocationType } from '../../types';
import { TicketTypeForm, FormFieldForm, FIELD_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import AIAssistButton from '../events/AIAssistButton';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';
import { displayCurrency } from '../../lib/utils/priceFormatters';

// ============================================
// Props
// ============================================

interface EventStep3PricingProps {
  /** Erreurs de niveau LISTE (aucun billet, aucun champ). */
  stepErrors?: Record<string, string>;
  /** Erreur de validation par INDEX de billet — rendue sur la carte concernée. */
  ticketErrors?: Record<number, string>;
  /** Erreur de validation par INDEX de champ du formulaire personnalisé. */
  fieldErrors?: Record<number, string>;
  // Core state
  eventType: 'billetterie' | 'inscription';
  isFree: boolean;
  maxParticipants: string;
  autoApproveRegistrations: boolean;
  feeBearer: 'participant' | 'organizer';
  startDate: Date;

  // Ticket types (billetterie)
  ticketTypes: TicketTypeForm[];
  showFormFieldsForBilletterie: boolean;
  attendeeFormScope: 'order' | 'per_attendee';
  onAttendeeFormScopeChange: (value: 'order' | 'per_attendee') => void;

  // Form fields (inscription or optional billetterie)
  formFields: FormFieldForm[];

  // Summary data
  title: string;
  locationType: LocationType;
  locationCity: string;
  formatDate: (date: Date) => string;

  // AI
  aiEnabled: boolean;
  aiPricingLoading: boolean;

  // Ticket handlers
  onIsFreeChange: (value: boolean) => void;
  onMaxParticipantsChange: (value: string) => void;
  onAutoApproveChange: (value: boolean) => void;
  onFeeBearerChange: (value: 'participant' | 'organizer') => void;
  onAddTicketType: () => void;
  onUpdateTicketType: (index: number, field: string, value: any) => void;
  onRemoveTicketType: (index: number) => void;

  // Form field handlers
  onAddFormField: () => void;
  onUpdateFormField: (index: number, field: string, value: any) => void;
  onRemoveFormField: (index: number) => void;
  onShowFormFieldsForBilletterieChange: (value: boolean) => void;
  onSetFormFields: (value: FormFieldForm[]) => void;

  // AI handler
  onSuggestPricing: () => void;
}

// ============================================
// Form Fields Section (shared between billetterie and inscription)
// ============================================

function FormFieldsSection({
  formFields,
  isOptional,
  onAddFormField,
  onUpdateFormField,
  onRemoveFormField,
  fieldErrors = {},
  listError,
}: {
  formFields: FormFieldForm[];
  isOptional: boolean;
  onAddFormField: () => void;
  onUpdateFormField: (index: number, field: string, value: any) => void;
  onRemoveFormField: (index: number) => void;
  /** Erreur de validation par INDEX de champ. */
  fieldErrors?: Record<number, string>;
  /** Erreur de niveau liste (ex. « au moins un champ requis »). */
  listError?: string;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  if (formFields.length === 0) {
    return (
      <View style={[styles.emptyContainer, themed.emptyContainer]}>
        <View style={[styles.emptyIcon, themed.emptyIcon]}>
          <Ionicons name="document-text-outline" size={40} color={colors.gray400} />
        </View>
        <Text style={[styles.emptyTitle, themed.emptyTitle]}>
          {isOptional ? t('componentsOrganizer.step3.noFieldsOptional') : t('componentsOrganizer.step3.noFieldsRequired')}
        </Text>
        <Text style={[styles.emptyText, themed.emptyText]}>
          {isOptional
            ? t('componentsOrganizer.step3.noFieldsOptionalText')
            : t('componentsOrganizer.step3.noFieldsRequiredText')}
        </Text>
        {!!listError && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>{listError}</Text>
        )}
        <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddFormField}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={[styles.addButtonText, themed.addButtonText]}>{t('componentsOrganizer.step3.addField')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {formFields.map((field, index) => (
        <View
          key={index}
          style={[
            styles.card,
            themed.card,
            // La carte fautive se signale elle-même : une modale ne pouvait pas
            // désigner la ligne, d'où les messages du type « champ n°2 ».
            fieldErrors[index] && { borderColor: '#EF4444', borderWidth: 1.5 },
          ]}
        >
          <View style={[styles.cardHeader, themed.cardHeader]}>
            <Text style={[styles.cardTitle, themed.cardTitle]}>{t('componentsOrganizer.step3.fieldIndex', { index: index + 1 })}</Text>
            <TouchableOpacity onPress={() => onRemoveFormField(index)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
          {!!fieldErrors[index] && (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
              {fieldErrors[index]}
            </Text>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.fieldLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.label}
              onChangeText={(value) => onUpdateFormField(index, 'label', value)}
              placeholder={t('componentsOrganizer.step3.fieldLabelPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.fieldTypeLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {FIELD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.chip, themed.chip,
                      field.field_type === type.value && [styles.chipActive, themed.chipActive],
                    ]}
                    onPress={() => onUpdateFormField(index, 'field_type', type.value)}
                  >
                    <Text
                      style={[
                        styles.chipText, themed.chipText,
                        field.field_type === type.value && [styles.chipTextActive, themed.chipTextActive],
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.placeholderLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.placeholder}
              onChangeText={(value) => onUpdateFormField(index, 'placeholder', value)}
              placeholder={t('componentsOrganizer.step3.placeholderPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>

          {['select', 'checkbox', 'radio'].includes(field.field_type) && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.optionsLabel')}</Text>
              <TextInput
                style={[styles.input, themed.input]}
                value={field.options}
                onChangeText={(value) => onUpdateFormField(index, 'options', value)}
                placeholder={t('componentsOrganizer.step3.optionsPlaceholder')}
                placeholderTextColor={colors.gray400}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.helpTextLabel')}</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.help_text}
              onChangeText={(value) => onUpdateFormField(index, 'help_text', value)}
              placeholder={t('componentsOrganizer.step3.helpTextPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={[styles.switchRow, themed.switchRow]}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step3.requiredLabel')}</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step3.requiredDesc')}</Text>
            </View>
            <Switch
              value={field.required}
              onValueChange={(value) => onUpdateFormField(index, 'required', value)}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={field.required ? colors.primary : colors.gray400}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addAnotherButton, themed.addAnotherButton]} onPress={onAddFormField}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={[styles.addAnotherText, themed.addAnotherText]}>{t('componentsOrganizer.step3.addAnotherField')}</Text>
      </TouchableOpacity>
    </>
  );
}

// ============================================
// Main Component
// ============================================

export default function EventStep3Pricing({
  eventType,
  isFree,
  maxParticipants,
  autoApproveRegistrations,
  feeBearer,
  startDate,
  ticketTypes,
  stepErrors = {},
  ticketErrors = {},
  fieldErrors = {},
  showFormFieldsForBilletterie,
  attendeeFormScope,
  onAttendeeFormScopeChange,
  formFields,
  title,
  locationType,
  locationCity,
  formatDate,
  aiEnabled,
  aiPricingLoading,
  onIsFreeChange,
  onMaxParticipantsChange,
  onAutoApproveChange,
  onFeeBearerChange,
  onAddTicketType,
  onUpdateTicketType,
  onRemoveTicketType,
  onAddFormField,
  onUpdateFormField,
  onRemoveFormField,
  onShowFormFieldsForBilletterieChange,
  onSetFormFields,
  onSuggestPricing,
}: EventStep3PricingProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  // Strategie "Event mono-devise" : la devise est celle du wallet de l'organisateur,
  // heritee par l'evenement au create et verrouillee ensuite (cf. docs/CURRENCY_STRATEGY.md)
  const { currency: walletCurrency, country: walletCountry } = useOrganizerWallet();
  const currencyLabel = displayCurrency(walletCurrency);
  // Plafond max par ticket selon le pays/devise du wallet (PlatformLimit DB).
  // Affiche un hint sous le champ + colore en rouge si depasse.
  const { cap: maxTicketPrice, source: capSource } = useTicketPriceCap(walletCountry, walletCurrency);
  const themed = useEventCreateThemedStyles();
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>
        {eventType === 'billetterie' ? t('componentsOrganizer.step3.titleBilletterie') : t('componentsOrganizer.step3.titleInscription')}
      </Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>
        {eventType === 'billetterie'
          ? t('componentsOrganizer.step3.descriptionBilletterie')
          : t('componentsOrganizer.step3.descriptionInscription')}
      </Text>

      {eventType === 'billetterie' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            padding: Spacing.sm,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.08)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(129,140,248,0.25)' : 'rgba(79,70,229,0.18)',
            marginBottom: Spacing.md,
          }}
        >
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={isDark ? '#A5B4FC' : '#4F46E5'}
          />
          <Text style={{ fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 17, color: isDark ? '#C7D2FE' : '#4338CA', flex: 1 }}>
            {t('componentsOrganizer.step3.currencyLabel')} <Text style={{ fontFamily: FontFamily.bold }}>{walletCurrency}</Text>
            {currencyLabel !== walletCurrency ? ` (${currencyLabel})` : ''}
            {t('componentsOrganizer.step3.currencyInherited')}
          </Text>
        </View>
      )}

      {aiEnabled && eventType === 'billetterie' && (
        <AIAssistButton
          label={t('componentsOrganizer.step3.suggestPricesAI')}
          onPress={onSuggestPricing}
          isLoading={aiPricingLoading}
          variant="full"
        />
      )}

      {eventType === 'billetterie' ? (
        <>
          {/* Free event toggle */}
          <View style={[styles.switchRow, themed.switchRow]}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step3.freeEventLabel')}</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step3.freeEventDesc')}</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={(value) => {
                onIsFreeChange(value);
                if (value && ticketTypes.length === 0) {
                  onAddTicketType();
                  setTimeout(() => {
                    onUpdateTicketType(0, 'name', t('componentsOrganizer.step3.freeEntryName'));
                    onUpdateTicketType(0, 'price', '0');
                  }, 100);
                }
              }}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={isFree ? colors.primary : colors.gray400}
            />
          </View>

          {/* Ticket Types Section */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, themed.sectionIconContainer]}>
              <Ionicons name="ticket-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionHeaderTitle, themed.sectionHeaderTitle]}>{t('componentsOrganizer.step3.ticketTypesTitle')}</Text>
          </View>

          {!!stepErrors.ticketTypes && (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
              {stepErrors.ticketTypes}
            </Text>
          )}

          {ticketTypes.length === 0 ? (
            <View style={[styles.emptyContainer, themed.emptyContainer]}>
              <View style={[styles.emptyIcon, themed.emptyIcon]}>
                <Ionicons name="ticket-outline" size={40} color={colors.gray400} />
              </View>
              <Text style={[styles.emptyTitle, themed.emptyTitle]}>{t('componentsOrganizer.step3.noTicketsTitle')}</Text>
              <Text style={[styles.emptyText, themed.emptyText]}>
                {t('componentsOrganizer.step3.noTicketsText')}
              </Text>
              <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddTicketType}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={[styles.addButtonText, themed.addButtonText]}>{t('componentsOrganizer.step3.addTicket')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ticketTypes.map((ticket, index) => (
                <View
                  key={index}
                  style={[
                    styles.card,
                    themed.card,
                    ticketErrors[index] && { borderColor: '#EF4444', borderWidth: 1.5 },
                  ]}
                >
                  <View style={[styles.cardHeader, themed.cardHeader]}>
                    <Text style={[styles.cardTitle, themed.cardTitle]}>{t('componentsOrganizer.step3.ticketIndex', { index: index + 1 })}</Text>
                    <TouchableOpacity onPress={() => onRemoveTicketType(index)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  {!!ticketErrors[index] && (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                      {ticketErrors[index]}
                    </Text>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.ticketNameLabel')}</Text>
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={ticket.name}
                      onChangeText={(value) => onUpdateTicketType(index, 'name', value)}
                      placeholder={t('componentsOrganizer.step3.ticketNamePlaceholder')}
                      placeholderTextColor={colors.gray400}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.ticketDescriptionLabel')}</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall, themed.input]}
                      value={ticket.description}
                      onChangeText={(value) => onUpdateTicketType(index, 'description', value)}
                      placeholder={t('componentsOrganizer.step3.ticketDescriptionPlaceholder')}
                      placeholderTextColor={colors.gray400}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.priceLabel', { currency: currencyLabel })}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          themed.input,
                          // Highlight rouge si depasse le plafond.
                          maxTicketPrice != null && Number(ticket.price || 0) > maxTicketPrice
                            ? { borderColor: '#EF4444', borderWidth: 1.5 }
                            : null,
                        ]}
                        value={ticket.price}
                        onChangeText={(value) => onUpdateTicketType(index, 'price', value)}
                        placeholder="0"
                        placeholderTextColor={colors.gray400}
                        keyboardType="numeric"
                        editable={!isFree}
                      />
                      {maxTicketPrice != null && (
                        <Text
                          style={{
                            fontSize: 11,
                            marginTop: 4,
                            color: Number(ticket.price || 0) > maxTicketPrice
                              ? '#DC2626'
                              : (colors.gray500 || '#6B7280'),
                            fontFamily: FontFamily.regular,
                          }}
                          numberOfLines={2}
                        >
                          {Number(ticket.price || 0) > maxTicketPrice
                            ? t('componentsOrganizer.step3.priceCapExceeded', {
                                defaultValue: `Au-delà du plafond (${maxTicketPrice.toLocaleString('fr-FR')} ${currencyLabel}). Création refusée.`,
                                max: maxTicketPrice.toLocaleString('fr-FR'),
                                currency: currencyLabel,
                              })
                            : t('componentsOrganizer.step3.priceCapHint', {
                                defaultValue: `Max ${maxTicketPrice.toLocaleString('fr-FR')} ${currencyLabel}${capSource === 'platform_limit' ? ' (configuré admin)' : ''}`,
                                max: maxTicketPrice.toLocaleString('fr-FR'),
                                currency: currencyLabel,
                              })}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.quantityLabel')}</Text>
                      <TextInput
                        style={[styles.input, themed.input]}
                        value={ticket.quantity_total}
                        onChangeText={(value) => onUpdateTicketType(index, 'quantity_total', value)}
                        placeholder="100"
                        placeholderTextColor={colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.minPerOrderLabel')}</Text>
                      <TextInput
                        style={[styles.input, themed.input]}
                        value={ticket.min_per_order}
                        onChangeText={(value) => onUpdateTicketType(index, 'min_per_order', value)}
                        placeholder="1"
                        placeholderTextColor={colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.maxPerOrderLabel')}</Text>
                      <TextInput
                        style={[styles.input, themed.input]}
                        value={ticket.max_per_order}
                        onChangeText={(value) => onUpdateTicketType(index, 'max_per_order', value)}
                        placeholder="10"
                        placeholderTextColor={colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <DateTimePickerField
                    label={t('componentsOrganizer.step3.salesStartLabel')}
                    value={ticket.sales_start}
                    onChange={(date) => onUpdateTicketType(index, 'sales_start', date)}
                  />

                  <DateTimePickerField
                    label={t('componentsOrganizer.step3.salesEndLabel')}
                    value={ticket.sales_end}
                    onChange={(date) => onUpdateTicketType(index, 'sales_end', date)}
                    minimumDate={ticket.sales_start}
                    maximumDate={startDate}
                  />

                  {/* Accès du billet — uniquement event HYBRIDE (présentiel + visio
                      coexistent). « Limiter certains billets à la visio ». */}
                  {locationType === 'hybrid' && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={[styles.switchLabel, themed.switchLabel, { marginBottom: 6 }]}>
                        {t('componentsOrganizer.step3.accessModeLabel')}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {([
                          { v: 'in_person', l: t('componentsOrganizer.step3.accessInPerson') },
                          { v: 'online', l: t('componentsOrganizer.step3.accessOnline') },
                          { v: 'hybrid', l: t('componentsOrganizer.step3.accessBoth') },
                        ] as const).map((opt) => {
                          const active = (ticket.access_mode || 'hybrid') === opt.v;
                          return (
                            <TouchableOpacity
                              key={opt.v}
                              onPress={() => onUpdateTicketType(index, 'access_mode', opt.v)}
                              activeOpacity={0.7}
                              style={{
                                flex: 1, paddingVertical: 9, borderRadius: 999, borderWidth: 1,
                                alignItems: 'center',
                                backgroundColor: active ? colors.primary : colors.card,
                                borderColor: active ? colors.primary : (isDark ? colors.gray200 : 'rgba(0,0,0,0.08)'),
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.text }}>
                                {opt.l}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View style={[styles.switchRow, themed.switchRow]}>
                    <View style={styles.switchContent}>
                      <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step3.visibleLabel')}</Text>
                      <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step3.visibleDesc')}</Text>
                    </View>
                    <Switch
                      value={ticket.is_visible}
                      onValueChange={(value) => onUpdateTicketType(index, 'is_visible', value)}
                      trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                      thumbColor={ticket.is_visible ? colors.primary : colors.gray400}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[styles.addAnotherButton, themed.addAnotherButton]} onPress={onAddTicketType}>
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.addAnotherText, themed.addAnotherText]}>{t('componentsOrganizer.step3.addAnotherTicket')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Optional Form Fields for Billetterie */}
          <View style={[styles.sectionDivider, themed.sectionDivider, { marginTop: Spacing.xl }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.secondary || '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionHeaderTitle, themed.sectionHeaderTitle]}>{t('componentsOrganizer.step3.registrationFormTitle')}</Text>
                <Text style={[styles.sectionHeaderDescription, themed.sectionHeaderDescription]}>
                  {t('componentsOrganizer.step3.registrationFormDesc')}
                </Text>
              </View>
              <Switch
                value={showFormFieldsForBilletterie}
                onValueChange={(value) => {
                  onShowFormFieldsForBilletterieChange(value);
                  if (!value) {
                    onSetFormFields([]);
                  }
                }}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={showFormFieldsForBilletterie ? colors.primary : colors.gray400}
              />
            </View>

            {showFormFieldsForBilletterie && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={[styles.infoBox, themed.infoBox]}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.infoBoxText, themed.infoBoxText]}>
                    {t('componentsOrganizer.step3.registrationFormInfo')}
                  </Text>
                </View>
                <FormFieldsSection
                  formFields={formFields}
                  isOptional={true}
                  onAddFormField={onAddFormField}
                  onUpdateFormField={onUpdateFormField}
                  onRemoveFormField={onRemoveFormField}
                  fieldErrors={fieldErrors}
                  listError={stepErrors.formFields}
                />
                {/* Portée : par commande (défaut) ou par participant (après paiement). */}
                {formFields.length > 0 && (
                  <View style={[styles.sectionHeader, { marginTop: Spacing.md }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionHeaderTitle, themed.sectionHeaderTitle]}>
                        {t('componentsOrganizer.step3.scopePerAttendee')}
                      </Text>
                      <Text style={[styles.sectionHeaderDescription, themed.sectionHeaderDescription]}>
                        {attendeeFormScope === 'per_attendee'
                          ? t('componentsOrganizer.step3.scopePerAttendeeOn')
                          : t('componentsOrganizer.step3.scopePerAttendeeOff')}
                      </Text>
                    </View>
                    <Switch
                      value={attendeeFormScope === 'per_attendee'}
                      onValueChange={(value) =>
                        onAttendeeFormScopeChange(value ? 'per_attendee' : 'order')
                      }
                      trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                      thumbColor={attendeeFormScope === 'per_attendee' ? colors.primary : colors.gray400}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </>
      ) : (
        /* INSCRIPTION - Form Fields Only */
        <FormFieldsSection
          formFields={formFields}
          isOptional={false}
          onAddFormField={onAddFormField}
          onUpdateFormField={onUpdateFormField}
          onRemoveFormField={onRemoveFormField}
          fieldErrors={fieldErrors}
          listError={stepErrors.formFields}
        />
      )}

      {/* Common settings */}
      <View style={{ marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray100 }}>
        <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>{t('componentsOrganizer.step3.generalSettings')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step3.maxParticipantsLabel')}</Text>
          <TextInput
            style={[styles.input, themed.input]}
            value={maxParticipants}
            onChangeText={onMaxParticipantsChange}
            placeholder={t('componentsOrganizer.step3.maxParticipantsPlaceholder')}
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.switchRow, themed.switchRow]}>
          <View style={styles.switchContent}>
            <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step3.autoApproveLabel')}</Text>
            <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step3.autoApproveDesc')}</Text>
          </View>
          <Switch
            value={autoApproveRegistrations}
            onValueChange={onAutoApproveChange}
            trackColor={{ false: colors.gray200, true: colors.primaryLight }}
            thumbColor={autoApproveRegistrations ? colors.primary : colors.gray400}
          />
        </View>

        {eventType === 'billetterie' && !isFree && (
          <View style={[styles.switchRow, themed.switchRow]}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step3.absorbFeesLabel')}</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>
                {feeBearer === 'organizer'
                  ? t('componentsOrganizer.step3.absorbFeesOrganizer')
                  : t('componentsOrganizer.step3.absorbFeesParticipant')}
              </Text>
            </View>
            <Switch
              value={feeBearer === 'organizer'}
              onValueChange={(val) => onFeeBearerChange(val ? 'organizer' : 'participant')}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={feeBearer === 'organizer' ? colors.primary : colors.gray400}
            />
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, themed.summaryCard]}>
        <Text style={styles.summaryTitle}>{t('componentsOrganizer.step3.summaryTitle')}</Text>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>{t('componentsOrganizer.step3.summaryLabelTitle')}</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]} numberOfLines={1}>{title || '-'}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>{t('componentsOrganizer.step3.summaryLabelType')}</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>{eventType === 'billetterie' ? t('componentsOrganizer.step3.titleBilletterie') : t('componentsOrganizer.step1.eventTypeInscription')}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>{t('componentsOrganizer.step3.summaryLabelDate')}</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>{formatDate(startDate)}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>{t('componentsOrganizer.step3.summaryLabelLocation')}</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>
            {locationType === 'online' ? t('componentsOrganizer.step3.summaryOnline') : locationType === 'hybrid' ? t('componentsOrganizer.step3.summaryHybrid') : locationCity || '-'}
          </Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>
            {eventType === 'billetterie' ? t('componentsOrganizer.step3.summaryLabelTickets') : t('componentsOrganizer.step3.summaryLabelFields')}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {eventType === 'billetterie'
              ? (isFree ? t('componentsOrganizer.step3.summaryFree') : t('componentsOrganizer.step3.summaryTicketTypes', { count: ticketTypes.length }))
              : t('componentsOrganizer.step3.summaryFields', { count: formFields.length })}
          </Text>
        </View>
        {eventType === 'billetterie' && showFormFieldsForBilletterie && formFields.length > 0 && (
          <View style={[styles.summaryRow, themed.summaryRow]}>
            <Text style={[styles.summaryLabel, themed.summaryLabel]}>{t('componentsOrganizer.step3.summaryLabelRegFields')}</Text>
            <Text style={[styles.summaryValue, { color: colors.secondary || '#D97706' }]}>
              {t('componentsOrganizer.step3.summaryFields', { count: formFields.length })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
