import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { logout } from '../redux/slices/authSlice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name ?? 'Trader';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#07111D" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.bgGlowTop} />
        <View style={styles.bgGlowBottom} />

        <View style={styles.heroCard}>
          <Text style={styles.title}>Welcome back, {userName}</Text>
          <Text style={styles.subtitle}>Track momentum, share opinions, and stay close to the market pulse.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s pulse</Text>
          <Text style={styles.sectionMeta}>Live market snapshot</Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTag}>Momentum</Text>
          <Text style={styles.featureTitle}>Mixed risk, strong participation in tech and energy</Text>
          <Text style={styles.featureText}>Your feed will surface the strongest stock ideas, short takes, and discussion threads here.</Text>
        </View>

        <View style={styles.actionGrid}>
          <View style={styles.actionCard}>
            <Text style={styles.actionLabel}>Watch</Text>
            <Text style={styles.actionValue}>Shorts</Text>
          </View>
          <View style={styles.actionCardAccent}>
            <Text style={styles.actionLabel}>Share</Text>
            <Text style={styles.actionValue}>Opinion</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => dispatch(logout())}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07111D',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(110, 243, 165, 0.16)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: 40,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(63, 112, 255, 0.14)',
  },
  heroCard: {
    backgroundColor: '#0E1A2A',
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: '#B2BACB',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#7F8BA0',
    fontSize: 12,
    fontWeight: '600',
  },
  featureCard: {
    backgroundColor: '#121F33',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  featureTag: {
    color: '#6EF3A5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    marginBottom: 10,
  },
  featureText: {
    color: '#B2BACB',
    fontSize: 15,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  actionCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: '#0E1624',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'space-between',
  },
  actionCardAccent: {
    flex: 1,
    minHeight: 112,
    backgroundColor: 'rgba(110, 243, 165, 0.12)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(110, 243, 165, 0.2)',
    justifyContent: 'space-between',
  },
  actionLabel: {
    color: '#91A0B7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  logoutButton: {
    marginTop: 4,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#121C2E',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

