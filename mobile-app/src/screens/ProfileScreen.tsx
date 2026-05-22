import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Flame, Users, UserPlus, Clock, Check, ShieldCheck } from 'lucide-react-native';

type AllianceState = 'default' | 'pending' | 'accepted' | 'incoming';

export default function ProfileScreen() {
  const [allianceState, setAllianceState] = useState<AllianceState>('default');
  const allianceCount = 142; // hardcoded for display
  const isVerified = true;

  const handleAlliancePress = () => {
    setAllianceState(prev => {
      switch (prev) {
        case 'default': return 'pending';
        case 'pending': return 'accepted';
        case 'accepted': return 'incoming';
        case 'incoming': return 'default';
        default: return 'default';
      }
    });
  };

  const getAllianceButtonConfig = () => {
    switch(allianceState) {
      case 'accepted': 
        return { text: 'In Alliance', color: '#1A1A2E', bg: '#6EF3A5', icon: <Check size={18} color="#1A1A2E" /> };
      case 'pending': 
        return { text: 'Alliance Request Sent', color: '#A0A0B0', bg: 'rgba(255,255,255,0.08)', icon: <Clock size={18} color="#A0A0B0" /> };
      case 'incoming': 
        return { text: 'Accept Alliance', color: '#1A1A2E', bg: '#6EF3A5', icon: <UserPlus size={18} color="#1A1A2E" /> };
      default: 
        return { text: 'Send Alliance Request', color: '#FFFFFF', bg: '#4A55A2', icon: <UserPlus size={18} color="#FFFFFF" /> };
    }
  };

  const btnConfig = getAllianceButtonConfig();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>TD</Text>
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.username}>@TradeGod</Text>
            {isVerified && <ShieldCheck size={22} color="#6EF3A5" fill="#1A1A2E" />}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Flame size={16} color="#FF5A5F" />
              <Text style={styles.statText}>30 Day Streak</Text>
            </View>
            <View style={styles.statBadge}>
              <Users size={16} color="#6EF3A5" />
              <Text style={styles.statText}>{allianceCount} Alliance Members</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.allianceButton, { backgroundColor: btnConfig.bg }]}
            onPress={handleAlliancePress}
            activeOpacity={0.8}
          >
            {btnConfig.icon}
            <Text style={[styles.allianceButtonText, { color: btnConfig.color }]}>
              {btnConfig.text}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E', // Premium finance dark mode background
  },
  content: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  profileCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4A55A2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
  },
  allianceButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  allianceButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
