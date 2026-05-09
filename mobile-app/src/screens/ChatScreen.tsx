import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Search, Send } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../hooks/reduxHooks';
import { getAuthedSocket } from '../services/socket';

type SocialUser = { id: string; userId: string; name?: string; avatar?: string };
type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

type ChatListItem = {
  conversationId: string;
  peer: SocialUser | null;
  lastMessageAt?: string;
  lastMessageText?: string;
};

export default function ChatScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useAppSelector((s) => s.auth.user);
  const myId = me?.id ? String(me.id) : '';

  // Messages tab uses a transparent GlobalHeader. Push our content below it.
  const headerOffset = useMemo(() => Math.max(insets.top, 24) + 64, [insets.top]);
  // Tab bar is absolute-positioned in RootNavigator: bottom(14) + height(72)
  const tabBarOffset = useMemo(() => 14 + 72 + Math.max(insets.bottom, 0), [insets.bottom]);
  const bottomInset = useMemo(() => Math.max(insets.bottom, 0), [insets.bottom]);

  const [conversations, setConversations] = useState<ChatListItem[]>([]);
  const [convosLoading, setConvosLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);

  const [activePeer, setActivePeer] = useState<SocialUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const resetThread = useCallback(() => {
    setActivePeer(null);
    setConversationId(null);
    setMessages([]);
    setText('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Android hardware back should return to user list when a chat is open.
      const onBackPress = () => {
        if (activePeer) {
          resetThread();
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [activePeer, resetThread])
  );

  const showSearch = Boolean(query.trim());
  const listData = useMemo(() => (showSearch ? searchResults : conversations), [conversations, searchResults, showSearch]);

  useEffect(() => {
    const trimmed = query.trim();
    const t = setTimeout(async () => {
      if (!trimmed) {
        setSearching(false);
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(trimmed)}`);
        const items = ((res.data as any[]) || [])
          .map((u: any) => ({
            id: String(u?._id || ''),
            userId: String(u?.userId || ''),
            name: typeof u?.name === 'string' && u.name.trim() ? String(u.name) : String(u?.userId || ''),
            avatar: u?.profilePhoto ? String(u.profilePhoto) : '',
          }))
          .filter((u: SocialUser) => u.id && u.id !== myId);

        setSearchResults(items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [myId, query]);

  const fetchConversations = useCallback(async () => {
    setConvosLoading(true);
    try {
      const res = await api.get('/chat/list');
      const items = ((res.data?.items as any[]) || [])
        .map((c: any): ChatListItem => {
          const peer = c?.peer
            ? {
                id: String(c.peer.id || ''),
                userId: String(c.peer.userId || ''),
                name: typeof c.peer.name === 'string' ? String(c.peer.name) : '',
                avatar: typeof c.peer.avatar === 'string' ? String(c.peer.avatar) : '',
              }
            : null;

          return {
            conversationId: String(c?.conversationId || ''),
            peer: peer && peer.id ? peer : null,
            lastMessageAt: c?.lastMessageAt ? String(c.lastMessageAt) : undefined,
            lastMessageText: c?.lastMessageText ? String(c.lastMessageText) : undefined,
          };
        })
        .filter((c: ChatListItem) => Boolean(c.conversationId) && Boolean(c.peer?.id));

      setConversations(items);
    } catch {
      setConversations([]);
    } finally {
      setConvosLoading(false);
    }
  }, []);

  const openThread = useCallback(async (peer: SocialUser) => {
    setActivePeer(peer);
    setThreadLoading(true);
    setMessages([]);
    setConversationId(null);
    try {
      const res = await api.get(`/chat/${encodeURIComponent(peer.id)}`);
      setConversationId(String(res.data?.conversationId || ''));
      setMessages((res.data?.messages as ChatMessage[]) || []);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
    } catch (err: any) {
      setConversationId(null);
      setMessages([]);
      const serverMessage = String(err?.response?.data?.message || err?.response?.data?.error || '').trim();
      const status = err?.response?.status ? String(err.response.status) : '';
      const baseURL = String(err?.config?.baseURL || '').trim();
      const details = [status ? `HTTP ${status}` : '', baseURL ? `Server: ${baseURL}` : ''].filter(Boolean).join(' · ');

      let message = serverMessage || 'Unable to start chat. Please try again.';
      if (details) message = `${message}\n\n${details}`;
      Alert.alert('Cannot start chat', message);
      resetThread();
    } finally {
      setThreadLoading(false);
    }
  }, [resetThread]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!activePeer?.id || !trimmed || sending) return;

    const optimisticId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      _id: optimisticId,
      conversationId: String(conversationId || ''),
      senderId: String(myId || ''),
      recipientId: String(activePeer.id),
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    try {
      setMessages((prev) => [...prev, optimistic]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);

      const res = await api.post('/chat/send', { toUserId: String(activePeer.id), content: trimmed });
      const msg = res.data?.message as ChatMessage | undefined;
      const nextConversationId = String(res.data?.conversationId || conversationId || '');
      if (nextConversationId) setConversationId(nextConversationId);

      if (msg?._id) {
        setMessages((prev) => prev.map((m) => (m._id === optimisticId ? msg : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
        Alert.alert('Message not sent', 'Please try again.');
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      const serverMessage = String(err?.response?.data?.message || err?.response?.data?.error || '').trim();
      const status = err?.response?.status ? String(err.response.status) : '';
      const baseURL = String(err?.config?.baseURL || '').trim();
      const details = [status ? `HTTP ${status}` : '', baseURL ? `Server: ${baseURL}` : ''].filter(Boolean).join(' · ');

      let message = serverMessage || 'Please check your connection and try again.';
      if (details) message = `${message}\n\n${details}`;
      Alert.alert('Message not sent', message);
    } finally {
      setSending(false);
    }
  }, [activePeer?.id, conversationId, myId, sending, text]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activePeer) return;
    fetchConversations();
  }, [activePeer, fetchConversations]);

  useEffect(() => {
    if (!activePeer) return;
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToEnd({ animated: false });
      } catch {
        // ignore
      }
    }, 60);
    return () => clearTimeout(t);
  }, [activePeer?.id, messages.length]);

  useEffect(() => {
    let socketCleanup: (() => void) | null = null;

    (async () => {
      try {
        const socket = await getAuthedSocket();
        const handler = (payload: any) => {
          const cid = String(payload?.conversationId || '');
          const msg = payload?.message as ChatMessage | undefined;
          if (!cid || !msg?._id) return;
          if (conversationId && cid !== conversationId) return;
          if (!activePeer?.id) return;
          const peerOk =
            String(msg.senderId) === String(activePeer.id) || String(msg.recipientId) === String(activePeer.id);
          if (!peerOk) return;
          setMessages((prev) => {
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
        };
        socket.on('chat:message', handler);
        socketCleanup = () => socket.off('chat:message', handler);
      } catch {
        // ignore
      }
    })();

    return () => {
      socketCleanup?.();
    };
  }, [activePeer?.id, conversationId]);

  const renderPerson = ({ item }: { item: SocialUser }) => {
    const handle = item.userId || 'Trader';
    const displayName = item.name?.trim() ? item.name : handle;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.personRow, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => openThread(item)}
      >
        <View style={[styles.avatar, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
          >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarFallback, { color: colors.text }]}>{handle.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.personHandle, { color: colors.textSecondary }]} numberOfLines={1}>
            @{handle}
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
          >
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>Message</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }: { item: ChatListItem }) => {
    const peer = item.peer;
    if (!peer) return null;
    const handle = peer.userId || 'Trader';
    const displayName = peer.name?.trim() ? peer.name : handle;
    const preview = (item.lastMessageText || '').trim();

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.personRow, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => openThread(peer)}
      >
        <View style={[styles.avatar, { borderColor: colors.border, backgroundColor: colors.searchBg }]}>
          {peer.avatar ? (
            <Image source={{ uri: peer.avatar }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarFallback, { color: colors.text }]}>{handle.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.personHandle, { color: colors.textSecondary }]} numberOfLines={1}>
            @{handle}
            {preview ? `  ·  ${preview}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.searchBg }]}>
          <Text style={[styles.pillText, { color: colors.textSecondary }]}>Open</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = myId && String(item.senderId) === String(myId);
    return (
      <View style={[styles.msgRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.msgBubble,
            {
              backgroundColor: mine ? colors.verifiedBlue : colors.searchBg,
              borderColor: colors.border,
              alignSelf: mine ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          <Text style={[styles.msgText, { color: mine ? '#fff' : colors.text }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {!activePeer ? (
        <View style={[styles.pad, { paddingTop: headerOffset + 12 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your recent chats.</Text>
          </View>

          <BlurView
            intensity={theme === 'light' ? 0 : 18}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={[styles.searchShell, { backgroundColor: colors.searchBg, borderColor: colors.border }]}
          >
            <Search size={18} color={colors.textSecondary} strokeWidth={2.2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search users…"
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? <ActivityIndicator size="small" color={colors.verifiedBlue} /> : null}
          </BlurView>

          {showSearch ? (
            listData.length === 0 && !searching ? (
              <View style={styles.centerState}>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>No users found.</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(u) => u.id}
                renderItem={renderPerson}
                contentContainerStyle={{ paddingBottom: tabBarOffset + 18 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            )
          ) : convosLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.verifiedBlue} />
              <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 10 }]}>Loading…</Text>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>No chats yet.</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={fetchConversations}
                style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
              >
                <Text style={[styles.refreshText, { color: colors.text }]}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(c) => c.conversationId}
              renderItem={renderConversation}
              contentContainerStyle={{ paddingBottom: tabBarOffset + 18 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={{ flex: 1 }}
        >
          <View
            style={[
              styles.threadWrap,
              {
                paddingTop: headerOffset,
                paddingBottom: keyboardVisible ? bottomInset : tabBarOffset,
              },
            ]}
          >
            <View
              style={[styles.threadHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  resetThread();
                }}
                style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
              >
                <ArrowLeft size={18} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>
                  @{activePeer.userId}
                </Text>
                <Text style={[styles.threadSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {activePeer.name?.trim() ? activePeer.name : 'Direct message'}
                </Text>
              </View>
            </View>

            {threadLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.verifiedBlue} />
                <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 10 }]}>Loading chat…</Text>
              </View>
            ) : (
              <FlatList
                ref={(r) => {
                  listRef.current = r;
                }}
                data={messages}
                keyExtractor={(m) => m._id}
                renderItem={renderMessage}
                contentContainerStyle={[styles.msgListPad, { paddingBottom: 12 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              />
            )}

            <BlurView
              intensity={theme === 'light' ? 0 : 18}
              tint={theme === 'light' ? 'light' : 'dark'}
              style={[
                styles.composer,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write a message…"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.searchBg, borderColor: colors.border },
                ]}
                multiline
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={send}
                disabled={sending || !text.trim()}
                style={[
                  styles.sendBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.verifiedBlue,
                    opacity: sending || !text.trim() ? 0.55 : 1,
                  },
                ]}
              >
                <Send size={18} color="#fff" strokeWidth={2.4} />
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pad: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  centerState: {
    paddingTop: 26,
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    fontWeight: '700',
  },
  refreshBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  refreshText: {
    fontWeight: '900',
    fontSize: 13,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontWeight: '900',
    fontSize: 14,
  },
  personName: {
    fontSize: 14,
    fontWeight: '900',
  },
  personHandle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  threadWrap: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  threadSubtitle: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  msgListPad: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 90,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  msgText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  composer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
