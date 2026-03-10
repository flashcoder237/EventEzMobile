import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cfpAPI } from '../../api';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';

interface CallForPapers {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  is_open?: boolean;
  deadline?: string;
  topics?: string[];
}

interface TalkProposal {
  id: string;
  title: string;
  abstract?: string;
  status?: string;
  speaker_name?: string;
  speaker?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
  talk_type?: string;
}

interface CfpTabProps {
  eventId: string;
}

export default function CfpTab({ eventId }: CfpTabProps) {
  const { colors, isDark } = useTheme();
  const [cfp, setCfp] = useState<CallForPapers | null>(null);
  const [proposals, setProposals] = useState<TalkProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCfpData();
  }, [eventId]);

  const fetchCfpData = async () => {
    setLoading(true);
    try {
      const [cfpRes, proposalsRes] = await Promise.all([
        cfpAPI.getAll({ event: eventId }).catch(() => ({ data: null })),
        cfpAPI.getMyProposals().catch(() => ({ data: [] })),
      ]);

      const cfpList = cfpRes.data?.results || cfpRes.data || [];
      if (Array.isArray(cfpList) && cfpList.length > 0) {
        setCfp(cfpList[0]);
      } else if (cfpRes.data && !Array.isArray(cfpRes.data)) {
        setCfp(cfpRes.data);
      }

      const proposalsList = proposalsRes.data?.results || proposalsRes.data || [];
      setProposals(Array.isArray(proposalsList) ? proposalsList : []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement CFP:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDeadline = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status?: string): { label: string; color: string; bg: string } => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'accepte':
      case 'approved':
        return { label: 'Accepte', color: Colors.success, bg: Colors.successLight };
      case 'rejected':
      case 'refuse':
        return { label: 'Refuse', color: Colors.error, bg: Colors.errorLight };
      case 'pending':
      case 'en_attente':
      case 'submitted':
        return { label: 'En attente', color: Colors.warning, bg: Colors.warningLight };
      case 'draft':
      case 'brouillon':
        return { label: 'Brouillon', color: Colors.gray600, bg: Colors.gray100 };
      default:
        return { label: status || 'Inconnu', color: Colors.gray600, bg: Colors.gray100 };
    }
  };

  const getSpeakerName = (proposal: TalkProposal): string => {
    if (proposal.speaker_name) return proposal.speaker_name;
    if (proposal.speaker) {
      if (proposal.speaker.full_name) return proposal.speaker.full_name;
      const first = proposal.speaker.first_name || '';
      const last = proposal.speaker.last_name || '';
      return `${first} ${last}`.trim();
    }
    return '';
  };

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Chargement...</Text>
      </View>
    );
  }

  if (!cfp) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Appel a contributions</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="mic-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Aucun appel a contributions pour cet evenement</Text>
        </View>
      </View>
    );
  }

  const isOpen = cfp.is_open || cfp.status === 'open';
  const isDeadlinePassed = cfp.deadline ? new Date(cfp.deadline) < new Date() : false;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Appel a contributions</Text>

      {/* CFP Status Card */}
      <View style={[styles.cfpStatusCard, { backgroundColor: colors.gray50 }]}>
        <View style={styles.cfpStatusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: isOpen && !isDeadlinePassed ? colors.success : colors.error }]} />
          <Text style={[styles.cfpStatusText, { color: colors.gray700 }]}>
            {isOpen && !isDeadlinePassed ? 'Ouvert aux soumissions' : 'Ferme'}
          </Text>
        </View>
        {cfp.title && (
          <Text style={[styles.cfpTitle, { color: colors.gray900 }]}>{cfp.title}</Text>
        )}
        {cfp.description && (
          <Text style={[styles.cfpDescription, { color: colors.gray600 }]} numberOfLines={4}>{cfp.description}</Text>
        )}
        {cfp.deadline && (
          <View style={styles.deadlineRow}>
            <Ionicons name="time-outline" size={16} color={colors.gray500} />
            <Text style={[styles.deadlineText, { color: colors.gray600 }]}>
              Date limite : {formatDeadline(cfp.deadline)}
            </Text>
          </View>
        )}
        {cfp.topics && cfp.topics.length > 0 && (
          <View style={styles.topicsContainer}>
            <Text style={[styles.topicsLabel, { color: colors.gray600 }]}>Sujets :</Text>
            <View style={styles.topicsList}>
              {cfp.topics.map((topic, index) => (
                <View key={index} style={[styles.topicBadge, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.topicBadgeText, { color: colors.primary }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Proposals */}
      {proposals.length > 0 && (
        <>
          <Text style={[styles.subsectionTitle, { color: colors.gray900 }]}>Mes propositions</Text>
          {proposals.map((proposal) => {
            const statusBadge = getStatusBadge(proposal.status);
            const speakerName = getSpeakerName(proposal);
            return (
              <View key={proposal.id} style={[styles.proposalCard, { backgroundColor: colors.gray50 }]}>
                <View style={styles.proposalHeader}>
                  <Text style={[styles.proposalTitle, { color: colors.gray900 }]} numberOfLines={2}>{proposal.title}</Text>
                  <View style={[styles.proposalStatusBadge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.proposalStatusText, { color: statusBadge.color }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>
                {proposal.abstract && (
                  <Text style={[styles.proposalAbstract, { color: colors.gray600 }]} numberOfLines={2}>{proposal.abstract}</Text>
                )}
                {speakerName ? (
                  <View style={styles.speakerRow}>
                    <Ionicons name="person-outline" size={14} color={colors.gray500} />
                    <Text style={[styles.speakerName, { color: colors.gray600 }]}>{speakerName}</Text>
                  </View>
                ) : null}
                {proposal.talk_type && (
                  <View style={[styles.talkTypeBadge, { backgroundColor: colors.gray200 }]}>
                    <Text style={[styles.talkTypeText, { color: colors.gray600 }]}>{proposal.talk_type}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  subsectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  cfpStatusCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  cfpStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  cfpStatusText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
  },
  cfpTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  cfpDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  deadlineText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  topicsContainer: {
    marginTop: Spacing.sm,
  },
  topicsLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
    marginBottom: Spacing.xs,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  topicBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  topicBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  proposalCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  proposalTitle: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginRight: Spacing.sm,
  },
  proposalStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  proposalStatusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  proposalAbstract: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  speakerName: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  talkTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  talkTypeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
    textTransform: 'capitalize',
  },
});
