// ============================================
// BoothManagementScreen — gestion des stands (organisateur)
// ============================================
//
// Atterrissage depuis MyEvents → « Exposants / Stands ». Permet a l'organisateur
// d'un salon de gerer, depuis le mobile :
//   - Stands : creer les emplacements (code + categorie), placement sur une zone.
//   - Categories : grille tarifaire (nom + prix + acompte).
//   - Candidatures : accepter (avec attribution d'un stand) / refuser / liste
//     d'attente les demandes d'exposants.
//
// Le placement visuel detaille (dessin du plan) reste sur le web ; ici le
// placement est « simple » : on assigne un stand a une zone booth existante.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { exhibitorsAPI, floorPlansAPI, eventsAPI } from '../../api';
import { CURRENCY_CODE as DEFAULT_CURRENCY } from '../../constants/payment';
import type { RootStackParamList } from '../../types';
import SalesDelegationTab from './SalesDelegationTab';
import ErrorState from '../../components/ui/ErrorState';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'BoothManagement'>;

type Tab = 'booths' | 'categories' | 'applications' | 'sales';

interface BoothCategory { id: string; name: string; base_price: string; }
interface Booth { id: string; code: string; category: string; status: string; floor_plan_area?: string | null; }
interface Application { id: string; status: string; exhibitor_name?: string; company_name?: string; pitch?: string; }
interface FloorArea { id: string; name: string; area_type: string; }

const t2 = (n: number | string) => String(n);

// Message d'erreur ACTIONNABLE pour les formulaires de création : on privilégie
// le message backend spécifique (detail / non_field_errors / 1er champ en
// erreur, ex. « event: Pas un UUID valide ») au lieu du « certaines informations
// sont invalides » générique qui laissait l'organisateur sans piste.
function specificApiError(error: any, t: (k: string, o?: any) => string): string {
  const data = error?.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) return data.non_field_errors[0];
    // Premier champ en erreur : "<champ> : <message>".
    for (const [key, val] of Object.entries(data)) {
      if (key === 'code') continue;
      const msg = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : null);
      if (msg) return `${key} : ${msg}`;
    }
  }
  return getApiErrorMessage(error, t, {
    fallbackKey: 'organizer.booths.createError',
    fallbackValues: { defaultValue: 'Échec.' },
  }).message;
}

