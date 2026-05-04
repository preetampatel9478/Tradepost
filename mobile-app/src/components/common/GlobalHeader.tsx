import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Clock, CheckCircle } from 'lucide-react-native';
import { useAppSelector } from '../../hooks/reduxHooks';
import ProfileModal from './ProfileModal';

interface GlobalHeaderProps {
  title: string;
}

export default function GlobalHeader({ title }: GlobalHeaderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const isVerified = user?.isVerified ?? false;

  return (
    <>
      <BlurView intensity={30} tint="dark" style={[styles.blurWrapper, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.topHeader}>
          {/* Top-Left Profile Trigger */}
          <TouchableOpacity activeOpacity={0.8} style={styles.profileTrigger} onPress={() => setModalVisible(true)}>
            <View style={styles.avatarWrapSmall}>
              <Text style={styles.avatarTextSmall}>TP</Text>
              
              {/* Active Session Badge superimposed on avatar */}
              <View style={styles.activeSessionBadge} />

              {/* Status Icon */}
              <View style={styles.statusIconWrap}>
                {isVerified ? (
                  <CheckCircle size={14} color="#3B82F6" strokeWidth={3} />
                ) : (
                  <Clock size={14} color="#F59E0B" strokeWidth={3} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Centered Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>

          {/* Right Placeholder (to maintain center balance) */}
          <View style={styles.rightPlaceholder} />
        </View>
      </BlurView>

      <ProfileModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  blurWrapper: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  profileTrigger: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  avatarWrapSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    position: 'relative',
  },
  avatarTextSmall: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeSessionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981', // Green for active
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  statusIconWrap: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#0F172A',
    borderRadius: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightPlaceholder: {
    width: 48,
    height: 48,
  },
});
