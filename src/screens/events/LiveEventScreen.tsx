import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { liveAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

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
  const { eventId } = route.params;

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
      setQuestions(questionsRes.data.results || questionsRes.data || []);
      setPolls(pollsRes.data.results || pollsRes.data || []);
    } catch (error) {
      console.error('Erreur live event:', error);
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
        event: eventId,
        content: trimmed,
        is_anonymous: isAnonymous,
      });
      setNewQuestion('');
      setIsAnonymous(false);
      fetchData();
    } catch (error) {
      console.error('Erreur envoi question:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la question.');
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
      console.error('Erreur upvote:', error);
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
      console.error('Erreur vote:', error);
      Alert.alert('Erreur', 'Impossible de voter.');
    } finally {
      setVotingId(null);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderQuestion = ({ item }: { item: Question }) => (
    <View style={[styles.questionCard, item.is_answered && styles.answeredCard]}>
      <TouchableOpacity
        style={[styles.upvoteButton, item.has_upvoted && styles.upvoted]}
        onPress={() => handleUpvote(item.id)}
      >
        <Ionicons
          name={item.has_upvoted ? 'arrow-up' : 'arrow-up-outline'}
          size={20}
          color={item.has_upvoted ? Colors.primary : Colors.textLight}
        />
        <Text style={[styles.upvoteCount, item.has_upvoted && styles.upvotedText]}>
          {item.upvotes_count}
        </Text>
      </TouchableOpacity>
      <View style={styles.questionContent}>
        <Text style={styles.questionText}>{item.content}</Text>
        <View style={styles.questionMeta}>
          <Text style={styles.questionAuthor}>
            {item.is_anonymous ? 'Anonyme' : item.author_name || 'Participant'}
          </Text>
          <Text style={styles.questionTime}>{formatTime(item.created_at)}</Text>
          {item.is_answered && (
            <View style={styles.answeredBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
              <Text style={styles.answeredText}>Repondue</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderPoll = ({ item }: { item: Poll }) => {
    const isVoting = votingId === item.id;

    return (
      <View style={styles.pollCard}>
        <Text style={styles.pollQuestion}>{item.question}</Text>
        <Text style={styles.pollVoteCount}>
          {item.total_votes} vote{item.total_votes !== 1 ? 's' : ''}
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
                item.has_voted && styles.pollOptionVoted,
                isVotedOption && styles.pollOptionSelected,
              ]}
              onPress={() => !item.has_voted && handleVote(item.id, option.id)}
              disabled={item.has_voted || isVoting || !item.is_active}
            >
              {/* Progress bar background */}
              {item.has_voted && (
                <View
                  style={[
                    styles.pollProgressBar,
                    { width: `${percentage}%` },
                    isVotedOption && styles.pollProgressBarSelected,
                  ]}
                />
              )}
              <View style={styles.pollOptionContent}>
                <Text
                  style={[
                    styles.pollOptionText,
                    isVotedOption && styles.pollOptionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
                {item.has_voted && (
                  <Text
                    style={[
                      styles.pollPercentage,
                      isVotedOption && styles.pollPercentageSelected,
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
            color={Colors.primary}
            style={{ marginTop: Spacing.sm }}
          />
        )}

        {!item.is_active && (
          <Text style={styles.pollClosed}>Sondage termine</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>EN DIRECT</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && styles.activeTab]}
          onPress={() => setActiveTab('questions')}
        >
          <Ionicons
            name="help-circle-outline"
            size={16}
            color={activeTab === 'questions' ? Colors.primary : Colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'questions' && styles.activeTabText]}>
            Questions ({questions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'polls' && styles.activeTab]}
          onPress={() => setActiveTab('polls')}
        >
          <Ionicons
            name="bar-chart-outline"
            size={16}
            color={activeTab === 'polls' ? Colors.primary : Colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'polls' && styles.activeTabText]}>
            Sondages ({polls.length})
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>Aucune question pour le moment</Text>
                <Text style={styles.emptySubtext}>Soyez le premier a poser une question !</Text>
              </View>
            }
            renderItem={renderQuestion}
          />

          {/* Question Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.anonymousToggle, isAnonymous && styles.anonymousActive]}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons
                name={isAnonymous ? 'eye-off' : 'eye-off-outline'}
                size={20}
                color={isAnonymous ? Colors.primary : Colors.textLight}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Poser une question..."
              placeholderTextColor={Colors.textLight}
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newQuestion.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmitQuestion}
              disabled={!newQuestion.trim() || submitting}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Aucun sondage pour le moment</Text>
              <Text style={styles.emptySubtext}>Les sondages de l'evenement apparaitront ici.</Text>
            </View>
          }
          renderItem={renderPoll}
        />
      )}
    </SafeAreaView>
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
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
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
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
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