export default function BoothManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [tab, setTab] = useState<Tab>('booths');
  const [categories, setCategories] = useState<BoothCategory[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [areas, setAreas] = useState<FloorArea[]>([]);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  // Devise de l'event (regle mono-devise : Event.currency = devise du wallet
  // organisateur, verrouillee). On l'affiche telle quelle, jamais 'XAF' en dur.
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  // UUID réel de l'event. `eventId` (route param) peut être le SLUG → les POST
  // (createCategory/createBooth) exigent l'UUID strict (FK PrimaryKey backend),
  // sinon "certaines informations sont invalides". Résolu au chargement.
  const [resolvedEventId, setResolvedEventId] = useState<string>(eventId);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal création catégorie
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catPrice, setCatPrice] = useState('');
  const [busy, setBusy] = useState(false);

  // Modal création stand
  const [boothOpen, setBoothOpen] = useState(false);
  const [boothCode, setBoothCode] = useState('');
  const [boothCat, setBoothCat] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoadFailed(false);
      const [catRes, boothRes, appRes] = await Promise.all([
        exhibitorsAPI.getCategories({ event: eventId }),
        exhibitorsAPI.getBooths({ event: eventId }),
        exhibitorsAPI.getApplications({ event: eventId }),
      ]);
      setCategories(catRes.data?.results || catRes.data || []);
      setBooths(boothRes.data?.results || boothRes.data || []);
      setApplications(appRes.data?.results || appRes.data || []);
      // Devise de l'event (mono-devise). Best-effort : si l'appel echoue on
      // conserve le fallback plateforme.
      try {
        const evRes = await eventsAPI.getEvent(eventId);
        const ev = evRes.data;
        if (ev?.currency) setCurrency(ev.currency);
        // Mémorise l'UUID réel pour les créations (POST exigent l'UUID).
        if (ev?.id) setResolvedEventId(String(ev.id));
      } catch { /* garde le fallback */ }
      // Zones « booth » du plan (pour le placement simple). Best-effort.
      try {
        const fpRes = await floorPlansAPI.getByEvent(eventId);
        const plans = fpRes.data?.results || fpRes.data || [];
        const firstPlan = Array.isArray(plans) ? plans[0] : plans;
        setFloorPlanId(firstPlan?.id || null);
        const planAreas: FloorArea[] = firstPlan?.areas || [];
        setAreas(planAreas.filter((a) => a.area_type === 'booth'));
      } catch {
        setAreas([]);
        setFloorPlanId(null);
      }
    } catch {
      // Plus de modale bloquante : l'écran affiche désormais son propre état
      // d'erreur avec un bouton Réessayer. L'ancien état vide (« Aucun stand.
      // Créez-en un. ») faisait passer une panne réseau pour une absence de
      // données — on distingue maintenant les deux.
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Création catégorie ────────────────────────────────────────────
  const submitCategory = async () => {
    if (!catName.trim() || !catPrice.trim()) {
      showError(t('common.error'), t('organizer.booths.categoryFormError', { defaultValue: 'Nom et prix requis.' }));
      return;
    }
    setBusy(true);
    try {
      const res = await exhibitorsAPI.createCategory({ event: resolvedEventId, name: catName.trim(), base_price: catPrice.trim() });
      setCategories((prev) => [...prev, res.data]);
      setCatOpen(false); setCatName(''); setCatPrice('');
      showSuccess(t('organizer.booths.categoryCreated', { defaultValue: 'Catégorie créée' }), '');
    } catch (error: any) {
      showError(t('common.error'), specificApiError(error, t));
    } finally { setBusy(false); }
  };

  // ── Création stand ────────────────────────────────────────────────
  const submitBooth = async () => {
    if (!boothCode.trim() || !boothCat) {
      showError(t('common.error'), t('organizer.booths.boothFormError', { defaultValue: 'Code et catégorie requis.' }));
      return;
    }
    setBusy(true);
    try {
      const res = await exhibitorsAPI.createBooth({ event: resolvedEventId, code: boothCode.trim(), category: boothCat, status: 'available' });
      setBooths((prev) => [...prev, res.data]);
      setBoothOpen(false); setBoothCode(''); setBoothCat('');
      showSuccess(t('organizer.booths.boothCreated', { defaultValue: 'Stand créé' }), '');
    } catch (error: any) {
      showError(t('common.error'), specificApiError(error, t));
    } finally { setBusy(false); }
  };

  const deleteBooth = (b: Booth) => {
    showConfirm(
      t('organizer.booths.deleteBoothTitle', { defaultValue: 'Supprimer le stand' }),
      t('organizer.booths.deleteBoothMsg', { code: b.code, defaultValue: `Supprimer ${b.code} ?` }),
      async () => {
        try {
          await exhibitorsAPI.deleteBooth(b.id);
          setBooths((prev) => prev.filter((x) => x.id !== b.id));
        } catch (error: any) {
          showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.booths.deleteError', fallbackValues: { defaultValue: 'Suppression impossible.' } }).message);
        }
      },
    );
  };

  // ── Placement : assigner une zone booth au stand ──────────────────
  const assignArea = (booth: Booth) => {
    if (areas.length === 0) {
      showError('', t('organizer.booths.noAreas', { defaultValue: 'Aucune zone stand sur le plan. Créez le plan sur le web.' }));
      return;
    }
    // Choix simple via une suite de confirmations (pas de canvas mobile).
    const options = areas.map((a) => ({
      text: a.name || a.id.slice(0, 6),
      onPress: async () => {
        try {
          await exhibitorsAPI.updateBooth(booth.id, { floor_plan_area: a.id });
          setBooths((prev) => prev.map((x) => (x.id === booth.id ? { ...x, floor_plan_area: a.id } : x)));
          showSuccess(t('organizer.booths.placed', { defaultValue: 'Stand placé' }), '');
        } catch {
          showError(t('common.error'), t('organizer.booths.placeError', { defaultValue: 'Placement impossible.' }));
        }
      },
    }));
    // Liste de choix dynamique : `showConfirm` ne gère qu'une action, mais
    // `showAlert` accepte un tableau de boutons arbitraire — on reste donc
    // dans le design system au lieu de retomber sur l'alerte native de l'OS.
    showAlert(
      t('organizer.booths.chooseArea', { defaultValue: 'Placer sur une zone' }),
      booth.code,
      [...options, { text: t('common.cancel'), style: 'cancel' }],
      'confirm',
    );
  };

  // ── Candidatures ──────────────────────────────────────────────────
  const acceptApp = (app: Application) => {
    const available = booths.filter((b) => b.status === 'available');
    if (available.length === 0) {
      showError('', t('organizer.booths.noBoothToAssign', { defaultValue: 'Aucun stand disponible à attribuer.' }));
      return;
    }

    showAlert(
      t('organizer.booths.assignBooth', { defaultValue: 'Attribuer un stand' }),
      app.company_name || app.exhibitor_name || '',
      [
        ...available.map((b) => ({
          text: b.code,
          onPress: async () => {
            try {
              await exhibitorsAPI.acceptApplication(app.id, { booth: b.id });
              await fetchData();
              showSuccess(t('organizer.booths.accepted', { defaultValue: 'Candidature acceptée' }), '');
            } catch (error: any) {
              showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.booths.actionError', fallbackValues: { defaultValue: 'Action impossible.' } }).message);
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const rejectApp = (app: Application) => {
    showConfirm(
      t('organizer.booths.rejectTitle', { defaultValue: 'Refuser la candidature' }),
      app.company_name || app.exhibitor_name || '',
      async () => {
        try {
          await exhibitorsAPI.rejectApplication(app.id);
          await fetchData();
        } catch {
          showError(t('common.error'), t('organizer.booths.actionError', { defaultValue: 'Action impossible.' }));
        }
      },
    );
  };

  // ── Rendu ─────────────────────────────────────────────────────────
  const iconDisc = (name: any, onPress: () => void, label: string) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={name} size={22} color={colors.text} />
    </TouchableOpacity>
  );

  const statusColor = (s: string) =>
    s === 'booked' || s === 'accepted' ? '#10B981'
      : s === 'available' || s === 'pending' ? colors.primary
        : s === 'rejected' ? '#EF4444' : colors.gray400;

  const renderBooth = ({ item }: { item: Booth }) => {
    const area = areas.find((a) => a.id === item.floor_plan_area);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{item.code}</Text>
            <Text style={[styles.description, { color: colors.gray500 }]}>
              {area ? t('organizer.booths.placedOn', { name: area.name, defaultValue: `Placé : ${area.name}` }) : t('organizer.booths.notPlaced', { defaultValue: 'Non placé' })}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}18` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {t(`organizer.booths.status.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
        </View>
        <View style={[styles.actionsRow, { borderTopColor: hairline }]}>
          <TouchableOpacity onPress={() => assignArea(item)} style={styles.actionBtn}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('organizer.booths.place', { defaultValue: 'Placer' })}</Text>
          </TouchableOpacity>
          {item.status === 'available' && (
            <TouchableOpacity onPress={() => deleteBooth(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('common.delete', { defaultValue: 'Supprimer' })}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCategory = ({ item }: { item: BoothCategory }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.description, { color: colors.gray500 }]}>{t2(item.base_price)} {currency}</Text>
        </View>
      </View>
    </View>
  );

  const renderApplication = ({ item }: { item: Application }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{item.company_name || item.exhibitor_name || '—'}</Text>
          {!!item.pitch && <Text style={[styles.description, { color: colors.gray500 }]} numberOfLines={2}>{item.pitch}</Text>}
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}18` }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {t(`organizer.booths.status.${item.status}`, { defaultValue: item.status })}
          </Text>
        </View>
      </View>
      {item.status === 'pending' && (
        <View style={[styles.actionsRow, { borderTopColor: hairline }]}>
          <TouchableOpacity onPress={() => acceptApp(item)} style={styles.actionBtn}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.actionText, { color: '#10B981' }]}>{t('organizer.booths.accept', { defaultValue: 'Accepter' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rejectApp(item)} style={styles.actionBtn}>
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('organizer.booths.reject', { defaultValue: 'Refuser' })}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'booths', label: t('organizer.booths.tabBooths', { defaultValue: 'Stands' }), icon: 'storefront-outline' },
    { key: 'categories', label: t('organizer.booths.tabCategories', { defaultValue: 'Catégories' }), icon: 'pricetags-outline' },
    { key: 'applications', label: t('organizer.booths.tabApplications', { defaultValue: 'Candidatures' }), icon: 'document-text-outline' },
    { key: 'sales', label: t('organizer.booths.tabSales', { defaultValue: 'Vente déléguée' }), icon: 'cash-outline' },
  ];

  const data = tab === 'booths' ? booths : tab === 'categories' ? categories : applications;
  const renderItem = tab === 'booths' ? renderBooth : tab === 'categories' ? renderCategory : renderApplication;
  const emptyText = tab === 'booths'
    ? t('organizer.booths.emptyBooths', { defaultValue: 'Aucun stand. Créez-en un.' })
    : tab === 'categories'
      ? t('organizer.booths.emptyCategories', { defaultValue: 'Aucune catégorie. Créez la grille tarifaire.' })
      : t('organizer.booths.emptyApplications', { defaultValue: 'Aucune candidature.' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {iconDisc('arrow-back', () => navigation.goBack(), t('common.back', { defaultValue: 'Retour' }))}
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.booths.eyebrow', { defaultValue: 'SALON' })}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.booths.title', { defaultValue: 'Exposants & stands' })}</Text>
        </View>
        {(tab === 'booths' || tab === 'categories')
          ? iconDisc('add', () => (tab === 'booths' ? setBoothOpen(true) : setCatOpen(true)), t('organizer.booths.create', { defaultValue: 'Créer' }))
          : <View style={{ width: 44 }} />}
      </View>

      {/* Onglets */}
      <View style={styles.tabsRow}>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <TouchableOpacity
              key={tb.key}
              onPress={() => setTab(tb.key)}
              style={[styles.tab, active && { backgroundColor: `${colors.primary}15` }]}
            >
              <Ionicons name={tb.icon} size={16} color={active ? colors.primary : colors.gray500} />
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.gray500 }]}>{tb.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : tab === 'sales' ? (
        <SalesDelegationTab eventId={eventId} />
      ) : (
        <FlatList
          data={data as any[]}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem as any}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            // Accès à l'éditeur de plan visuel (drag) — onglet Stands, si un plan
            // existe. Le plan se crée côté seating ("Plans de placement").
            tab === 'booths' && floorPlanId ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('BoothPlanEditor', { floorPlanId, eventId: resolvedEventId })}
                style={[styles.planBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
              >
                <Ionicons name="map-outline" size={18} color={colors.primary} />
                <Text style={[styles.planBtnText, { color: colors.primary }]}>
                  {t('organizer.booths.visualPlan', { defaultValue: 'Plan visuel (glisser-déposer)' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            loadFailed ? (
              <ErrorState
                withCard
                message={t('organizer.booths.loadError', { defaultValue: 'Impossible de charger les stands.' })}
                onRetry={fetchData}
              />
            ) : (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.gray500 }]}>{emptyText}</Text>
              </View>
            )
          }
        />
      )}

      {/* Modal catégorie */}
      <Modal visible={catOpen} transparent animationType="fade" onRequestClose={() => setCatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.booths.newCategory', { defaultValue: 'Nouvelle catégorie' })}</Text>
            <TextInput
              value={catName} onChangeText={setCatName}
              placeholder={t('organizer.booths.categoryNamePlaceholder', { defaultValue: 'Ex : Stand standard 3x2' })}
              placeholderTextColor={colors.gray400}
              style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            <TextInput
              value={catPrice} onChangeText={setCatPrice} keyboardType="number-pad"
              placeholder={t('organizer.booths.categoryPricePlaceholder', { currency, defaultValue: `Prix (${currency})` })}
              placeholderTextColor={colors.gray400}
              style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            {modalActions(colors, () => setCatOpen(false), submitCategory, busy, t)}
          </View>
        </View>
      </Modal>

      {/* Modal stand */}
      <Modal visible={boothOpen} transparent animationType="fade" onRequestClose={() => setBoothOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.booths.newBooth', { defaultValue: 'Nouveau stand' })}</Text>
            <TextInput
              value={boothCode} onChangeText={setBoothCode}
              placeholder={t('organizer.booths.boothCodePlaceholder', { defaultValue: 'Code (ex : A12)' })}
              placeholderTextColor={colors.gray400}
              style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            <Text style={[styles.label, { color: colors.text }]}>{t('organizer.booths.category', { defaultValue: 'Catégorie' })}</Text>
            {categories.length === 0 ? (
              <Text style={[styles.description, { color: colors.gray500, marginBottom: Spacing.sm }]}>
                {t('organizer.booths.noCategoryFirst', { defaultValue: 'Créez d\'abord une catégorie.' })}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 160 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setBoothCat(c.id)}
                    style={[styles.catChoice, { borderColor: boothCat === c.id ? colors.primary : hairline, backgroundColor: boothCat === c.id ? `${colors.primary}10` : 'transparent' }]}
                  >
                    <Text style={{ color: colors.text, fontFamily: FontFamily.medium }}>{c.name}</Text>
                    <Text style={{ color: colors.gray500, fontSize: FontSizes.sm }}>{t2(c.base_price)} {currency}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {modalActions(colors, () => setBoothOpen(false), submitBooth, busy, t)}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function modalActions(colors: any, onCancel: () => void, onSubmit: () => void, busy: boolean, t: any) {
  return (
    <View style={styles.modalActions}>
      <TouchableOpacity onPress={onCancel} style={styles.modalCancel}>
        <Text style={{ color: colors.gray500, fontFamily: FontFamily.medium }}>{t('common.cancel', { defaultValue: 'Annuler' })}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSubmit} disabled={busy} style={[styles.modalSubmit, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: '#FFFFFF', fontFamily: FontFamily.semiBold }}>{t('common.create', { defaultValue: 'Créer' })}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  headerTitleWrap: { flex: 1 },
  headerEyebrow: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl },
  iconDisc: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: Spacing.sm, ...centeredContent(CARD_MAX) },
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  tabText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  card: { borderWidth: 1, borderRadius: BorderRadius['2xl'], padding: Spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWell: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  description: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 2 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.xs },
  actionsRow: { flexDirection: 'row', gap: Spacing.lg, borderTopWidth: 1, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.md, textAlign: 'center' },
  planBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  planBtnText: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: BorderRadius['2xl'], padding: Spacing.lg },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSizes.lg, marginBottom: Spacing.md },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: FontFamily.regular, fontSize: FontSizes.md, marginBottom: Spacing.sm },
  label: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  catChoice: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xs },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancel: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  modalSubmit: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, minWidth: 90, alignItems: 'center' },
});
