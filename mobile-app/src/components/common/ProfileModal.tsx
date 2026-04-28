import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Settings, Bell, CircleHelp, User, LogOut, ChevronRight } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logout } from '../../redux/slices/authSlice';

const { width } = Dimensions.get('window');

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name ?? 'TradePost User';
  const isVerified = user?.isVerified ?? false;

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
          <Animated.View style={[styles.backdrop, { opacity }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>TP</Text>
                {isVerified && (
                  <View style={styles.verificationBadge}>
                    <View style={styles.verificationInner} />
                  </View>
                )}
              </View>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userHandle}>@tradepost_user</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>1.2k</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>150</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>450</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {/* Menu List */}
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuIconWrap}>
                  <User size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>My Profile</Text>
                <ChevronRight size={20} color="#334155" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuIconWrap}>
                  <Settings size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>Account Settings</Text>
                <ChevronRight size={20} color="#334155" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuIconWrap}>
                  <Bell size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>Notification</Text>
                <ChevronRight size={20} color="#334155" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuIconWrap}>
                  <CircleHelp size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuItemText}>Help Support</Text>
                <ChevronRight size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#EF4444" style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
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
  menuItemText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
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