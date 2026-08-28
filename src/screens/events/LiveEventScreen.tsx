import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { liveAPI, eventsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LiveEventRouteProp = RouteProp<RootStackParamList, 'LiveEvent'>;

interface Question {
  id: string;
  content: string;
  author_name?: string;
  is_anonymous: boolean;
  upvotes_count: number;
  has_upvoted?: boolean;
  is_answered?: boolean;
  created_at: string;
}

interface PollOption {
  id: string;
  text: string;
  votes_count: number;
  percentage?: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  has_voted?: boolean;
  voted_option?: string;
  is_active: boolean;
  created_at: string;
}

export default function LiveEventScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LiveEventRouteProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { toastError } = useFeedback();
  const { eventId } = route.params;

  // UUID réel de l'event : `eventId` (route param) peut être un SLUG, or
  // createQuestion POST exige l'UUID strict (FK backend). Résolu au chargement.
  const [resolvedEventId, setResolvedEventId] = useState<string>(eventId);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'polls'>('questions');
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [questionsRes, pollsRes] = await Promise.all([
        liveAPI.getQuestionsByEvent(eventId),
        liveAPI.getPollsByEvent(eventId),
      ]);
      const qList = questionsRes.data.results || questionsRes.data || [];
      const pList = pollsRes.data.results || pollsRes.data || [];
      setQuestions(qList);
      setPolls(pList);
      // Résout l'UUID event depuis une question/poll existante, sinon getEvent.
      const fromItem = (qList.find((q: any) => q.event) as any)?.event
        || (pList.find((p: any) => p.event) as any)?.event;
      if (fromItem) {
        setResolvedEventId(String(fromItem));
      } else {
        try {
          const ev = await eventsAPI.getEvent(eventId);
          if (ev?.data?.id) setResolvedEventId(String(ev.data.id));
        } catch { /* garde le param brut */ }
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur live event:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [eventId]);

  const handleSubmitQuestion = async () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await liveAPI.createQuestion({
        event: resolvedEventId,
        content: trimmed,
        is_anonymous: isAnonymous,
      });
      setNewQuestion('');
      setIsAnonymous(false);
      fetchData();
    } catch (error) {
      if (__DEV__) console.error('Erreur envoi question:', error);
      toastError(t('liveEvent.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId: string) => {
    try {
      await liveAPI.upvoteQuestion(questionId);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                has_upvoted: !q.has_upvoted,
                upvotes_count: q.has_upvoted ? q.upvotes_count - 1 : q.upvotes_count + 1,
              }
            : q
        )
      );
    } catch (error) {
      if (__DEV__) console.error('Erreur upvote:', error);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVotingId(pollId);
    try {
      await liveAPI.vote({ poll: pollId, option: optionId });
      // Refresh poll results
      const resultsRes = await liveAPI.getPollResults(pollId);
      const updatedPoll = resultsRes.data;
      setPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, ...updatedPoll, has_voted: true, voted_option: optionId } : p))
      );
    } catch (error) {
      if (__DEV__) console.error('Erreur vote:', error);
      toastError(t('liveEvent.voteError'));
    } finally {
      setVotingId(null);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderQuestion = ({ item }: { item: Question }) => (
    <View style={[styles.questionCard, { backgroundColor: colors.card }, item.is_answered && { borderLeftWidth: 3, borderLeftColor: colors.success }]}>
      <TouchableOpacity
        style={[styles.upvoteButton, { backgroundColor: colors.gray50 }, item.has_upvoted && { backgroundColor: colors.primaryBg }]}
        onPress={() => handleUpvote(item.id)}
      >
        <Ionicons
          name={item.has_upvoted ? 'arrow-up' : 'arrow-up-outline'}
          size={20}
          color={item.has_upvoted ? colors.primary : colors.textLight}
        />
        <Text style={[styles.upvoteCount, { color: colors.textLight }, item.has_upvoted && { color: colors.primary }]}>
          {item.upvotes_count}
        </Text>
      </TouchableOpacity>
      <View style={styles.questionContent}>
        <Text style={[styles.questionText, { color: colors.text }]}>{item.content}</Text>
        <View style={styles.questionMeta}>
          <Text style={[styles.questionAuthor, { color: colors.textSecondary }]}>
            {item.is_anonymous ? t('liveEvent.anonymous') : item.author_name || t('liveEvent.participant')}
          </Text>
          <Text style={[styles.questionTime, { color: colors.textLight }]}>{formatTime(item.created_at)}</Text>
          {item.is_answered && (
            <View style={styles.answeredBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.answeredText, { color: colors.success }]}>{t('liveEvent.answered')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderPoll = ({ item }: { item: Poll }) => {
    const isVoting = votingId === item.id;

    return (
      <View style={[styles.pollCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.pollQuestion, { color: colors.text }]}>{item.question}</Text>
        <Text style={[styles.pollVoteCount, { color: colors.textLight }]}>
          {t('liveEvent.vote', { count: item.total_votes })}
        </Text>

        {item.options.map((option) => {
          const percentage =
            item.total_votes > 0
              ? Math.round((option.votes_count / item.total_votes) * 100)
              : 0;
          const isVotedOption = item.voted_option === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.pollOption,
                { borderColor: colors.border },
                item.has_voted && { borderColor: colors.gray200 },
                isVotedOption && { borderColor: colors.primary },
              ]}
              onPress={() => !item.has_voted && handleVote(item.id, option.id)}
              disabled={item.has_voted || isVoting || !item.is_active}
            >
              {/* Progress bar background */}
              {item.has_voted && (
                <View
                  style={[
                    styles.pollProgressBar,
                    { width: `${percentage}%`, backgroundColor: colors.primaryBg },
                    isVotedOption && { backgroundColor: colors.primaryBg },
                  ]}
                />
              )}
              <View style={styles.pollOptionContent}>
                <Text
                  style={[
                    styles.pollOptionText,
                    { color: colors.text },
                    isVotedOption && { color: colors.primary },
                  ]}
                >
                  {option.text}
                </Text>
                {item.has_voted && (
                  <Text
                    style={[
                      styles.pollPercentage,
                      { color: colors.textSecondary },
                      isVotedOption && { color: colors.primary },
                    ]}
                  >
                    {percentage}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {isVoting && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginTop: Spacing.sm }}
          />
        )}

        {!item.is_active && (
          <Text style={[styles.pollClosed, { color: colors.textLight }]}>{t('liveEvent.pollClosed')}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>LIVE</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <LoadingSpinner />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>LIVE</WatermarkNumeral>
    <KeyboardAvoidingView style={{ flex: 1, zIndex: 1 }} behavior="padding">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('liveEvent.title')}</Text>
        <View style={[styles.liveBadge, { backgroundColor: colors.errorLight }]}>
          <View style={[styles.liveIndicator, { backgroundColor: colors.error }]} />
          <Text style={[styles.liveText, { color: colors.error }]}>{t('liveEvent.liveBadge')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('questions')}
        >
          <Ionicons
            name="help-circle-outline"
            size={16}
            color={activeTab === 'questions' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'questions' && { color: colors.primary }]}>
            {t('liveEvent.tabQuestions', { count: questions.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'polls' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('polls')}
        >
          <Ionicons
            name="bar-chart-outline"
            size={16}
            color={activeTab === 'polls' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'polls' && { color: colors.primary }]}>
            {t('liveEvent.tabPolls', { count: polls.length })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'questions' ? (
        <>
          <FlatList
            data={questions}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('liveEvent.noQuestions')}</Text>
                <Text style={[styles.emptySubtext, { color: colors.textLight }]}>{t('liveEvent.beFirstQuestion')}</Text>
              </View>
            }
            renderItem={renderQuestion}
          />

          {/* Question Input */}
          <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.anonymousToggle, { backgroundColor: colors.gray100 }, isAnonymous && { backgroundColor: colors.primaryBg }]}
              onPress={() => setIsAnonymous(!isAnonymous)}
              accessibilityRole="button"
              accessibilityLabel={t('liveEvent.anonymous')}
            >
              <Ionicons
                name={isAnonymous ? 'eye-off' : 'eye-off-outline'}
                size={20}
                color={isAnonymous ? colors.primary : colors.textLight}
              />
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.gray50 }]}
              placeholder={t('liveEvent.questionPlaceholder')}
              placeholderTextColor={colors.textLight}
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }, !newQuestion.trim() && { backgroundColor: colors.gray300 }]}
              onPress={handleSubmitQuestion}
              disabled={!newQuestion.trim() || submitting}
              accessibilityRole="button"
              accessibilityLabel={t('common.send', 'Envoyer')}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={polls}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('liveEvent.noPolls')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>{t('liveEvent.noPollsHint')}</Text>
            </View>
          }
          renderItem={renderPoll}
        />
      )}
    </KeyboardAvoidingView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, marginRight: 6 },
  liveText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  activeTab: { backgroundColor: Colors.white, ...Shadows.md },
  tabText: { fontSize: FontSizes.sm, color: Colors.textLight, fontWeight: '600' },
  activeTabText: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, ...centeredContent(WIDE_MAX) },
  // Questions
  questionCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  answeredCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  upvoteButton: { alignItems: 'center', justifyContent: 'center', width: 44, marginRight: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, backgroundColor: Colors.gray50 },
  upvoted: { backgroundColor: Colors.primaryBg },
  upvoteCount: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textLight, marginTop: 2 },
  upvotedText: { color: Colors.primary },
  questionContent: { flex: 1 },
  questionText: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 20 },
  questionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: Spacing.sm },
  questionAuthor: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  questionTime: { fontSize: FontSizes.xs, color: Colors.textLight },
  answeredBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  answeredText: { fontSize: FontSizes.xs, color: Colors.success, fontWeight: '600' },
  // Polls
  pollCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  pollQuestion: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  pollVoteCount: { fontSize: FontSizes.xs, color: Colors.textLight, marginBottom: Spacing.md },
  pollOption: { borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.xs, overflow: 'hidden', position: 'relative' },
  pollOptionVoted: { borderColor: Colors.gray200 },
  pollOptionSelected: { borderColor: Colors.primary },
  pollProgressBar: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  pollProgressBarSelected: { backgroundColor: Colors.primaryBg },
  pollOptionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, zIndex: 1 },
  pollOptionText: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500', flex: 1 },
  pollOptionTextSelected: { color: Colors.primary, fontWeight: '700' },
  pollPercentage: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginLeft: Spacing.sm },
  pollPercentageSelected: { color: Colors.primary },
  pollClosed: { textAlign: 'center', fontSize: FontSizes.xs, color: Colors.textLight, fontStyle: 'italic', marginTop: Spacing.sm },
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white, ...centeredContent(WIDE_MAX) },
  anonymousToggle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: Colors.gray100, marginRight: Spacing.xs, marginBottom: 2 },
  anonymousActive: { backgroundColor: Colors.primaryBg },
  textInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text, backgroundColor: Colors.gray50, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 80, marginRight: Spacing.xs },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendButtonDisabled: { backgroundColor: Colors.gray300 },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textLight, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textLight, marginTop: Spacing.xs, textAlign: 'center' },
});
