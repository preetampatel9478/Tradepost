import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

type TrendingTag = {
  tag: string;
  count: number;
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput | null>(null);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TrendingTag[]>([]);

  const trimmed = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const url = trimmed
          ? `/stocks/tags/search?q=${encodeURIComponent(trimmed)}`
          : `/stocks/tags/trending`;
        const res = await api.get(url);
        setItems((res.data as TrendingTag[]) || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [trimmed]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 12 }}>
        <BlurView
          intensity={theme === 'light' ? 0 : 28}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={[styles.searchShell, { backgroundColor: colors.searchBg, borderColor: colors.border }]}
        >
          <Search size={18} color={colors.textSecondary} strokeWidth={2.2} />
          <TextInput
            ref={(r) => {
              inputRef.current = r;
            }}
            value={q}
            onChangeText={setQ}
            placeholder="Search stocks / tags…"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </BlurView>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator />
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>Searching…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.bearish }]}>{error}</Text>
        </View>
      ) : trimmed && items.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.tag}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const parent = navigation.getParent?.();
                if (parent) parent.navigate('TagFeed', { tag: item.tag });
                else navigation.navigate('TagFeed', { tag: item.tag });
              }}
              style={[styles.userRow, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.userTitle, { color: colors.text }]}>{item.tag}</Text>
                <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>{item.count} posts</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchShell: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  centerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  userRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  userSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
