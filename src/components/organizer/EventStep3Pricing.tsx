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

import { Colors, Spacing } from '../../constants/theme';
import { LocationType } from '../../types';
import { TicketTypeForm, FormFieldForm, FIELD_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import AIAssistButton from '../events/AIAssistButton';
import styles from './eventCreateStyles';

// ============================================
// Props
// ============================================

interface EventStep3PricingProps {
  // Core state
  eventType: 'billetterie' | 'inscription';
  isFree: boolean;
  maxParticipants: string;
  autoApproveRegistrations: boolean;
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
  if (formFields.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-text-outline" size={40} color={Colors.gray400} />
        </View>
        <Text style={styles.emptyTitle}>
          {isOptional ? 'Aucun champ suppl\u00e9mentaire' : 'Aucun champ'}
        </Text>
        <Text style={styles.emptyText}>
          {isOptional
            ? 'Ajoutez des champs pour collecter des informations suppl\u00e9mentaires lors de l\'achat'
            : 'Ajoutez des champs pour collecter les informations des participants'}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddFormField}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Ajouter un champ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {formFields.map((field, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Champ {index + 1}</Text>
            <TouchableOpacity onPress={() => onRemoveFormField(index)}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Intitul\u00e9 *</Text>
            <TextInput
              style={styles.input}
              value={field.label}
              onChangeText={(value) => onUpdateFormField(index, 'label', value)}
              placeholder="Ex: Nom complet, Entreprise, Poste"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type de champ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {FIELD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.chip,
                      field.field_type === type.value && styles.chipActive,
                    ]}
                    onPress={() => onUpdateFormField(index, 'field_type', type.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        field.field_type === type.value && styles.chipTextActive,
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
            <Text style={styles.label}>Placeholder</Text>
            <TextInput
              style={styles.input}
              value={field.placeholder}
              onChangeText={(value) => onUpdateFormField(index, 'placeholder', value)}
              placeholder="Texte d'aide dans le champ"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          {['select', 'checkbox', 'radio'].includes(field.field_type) && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Options (s\u00e9par\u00e9es par des virgules) *</Text>
              <TextInput
                style={styles.input}
                value={field.options}
                onChangeText={(value) => onUpdateFormField(index, 'options', value)}
                placeholder="Ex: Option 1, Option 2, Option 3"
                placeholderTextColor={Colors.gray400}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Texte d'aide</Text>
            <TextInput
              style={styles.input}
              value={field.help_text}
              onChangeText={(value) => onUpdateFormField(index, 'help_text', value)}
              placeholder="Instructions suppl\u00e9mentaires"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Obligatoire</Text>
              <Text style={styles.switchDescription}>Ce champ doit \u00eatre rempli</Text>
            </View>
            <Switch
              value={field.required}
              onValueChange={(value) => onUpdateFormField(index, 'required', value)}
              trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              thumbColor={field.required ? Colors.primary : Colors.gray400}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addAnotherButton} onPress={onAddFormField}>
        <Ionicons name="add" size={20} color={Colors.primary} />
        <Text style={styles.addAnotherText}>Ajouter un autre champ</Text>
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
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {eventType === 'billetterie' ? 'Billetterie' : 'Formulaire d\'inscription'}
      </Text>
      <Text style={styles.stepDescription}>
        {eventType === 'billetterie'
          ? 'Cr\u00e9ez les diff\u00e9rents types de billets pour votre \u00e9v\u00e9nement'
          : 'D\u00e9finissez les champs du formulaire d\'inscription'}
      </Text>

      {aiEnabled && eventType === 'billetterie' && (
        <AIAssistButton
          label="Sugg\u00e9rer des prix avec l'IA"
          onPress={onSuggestPricing}
          isLoading={aiPricingLoading}
          variant="full"
        />
      )}

      {eventType === 'billetterie' ? (
        <>
          {/* Free event toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>\u00c9v\u00e9nement gratuit</Text>
              <Text style={styles.switchDescription}>Aucun billet payant ne sera propos\u00e9</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={(value) => {
                onIsFreeChange(value);
                if (value && ticketTypes.length === 0) {
                  onAddTicketType();
                  setTimeout(() => {
                    onUpdateTicketType(0, 'name', 'Entr\u00e9e gratuite');
                    onUpdateTicketType(0, 'price', '0');
                  }, 100);
                }
              }}
              trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              thumbColor={isFree ? Colors.primary : Colors.gray400}
            />
          </View>

          {/* Ticket Types Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="ticket-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Types de billets</Text>
          </View>

          {ticketTypes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="ticket-outline" size={40} color={Colors.gray400} />
              </View>
              <Text style={styles.emptyTitle}>Aucun type de billet</Text>
              <Text style={styles.emptyText}>
                Cr\u00e9ez au moins un type de billet pour votre \u00e9v\u00e9nement
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={onAddTicketType}>
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.addButtonText}>Ajouter un billet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ticketTypes.map((ticket, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Billet {index + 1}</Text>
                    <TouchableOpacity onPress={() => onRemoveTicketType(index)}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom du billet *</Text>
                    <TextInput
                      style={styles.input}
                      value={ticket.name}
                      onChangeText={(value) => onUpdateTicketType(index, 'name', value)}
                      placeholder="Ex: Standard, VIP, Early Bird"
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall]}
                      value={ticket.description}
                      onChangeText={(value) => onUpdateTicketType(index, 'description', value)}
                      placeholder="D\u00e9crivez ce que ce billet inclut"
                      placeholderTextColor={Colors.gray400}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Prix (FCFA) *</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.price}
                        onChangeText={(value) => onUpdateTicketType(index, 'price', value)}
                        placeholder="0"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                        editable={!isFree}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Quantit\u00e9 *</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.quantity_total}
                        onChangeText={(value) => onUpdateTicketType(index, 'quantity_total', value)}
                        placeholder="100"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Min/commande</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.min_per_order}
                        onChangeText={(value) => onUpdateTicketType(index, 'min_per_order', value)}
                        placeholder="1"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Max/commande</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.max_per_order}
                        onChangeText={(value) => onUpdateTicketType(index, 'max_per_order', value)}
                        placeholder="10"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <DateTimePickerField
                    label="D\u00e9but des ventes"
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

                  <View style={styles.switchRow}>
                    <View style={styles.switchContent}>
                      <Text style={styles.switchLabel}>Visible</Text>
                      <Text style={styles.switchDescription}>Afficher ce billet publiquement</Text>
                    </View>
                    <Switch
                      value={ticket.is_visible}
                      onValueChange={(value) => onUpdateTicketType(index, 'is_visible', value)}
                      trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                      thumbColor={ticket.is_visible ? Colors.primary : Colors.gray400}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addAnotherButton} onPress={onAddTicketType}>
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addAnotherText}>Ajouter un autre billet</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Optional Form Fields for Billetterie */}
          <View style={[styles.sectionDivider, { marginTop: Spacing.xl }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="document-text-outline" size={20} color={Colors.secondary || '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderTitle}>Formulaire d'inscription (optionnel)</Text>
                <Text style={styles.sectionHeaderDescription}>
                  Collectez des informations suppl\u00e9mentaires lors de l'achat
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
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={showFormFieldsForBilletterie ? Colors.primary : Colors.gray400}
              />
            </View>

            {showFormFieldsForBilletterie && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoBoxText}>
                    Ces champs seront affich\u00e9s lors de l'achat de billets pour collecter des informations sur les participants (allergies, taille de t-shirt, etc.)
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
      <View style={{ marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.gray100 }}>
        <Text style={styles.subSectionTitle}>Param\u00e8tres g\u00e9n\u00e9raux</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre maximum de participants</Text>
          <TextInput
            style={styles.input}
            value={maxParticipants}
            onChangeText={onMaxParticipantsChange}
            placeholder="Laisser vide pour illimit\u00e9"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Approbation automatique</Text>
            <Text style={styles.switchDescription}>Les inscriptions sont confirm\u00e9es automatiquement</Text>
          </View>
          <Switch
            value={autoApproveRegistrations}
            onValueChange={onAutoApproveChange}
            trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
            thumbColor={autoApproveRegistrations ? Colors.primary : Colors.gray400}
          />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>R\u00e9capitulatif</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Titre</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{title || '-'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{eventType === 'billetterie' ? 'Billetterie' : 'Inscription'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{formatDate(startDate)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lieu</Text>
          <Text style={styles.summaryValue}>
            {locationType === 'online' ? 'En ligne' : locationType === 'hybrid' ? 'Hybride' : locationCity || '-'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {eventType === 'billetterie' ? 'Billets' : 'Champs'}
          </Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {eventType === 'billetterie'
              ? (isFree ? 'Gratuit' : `${ticketTypes.length} type(s)`)
              : `${formFields.length} champ(s)`}
          </Text>
        </View>
        {eventType === 'billetterie' && showFormFieldsForBilletterie && formFields.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Champs d'inscription</Text>
            <Text style={[styles.summaryValue, { color: Colors.secondary || '#D97706' }]}>
              {formFields.length} champ(s)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
