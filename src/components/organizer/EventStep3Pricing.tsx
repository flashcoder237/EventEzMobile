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

import { useTheme } from '../../contexts/ThemeContext';
import { useOrganizerWallet } from '../../hooks/useOrganizerWallet';
import { Spacing, FontFamily } from '../../constants/theme';
import { LocationType } from '../../types';
import { TicketTypeForm, FormFieldForm, FIELD_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import AIAssistButton from '../events/AIAssistButton';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

// ============================================
// Props
// ============================================

interface EventStep3PricingProps {
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
}: {
  formFields: FormFieldForm[];
  isOptional: boolean;
  onAddFormField: () => void;
  onUpdateFormField: (index: number, field: string, value: any) => void;
  onRemoveFormField: (index: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  if (formFields.length === 0) {
    return (
      <View style={[styles.emptyContainer, themed.emptyContainer]}>
        <View style={[styles.emptyIcon, themed.emptyIcon]}>
          <Ionicons name="document-text-outline" size={40} color={colors.gray400} />
        </View>
        <Text style={[styles.emptyTitle, themed.emptyTitle]}>
          {isOptional ? 'Aucun champ supplémentaire' : 'Aucun champ'}
        </Text>
        <Text style={[styles.emptyText, themed.emptyText]}>
          {isOptional
            ? 'Ajoutez des champs pour collecter des informations supplémentaires lors de l\'achat'
            : 'Ajoutez des champs pour collecter les informations des participants'}
        </Text>
        <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddFormField}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={[styles.addButtonText, themed.addButtonText]}>Ajouter un champ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {formFields.map((field, index) => (
        <View key={index} style={[styles.card, themed.card]}>
          <View style={[styles.cardHeader, themed.cardHeader]}>
            <Text style={[styles.cardTitle, themed.cardTitle]}>Champ {index + 1}</Text>
            <TouchableOpacity onPress={() => onRemoveFormField(index)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Intitulé *</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.label}
              onChangeText={(value) => onUpdateFormField(index, 'label', value)}
              placeholder="Ex: Nom complet, Entreprise, Poste"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Type de champ</Text>
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
            <Text style={[styles.label, themed.label]}>Placeholder</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.placeholder}
              onChangeText={(value) => onUpdateFormField(index, 'placeholder', value)}
              placeholder="Texte d'aide dans le champ"
              placeholderTextColor={colors.gray400}
            />
          </View>

          {['select', 'checkbox', 'radio'].includes(field.field_type) && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, themed.label]}>Options (séparées par des virgules) *</Text>
              <TextInput
                style={[styles.input, themed.input]}
                value={field.options}
                onChangeText={(value) => onUpdateFormField(index, 'options', value)}
                placeholder="Ex: Option 1, Option 2, Option 3"
                placeholderTextColor={colors.gray400}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themed.label]}>Texte d'aide</Text>
            <TextInput
              style={[styles.input, themed.input]}
              value={field.help_text}
              onChangeText={(value) => onUpdateFormField(index, 'help_text', value)}
              placeholder="Instructions supplémentaires"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={[styles.switchRow, themed.switchRow]}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, themed.switchLabel]}>Obligatoire</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>Ce champ doit être rempli</Text>
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
        <Text style={[styles.addAnotherText, themed.addAnotherText]}>Ajouter un autre champ</Text>
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
  showFormFieldsForBilletterie,
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
  const { colors, isDark } = useTheme();
  // Strategie "Event mono-devise" : la devise est celle du wallet de l'organisateur,
  // heritee par l'evenement au create et verrouillee ensuite (cf. docs/CURRENCY_STRATEGY.md)
  const { currency: walletCurrency } = useOrganizerWallet();
  const displayCurrency =
    walletCurrency === 'XAF' || walletCurrency === 'XOF' ? 'FCFA' : walletCurrency;
  const themed = useEventCreateThemedStyles();
  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>
        {eventType === 'billetterie' ? 'Billetterie' : 'Formulaire d\'inscription'}
      </Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>
        {eventType === 'billetterie'
          ? 'Créez les différents types de billets pour votre événement'
          : 'Définissez les champs du formulaire d\'inscription'}
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
            Devise : <Text style={{ fontFamily: FontFamily.bold }}>{walletCurrency}</Text>
            {displayCurrency !== walletCurrency ? ` (${displayCurrency})` : ''}
            {' '}— héritée de votre compte, verrouillée pour cet événement.
          </Text>
        </View>
      )}

      {aiEnabled && eventType === 'billetterie' && (
        <AIAssistButton
          label="Suggérer des prix avec l'IA"
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
              <Text style={[styles.switchLabel, themed.switchLabel]}>Événement gratuit</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>Aucun billet payant ne sera proposé</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={(value) => {
                onIsFreeChange(value);
                if (value && ticketTypes.length === 0) {
                  onAddTicketType();
                  setTimeout(() => {
                    onUpdateTicketType(0, 'name', 'Entrée gratuite');
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
            <Text style={[styles.sectionHeaderTitle, themed.sectionHeaderTitle]}>Types de billets</Text>
          </View>

          {ticketTypes.length === 0 ? (
            <View style={[styles.emptyContainer, themed.emptyContainer]}>
              <View style={[styles.emptyIcon, themed.emptyIcon]}>
                <Ionicons name="ticket-outline" size={40} color={colors.gray400} />
              </View>
              <Text style={[styles.emptyTitle, themed.emptyTitle]}>Aucun type de billet</Text>
              <Text style={[styles.emptyText, themed.emptyText]}>
                Créez au moins un type de billet pour votre événement
              </Text>
              <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddTicketType}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={[styles.addButtonText, themed.addButtonText]}>Ajouter un billet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ticketTypes.map((ticket, index) => (
                <View key={index} style={[styles.card, themed.card]}>
                  <View style={[styles.cardHeader, themed.cardHeader]}>
                    <Text style={[styles.cardTitle, themed.cardTitle]}>Billet {index + 1}</Text>
                    <TouchableOpacity onPress={() => onRemoveTicketType(index)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, themed.label]}>Nom du billet *</Text>
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={ticket.name}
                      onChangeText={(value) => onUpdateTicketType(index, 'name', value)}
                      placeholder="Ex: Standard, VIP, Early Bird"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, themed.label]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall, themed.input]}
                      value={ticket.description}
                      onChangeText={(value) => onUpdateTicketType(index, 'description', value)}
                      placeholder="Décrivez ce que ce billet inclut"
                      placeholderTextColor={colors.gray400}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>Prix ({displayCurrency}) *</Text>
                      <TextInput
                        style={[styles.input, themed.input]}
                        value={ticket.price}
                        onChangeText={(value) => onUpdateTicketType(index, 'price', value)}
                        placeholder="0"
                        placeholderTextColor={colors.gray400}
                        keyboardType="numeric"
                        editable={!isFree}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, themed.label]}>Quantité *</Text>
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
                      <Text style={[styles.label, themed.label]}>Min/commande</Text>
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
                      <Text style={[styles.label, themed.label]}>Max/commande</Text>
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
                    label="Début des ventes"
                    value={ticket.sales_start}
                    onChange={(date) => onUpdateTicketType(index, 'sales_start', date)}
                  />

                  <DateTimePickerField
                    label="Fin des ventes"
                    value={ticket.sales_end}
                    onChange={(date) => onUpdateTicketType(index, 'sales_end', date)}
                    minimumDate={ticket.sales_start}
                    maximumDate={startDate}
                  />

                  <View style={[styles.switchRow, themed.switchRow]}>
                    <View style={styles.switchContent}>
                      <Text style={[styles.switchLabel, themed.switchLabel]}>Visible</Text>
                      <Text style={[styles.switchDescription, themed.switchDescription]}>Afficher ce billet publiquement</Text>
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
                <Text style={[styles.addAnotherText, themed.addAnotherText]}>Ajouter un autre billet</Text>
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
                <Text style={[styles.sectionHeaderTitle, themed.sectionHeaderTitle]}>Formulaire d'inscription (optionnel)</Text>
                <Text style={[styles.sectionHeaderDescription, themed.sectionHeaderDescription]}>
                  Collectez des informations supplémentaires lors de l'achat
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
                    Ces champs seront affichés lors de l'achat de billets pour collecter des informations sur les participants (allergies, taille de t-shirt, etc.)
                  </Text>
                </View>
                <FormFieldsSection
                  formFields={formFields}
                  isOptional={true}
                  onAddFormField={onAddFormField}
                  onUpdateFormField={onUpdateFormField}
                  onRemoveFormField={onRemoveFormField}
                />
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
        />
      )}

      {/* Common settings */}
      <View style={{ marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray100 }}>
        <Text style={[styles.subSectionTitle, themed.subSectionTitle]}>Paramètres généraux</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themed.label]}>Nombre maximum de participants</Text>
          <TextInput
            style={[styles.input, themed.input]}
            value={maxParticipants}
            onChangeText={onMaxParticipantsChange}
            placeholder="Laisser vide pour illimité"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.switchRow, themed.switchRow]}>
          <View style={styles.switchContent}>
            <Text style={[styles.switchLabel, themed.switchLabel]}>Approbation automatique</Text>
            <Text style={[styles.switchDescription, themed.switchDescription]}>Les inscriptions sont confirmées automatiquement</Text>
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
              <Text style={[styles.switchLabel, themed.switchLabel]}>Absorber les frais de service</Text>
              <Text style={[styles.switchDescription, themed.switchDescription]}>
                {feeBearer === 'organizer'
                  ? 'Les frais seront déduits de vos revenus'
                  : 'Les frais sont ajoutés au prix payé par le participant'}
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
        <Text style={styles.summaryTitle}>Récapitulatif</Text>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>Titre</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]} numberOfLines={1}>{title || '-'}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>Type</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>{eventType === 'billetterie' ? 'Billetterie' : 'Inscription'}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>Date</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>{formatDate(startDate)}</Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>Lieu</Text>
          <Text style={[styles.summaryValue, themed.summaryValue]}>
            {locationType === 'online' ? 'En ligne' : locationType === 'hybrid' ? 'Hybride' : locationCity || '-'}
          </Text>
        </View>
        <View style={[styles.summaryRow, themed.summaryRow]}>
          <Text style={[styles.summaryLabel, themed.summaryLabel]}>
            {eventType === 'billetterie' ? 'Billets' : 'Champs'}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {eventType === 'billetterie'
              ? (isFree ? 'Gratuit' : `${ticketTypes.length} type(s)`)
              : `${formFields.length} champ(s)`}
          </Text>
        </View>
        {eventType === 'billetterie' && showFormFieldsForBilletterie && formFields.length > 0 && (
          <View style={[styles.summaryRow, themed.summaryRow]}>
            <Text style={[styles.summaryLabel, themed.summaryLabel]}>Champs d'inscription</Text>
            <Text style={[styles.summaryValue, { color: colors.secondary || '#D97706' }]}>
              {formFields.length} champ(s)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
