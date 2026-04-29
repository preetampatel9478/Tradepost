import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  Rocket,
  Search,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { logout } from '../redux/slices/authSlice';

type Sentiment = 'BULLISH' | 'BEARISH';

interface OpinionPost {
  id: string;
  userName: string;
  handle: string;
  avatar?: string;
  verified: boolean;
  sentiment: Sentiment;
  tradeType: string;
  content: string;
  visualLabel: string;
  likes: number;
  comments: number;
  shares: number;
}

const POSTS: OpinionPost[] = [
  {
    id: '1',
    userName: 'Aarav Mehta',
    handle: '@aarav_trades',
    verified: true,
    sentiment: 'BULLISH',
    tradeType: 'F&O Trade',
    content:
      'Momentum is still intact after the pullback. Watching the breakout zone with disciplined risk on the invalidation level.',
    visualLabel: 'P&L snapshot',
    likes: 128,
    comments: 24,
    shares: 9,
  },
  {
    id: '2',
    userName: 'Neha Sharma',
    handle: '@neha_marketview',
    verified: false,
    sentiment: 'BEARISH',
    tradeType: 'Next Day Prediction',
    content:
      'Weak breadth and repeated rejection near resistance keep me cautious. I am waiting for confirmation before adding exposure.',
    visualLabel: 'News capture',
    likes: 76,
    comments: 13,
    shares: 6,
  },
];

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name ?? 'Trader';
  const userAvatar = user?.avatar;
  const userInitials = getInitials(userName);
  const currentUserVerified = user?.isVerified ?? false;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={[styles.topGlow, styles.topGlowOne]} />
      <View style={[styles.topGlow, styles.topGlowTwo]} />
      <View style={[styles.topGlow, styles.topGlowThree]} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.85} style={styles.profileButton}>
            <View style={styles.profileAvatarWrap}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>P</Text>
              </View>
              <View style={styles.profileAvatar}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitials}>{userInitials}</Text>
              )}
              <View style={styles.activeDot} />
              </View>
            </View>
          </TouchableOpacity>

          <BlurView intensity={28} tint="dark" style={styles.searchShell}>
            <Search size={18} color="#94A3B8" strokeWidth={2.2} />
            <TextInput
              placeholder="Search users or stocks..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              editable={false}
            />
          </BlurView>
        </View>

        <View style={styles.feedIntroCard}>
          <View style={styles.feedIntroTopRow}>
            <View>
              <Text style={styles.feedIntroLabel}>VideTrader</Text>
              <Text style={styles.feedIntroTitle}>Social trading built for SEBI-aware opinions</Text>
            </View>
            <View style={styles.verificationPill}>
              <BadgeCheck size={16} color="#3B82F6" strokeWidth={2.5} />
              <Text style={styles.verificationText}>{currentUserVerified ? 'Verified' : 'Pending'}</Text>
            </View>
          </View>
          <Text style={styles.feedIntroText}>
            Share research, follow sentiment, and keep every opinion tied to a hard-coded safety disclaimer.
          </Text>
        </View>

        {POSTS.map((post) => (
          <OpinionCard key={post.id} post={post} />
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={() => dispatch(logout())} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function OpinionCard({ post }: { post: OpinionPost }) {
  const bullish = post.sentiment === 'BULLISH';

  return (
    <View style={styles.cardShell}>
      <BlurView intensity={22} tint="dark" style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.identityRow}>
            <View style={styles.cardAvatarWrap}>
              <View style={styles.cardAvatarFallback}>
                <Text style={styles.cardAvatarText}>{getInitials(post.userName)}</Text>
              </View>
              {post.verified ? (
                <View style={styles.tickBadge}>
                  <BadgeCheck size={15} color="#3B82F6" strokeWidth={2.6} />
                </View>
              ) : null}
            </View>

            <View style={styles.identityCopy}>
              <Text style={styles.cardName}>{post.userName}</Text>
              <Text style={styles.cardHandle}>{post.handle}</Text>
            </View>
          </View>

          <View style={[styles.sentimentBadge, bullish ? styles.bullishBadge : styles.bearishBadge]}>
            {bullish ? (
              <Rocket size={15} color="#22C55E" strokeWidth={2.4} />
            ) : (
              <TrendingDown size={15} color="#F97316" strokeWidth={2.6} />
            )}
            <Text style={[styles.sentimentText, bullish ? styles.bullishText : styles.bearishText]}>{post.sentiment}</Text>
          </View>
        </View>

        <View style={styles.tradeTypePill}>
          <Text style={styles.tradeTypeText}>{post.tradeType}</Text>
        </View>

        <Text style={styles.postContent}>{post.content}</Text>

        <View style={styles.visualShell}>
          <View style={styles.visualHeader}>
            <Text style={styles.visualLabel}>{post.visualLabel}</Text>
            <Text style={styles.visualMeta}>Tap to expand</Text>
          </View>
          <View style={styles.pnlShell}>
            <View style={styles.pnlHeaderRow}>
              <View>
                <Text style={styles.pnlTitle}>P&amp;L Snapshot</Text>
                <Text style={styles.pnlMeta}>Clean table preview</Text>
              </View>
              <View style={styles.pnlButton}>
                <Text style={styles.pnlButtonText}>Screenshot / P&amp;L</Text>
              </View>
            </View>
            <View style={styles.pnlTable}>
              <View style={styles.pnlTableRow}>
                <Text style={styles.pnlCellLabel}>Entry</Text>
                <Text style={styles.pnlCellValue}>₹ 1,245.20</Text>
              </View>
              <View style={styles.pnlTableRow}>
                <Text style={styles.pnlCellLabel}>Current</Text>
                <Text style={[styles.pnlCellValue, styles.pnlPositive]}>₹ 1,311.80</Text>
              </View>
              <View style={styles.pnlTableRow}>
                <Text style={styles.pnlCellLabel}>Net P&amp;L</Text>
                <Text style={[styles.pnlCellValue, styles.pnlPositive]}>+ 5.34%</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.engagementRow}>
          <TouchableOpacity style={styles.engagementItem} activeOpacity={0.8}>
            <Heart size={18} color="#E2E8F0" strokeWidth={2.2} />
            <Text style={styles.engagementText}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementItem} activeOpacity={0.8}>
            <MessageCircle size={18} color="#E2E8F0" strokeWidth={2.2} />
            <Text style={styles.engagementText}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementItem} activeOpacity={0.8}>
            <Share2 size={18} color="#E2E8F0" strokeWidth={2.2} />
            <Text style={styles.engagementText}>{post.shares}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementItem} activeOpacity={0.8}>
            <Bookmark size={18} color="#E2E8F0" strokeWidth={2.2} />
            <Text style={styles.engagementText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerBar}>
          <Text style={styles.disclaimerText}>
            This post is my opinion, not a suggestion. Consult a SEBI registered advisor before investing.
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'VT';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  topGlow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.85,
  },
  topGlowOne: {
    top: -120,
    right: -60,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  topGlowTwo: {
    top: 160,
    left: -90,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  topGlowThree: {
    bottom: 240,
    right: -100,
    width: 240,
    height: 240,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 12,
    marginBottom: 14,
  },
  profileButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    left: -2,
    zIndex: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  pendingBadgeText: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '800',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitials: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  activeDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  searchShell: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  feedIntroCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  feedIntroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedIntroLabel: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  feedIntroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    maxWidth: '88%',
  },
  feedIntroText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  verificationText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '700',
  },
  cardShell: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardAvatarWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tickBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#0F172A',
    borderRadius: 999,
  },
  identityCopy: {
    flex: 1,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardHandle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  bullishBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(34, 197, 94, 0.22)',
  },
  bearishBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  bullishText: {
    color: '#86EFAC',
  },
  bearishText: {
    color: '#FDBA74',
  },
  tradeTypePill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tradeTypeText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  postContent: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  visualShell: {
    marginBottom: 14,
  },
  visualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visualLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  visualMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pnlShell: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  pnlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  pnlTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  pnlMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pnlButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pnlButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  pnlTable: {
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  pnlTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pnlCellLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pnlCellValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pnlPositive: {
    color: '#86EFAC',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  engagementText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  disclaimerText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

