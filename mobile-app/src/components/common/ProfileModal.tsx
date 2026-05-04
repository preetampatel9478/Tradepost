import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  Switch,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Settings, Bell, CircleHelp, User, LogOut, ChevronRight, Moon } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { logout } from '../../store/slices/authSlice';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

const { width } = Dimensions.get('window');

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.userId || user?.name || 'TradePost User';
  const userHandle = user?.userId ? `@${user.userId}` : '';
  const joinedText = user?.createdAt ? `Joined ${new Date(user.createdAt).toDateString()}` : '';
  const isVerified = user?.isVerified ?? false;
  const { colors, theme, themeMode, setThemeMode } = useTheme();

  const [profileStats, setProfileStats] = useState<{ followerCount: number; followingCount: number; postCount: number }>(
    { followerCount: 0, followingCount: 0, postCount: 0 }
  );
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const translateX = useRef(new Animated.Value(-width)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: visible ? 0 : -width,
        damping: 20,
        stiffness: 140,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;

    (async () => {
      try {
        const res = await api.get('/users/me');
        const data = res.data as {
          followerCount?: number;
          followingCount?: number;
          postCount?: number;
          avatar?: string;
        };

        if (!isMounted) return;
        setProfileStats({
          followerCount: Number(data.followerCount ?? 0),
          followingCount: Number(data.followingCount ?? 0),
          postCount: Number(data.postCount ?? 0),
        });
        setProfileAvatar(data.avatar && String(data.avatar).trim() ? String(data.avatar) : null);
      } catch {
        // Keep existing state; fail silently for now.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const formatCount = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'TU';

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: -width,
        damping: 20,
        stiffness: 140,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const handleLogout = () => {
    handleClose();
    setTimeout(() => {
      dispatch(logout());
    }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity, backgroundColor: theme === 'light' ? 'rgba(15, 23, 42, 0.2)' : 'rgba(15, 23, 42, 0.6)' }]}>
            <BlurView intensity={theme === 'light' ? 5 : 20} tint={theme === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFillObject} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }], backgroundColor: colors.background, borderColor: colors.border }]}>
          <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.avatarLarge, { borderColor: colors.verifiedBlue, backgroundColor: colors.card }]}>
              {profileAvatar || user?.avatar ? (
                <Image source={{ uri: profileAvatar || user?.avatar }} style={styles.avatarImageLarge} />
                ) : (
                <Text style={[styles.avatarTextLarge, { color: colors.text }]}>{initials}</Text>
                )}
                {isVerified && (
                  <View style={[styles.verificationBadge, { backgroundColor: colors.background }]}>
                    <View style={[styles.verificationInner, { borderColor: colors.background }]} />
                  </View>
                )}
              </View>
              <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
              {userHandle ? <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{userHandle}</Text> : null}
              {joinedText ? (
                <Text style={[styles.userHandle, { color: colors.textSecondary, marginTop: 6 }]}>{joinedText}</Text>
              ) : null}
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)' }]}>
              <View style={styles.statColumn}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.followerCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statColumn}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.postCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statColumn}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.followingCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
              </View>
            </View>

            {/* Menu List */}
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <User size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>My Profile</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Edit and check out what you post</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Settings size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Account Settings</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Privacy, security, language</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Bell size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Notification</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Push, email alerts</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <CircleHelp size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Help Support</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>FAQs, contact us</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Theme Toggle */}
              <View style={styles.menuItem}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Moon size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>{themeMode === 'system' ? 'System Default' : (themeMode === 'dark' ? 'On' : 'Off')}</Text>
                </View>
                <Switch 
                  value={theme === 'dark'}
                  onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
                  trackColor={{ false: '#94A3B8', true: colors.verifiedBlue }}
                  thumbColor={'#fff'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>

            <View style={styles.spacer} />

            {/* Logout Button */}
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme === 'light' ? '#FEF2F2' : 'rgba(239, 68, 68, 0.1)' }]} onPress={handleLogout}>
              <LogOut size={20} color={colors.bearish} style={styles.logoutIcon} />
              <Text style={[styles.logoutText, { color: colors.bearish }]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: width * 0.85,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImageLarge: {
    width: '100%',
    height: '100%',
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  userHandle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
