import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
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
import { logout, setUser } from '../../store/slices/authSlice';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import { pickAndProcessImage } from '../../utils/imageProcessor';
import { getApiErrorMessage } from '../../utils/apiError';
import PublicProfileModal from './PublicProfileModal';

const { width } = Dimensions.get('window');

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name || user?.userId || 'TradePost User';
  const userHandle = user?.userId ? `@${user.userId}` : '';
  const joinedText = user?.createdAt ? `Joined ${new Date(user.createdAt).toDateString()}` : '';
  const bioText = ((user as any)?.bio as string | undefined) || '';
  const isVerified = user?.isVerified ?? false;
  const { colors, theme, themeMode, setThemeMode } = useTheme();

  const [profileStats, setProfileStats] = useState<{ followerCount: number; followingCount: number; postCount: number }>(
    { followerCount: 0, followingCount: 0, postCount: 0 }
  );
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  type Panel =
    | 'none'
    | 'profile'
    | 'account'
    | 'notification'
    | 'help'
    | 'posts'
    | 'followers'
    | 'following'
    | 'editPost'
    | 'postComments';
  const [panel, setPanel] = useState<Panel>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  const [draftName, setDraftName] = useState('');
  const [draftUserId, setDraftUserId] = useState('');
  const [draftMobile, setDraftMobile] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftBio, setDraftBio] = useState('');

  const [draftLanguage, setDraftLanguage] = useState('en');
  const [draftPrivate, setDraftPrivate] = useState(false);
  const [draftNotifyPush, setDraftNotifyPush] = useState(true);
  const [draftNotifyEmail, setDraftNotifyEmail] = useState(false);

  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [myPosts, setMyPosts] = useState<Array<any>>([]);

  type SocialUser = { id: string; userId: string; name?: string; avatar?: string; isFollowing?: boolean };
  const [followers, setFollowers] = useState<Array<SocialUser>>([]);
  const [following, setFollowing] = useState<Array<SocialUser>>([]);
  const [listFollowBusyUserId, setListFollowBusyUserId] = useState<string | null>(null);

  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [publicProfileVisible, setPublicProfileVisible] = useState(false);

  const [activePost, setActivePost] = useState<any | null>(null);
  const [postDraftContent, setPostDraftContent] = useState('');
  const [isPostSaving, setIsPostSaving] = useState(false);

  const [postCommentsLoading, setPostCommentsLoading] = useState(false);
  const [postComments, setPostComments] = useState<Array<any>>([]);

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
          name?: string;
          userId?: string;
          mobileNumber?: string;
          email?: string;
          bio?: string;
          settings?: {
            language?: string;
            accountPrivate?: boolean;
            notifyPush?: boolean;
            notifyEmail?: boolean;
            themeMode?: 'light' | 'dark' | 'system';
          };
        };

        if (!isMounted) return;
        setProfileStats({
          followerCount: Number(data.followerCount ?? 0),
          followingCount: Number(data.followingCount ?? 0),
          postCount: Number(data.postCount ?? 0),
        });
        setProfileAvatar(data.avatar && String(data.avatar).trim() ? String(data.avatar) : null);

        setDraftName(String(data.name ?? user?.name ?? '').trim());
        setDraftUserId(String(data.userId ?? user?.userId ?? '').trim());
        setDraftMobile(String(data.mobileNumber ?? user?.mobileNumber ?? '').trim());
        setDraftEmail(String(data.email ?? user?.email ?? '').trim());
        setDraftBio(String(data.bio ?? (user as any)?.bio ?? '').trim());

        setDraftLanguage(String(data.settings?.language ?? 'en').trim() || 'en');
        setDraftPrivate(Boolean(data.settings?.accountPrivate ?? false));
        setDraftNotifyPush(Boolean(data.settings?.notifyPush ?? true));
        setDraftNotifyEmail(Boolean(data.settings?.notifyEmail ?? false));

        if (data.settings?.themeMode && ['light', 'dark', 'system'].includes(data.settings.themeMode)) {
          setThemeMode(data.settings.themeMode);
        }

        setPendingAvatarUri(null);
      } catch {
        // Keep existing state; fail silently for now.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!['posts', 'followers', 'following'].includes(panel)) return;

    let isMounted = true;
    setListLoading(true);

    (async () => {
      try {
        if (panel === 'posts') {
          const res = await api.get('/users/me/posts?limit=30&skip=0');
          if (!isMounted) return;
          setMyPosts((res.data?.items as any[]) || []);
        }
        if (panel === 'followers') {
          const res = await api.get('/users/me/followers?limit=50&skip=0');
          if (!isMounted) return;
          setFollowers((res.data?.items as any[]) || []);
        }
        if (panel === 'following') {
          const res = await api.get('/users/me/following?limit=50&skip=0');
          if (!isMounted) return;
          setFollowing((res.data?.items as any[]) || []);
        }
      } catch {
        if (!isMounted) return;
        if (panel === 'posts') setMyPosts([]);
        if (panel === 'followers') setFollowers([]);
        if (panel === 'following') setFollowing([]);
      } finally {
        if (isMounted) setListLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [panel, visible]);

  useEffect(() => {
    if (!visible) return;
    if (panel !== 'postComments') return;
    if (!activePost?._id) return;

    let isMounted = true;
    setPostCommentsLoading(true);
    setPostComments([]);

    (async () => {
      try {
        const res = await api.get(`/comments/${activePost._id}`);
        if (!isMounted) return;
        setPostComments(((res.data as any[]) || []).slice(0, 100));
      } catch {
        if (!isMounted) return;
        setPostComments([]);
      } finally {
        if (isMounted) setPostCommentsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activePost?._id, panel, visible]);

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

  // Panel inner width ≈ screen width minus panel margins & padding.
  const postMediaWidth = Math.max(220, width - 92);

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

  const openPublicProfile = (targetUserId: string) => {
    const clean = String(targetUserId || '').trim();
    if (!clean) return;
    if (clean === user?.userId) return;
    setPublicProfileUserId(clean);
    setPublicProfileVisible(true);
  };

  const toggleFollowFromList = async (targetUserId: string, nextFollowState: boolean) => {
    const clean = String(targetUserId || '').trim();
    if (!clean) return;
    if (clean === user?.userId) return;

    try {
      setListFollowBusyUserId(clean);

      if (nextFollowState) {
        const res = await api.post(`/users/u/${encodeURIComponent(clean)}/follow`);
        const nextFollowingCount = Number(res.data?.followingCount);
        if (Number.isFinite(nextFollowingCount)) {
          setProfileStats((s) => ({ ...s, followingCount: nextFollowingCount }));
        }

        setFollowers((prev) => prev.map((u) => (u.userId === clean ? { ...u, isFollowing: true } : u)));
        setFollowing((prev) => {
          const mapped = prev.map((u) => (u.userId === clean ? { ...u, isFollowing: true } : u));
          return mapped;
        });
      } else {
        const res = await api.delete(`/users/u/${encodeURIComponent(clean)}/follow`);
        const nextFollowingCount = Number(res.data?.followingCount);
        if (Number.isFinite(nextFollowingCount)) {
          setProfileStats((s) => ({ ...s, followingCount: nextFollowingCount }));
        }

        setFollowers((prev) => prev.map((u) => (u.userId === clean ? { ...u, isFollowing: false } : u)));
        // If you unfollow someone, remove them from the "following" list view.
        setFollowing((prev) => prev.filter((u) => u.userId !== clean));
      }
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    } finally {
      setListFollowBusyUserId(null);
    }
  };

  const handleLogout = () => {
    handleClose();
    setTimeout(() => {
      dispatch(logout());
    }, 300);
  };

  const closePanel = () => {
    setPanel('none');
    setActivePost(null);
    setPostDraftContent('');
    setPostComments([]);
  };

  const closeOrBackPanel = () => {
    if (panel === 'editPost' || panel === 'postComments') {
      setPanel('posts');
      setActivePost(null);
      setPostDraftContent('');
      setPostComments([]);
      return;
    }
    closePanel();
  };

  const openEditPost = (post: any) => {
    setActivePost(post);
    setPostDraftContent(String(post?.content || ''));
    setPanel('editPost');
  };

  const openPostComments = (post: any) => {
    setActivePost(post);
    setPanel('postComments');
  };

  const savePostEdits = async () => {
    if (!activePost?._id) return;
    const nextContent = postDraftContent.trim();
    if (!nextContent) {
      Alert.alert('Missing caption', 'Please enter post caption.');
      return;
    }

    setIsPostSaving(true);
    try {
      const res = await api.put(`/posts/${activePost._id}`, { content: nextContent });
      const updated = res.data;
      setMyPosts((prev) => prev.map((p) => (String(p._id) === String(activePost._id) ? { ...p, ...updated } : p)));
      setActivePost((prev: any) => (prev ? { ...prev, ...updated } : prev));
      setPanel('posts');
    } catch (e: any) {
      Alert.alert('Update failed', getApiErrorMessage(e));
    } finally {
      setIsPostSaving(false);
    }
  };

  const deletePost = async (post: any) => {
    if (!post?._id) return;

    Alert.alert('Delete post?', 'This will permanently remove this post and its comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/posts/${post._id}`);
            setMyPosts((prev) => prev.filter((p) => String(p._id) !== String(post._id)));
            setProfileStats((s) => ({ ...s, postCount: Math.max(0, (s.postCount || 0) - 1) }));
            if (String(activePost?._id) === String(post._id)) {
              setActivePost(null);
              setPanel('posts');
            }
          } catch (e: any) {
            Alert.alert('Delete failed', getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  const pickAvatar = async () => {
    setIsPickingPhoto(true);
    try {
      const img = await pickAndProcessImage();
      if (!img) return;
      setPendingAvatarUri(img.uri);
    } catch (e: any) {
      Alert.alert('Image error', e?.message || 'Failed to pick image');
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const persistThemeMode = async (nextMode: 'light' | 'dark') => {
    setThemeMode(nextMode);
    try {
      await api.put('/users/me', { settings: { themeMode: nextMode } });
    } catch {
      // Ignore; local theme change still applies.
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      // Upload avatar if selected
      if (pendingAvatarUri) {
        const form = new FormData();
        form.append('profilePhoto', {
          uri: pendingAvatarUri,
          name: `avatar_${Date.now()}.webp`,
          type: 'image/webp',
        } as any);

        const avatarRes = await api.put('/users/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const updatedAvatar = avatarRes.data?.user?.avatar;
        if (updatedAvatar) setProfileAvatar(String(updatedAvatar));
        setPendingAvatarUri(null);
      }

      const res = await api.put('/users/me', {
        name: draftName,
        userId: draftUserId,
        mobileNumber: draftMobile,
        email: draftEmail,
        bio: draftBio,
        settings: {
          language: draftLanguage,
          accountPrivate: draftPrivate,
          notifyPush: draftNotifyPush,
          notifyEmail: draftNotifyEmail,
          themeMode,
        },
      });

      const updatedUser = res.data?.user;
      if (updatedUser) {
        dispatch(
          setUser({
            id: updatedUser.id,
            name: updatedUser.name || updatedUser.userId || (user?.name ?? ''),
            userId: updatedUser.userId,
            mobileNumber: updatedUser.mobileNumber,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            bio: updatedUser.bio,
            createdAt: updatedUser.createdAt,
            isVerified: user?.isVerified ?? false,
          } as any)
        );
      }

      closePanel();
    } catch (e: any) {
      Alert.alert('Update failed', getApiErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
              {bioText.trim() ? (
                <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {bioText.trim()}
                </Text>
              ) : null}
              {joinedText ? (
                <Text style={[styles.userHandle, { color: colors.textSecondary, marginTop: 6 }]}>{joinedText}</Text>
              ) : null}
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)' }]}>
              <TouchableOpacity style={styles.statColumn} activeOpacity={0.85} onPress={() => setPanel('followers')}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.followerCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.statColumn} activeOpacity={0.85} onPress={() => setPanel('posts')}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.postCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
              </TouchableOpacity>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.statColumn} activeOpacity={0.85} onPress={() => setPanel('following')}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(profileStats.followingCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
              </TouchableOpacity>
            </View>

            {/* Menu List */}
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setPanel('profile')}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <User size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>My Profile</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Edit and check out what you post</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => setPanel('account')}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Settings size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Account Settings</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Privacy, security, language</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setPanel('notification')}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme === 'light' ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Bell size={20} color={colors.verifiedBlue} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Notification</Text>
                  <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Push, email alerts</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setPanel('help')}>
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
                  onValueChange={(val) => persistThemeMode(val ? 'dark' : 'light')}
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

        {/* Nested edit panels */}
        <Modal visible={panel !== 'none'} transparent animationType="fade" onRequestClose={closeOrBackPanel} statusBarTranslucent>
          <TouchableWithoutFeedback onPress={closePanel}>
            <View style={styles.panelBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.panelCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                {panel === 'profile'
                  ? 'My Profile'
                  : panel === 'account'
                    ? 'Account Settings'
                    : panel === 'notification'
                      ? 'Notification'
                      : panel === 'posts'
                        ? 'My Posts'
                        : panel === 'editPost'
                          ? 'Edit Post'
                          : panel === 'postComments'
                            ? 'Post Comments'
                        : panel === 'followers'
                          ? 'Followers'
                          : panel === 'following'
                            ? 'Following'
                            : 'Help Support'}
              </Text>
              <TouchableOpacity onPress={closeOrBackPanel} activeOpacity={0.8}>
                <Text style={[styles.panelClose, { color: colors.verifiedBlue }]}>
                  {panel === 'editPost' || panel === 'postComments' ? 'Back' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelContent}>
              {panel === 'profile' ? (
                <>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.fieldLabelInline, { color: colors.textSecondary }]}>Profile Photo</Text>
                    <TouchableOpacity onPress={pickAvatar} disabled={isPickingPhoto} activeOpacity={0.85}>
                      <Text style={[styles.linkText, { color: colors.verifiedBlue }]}>
                        {isPickingPhoto ? 'Opening...' : 'Change'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.avatarPreview, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    {pendingAvatarUri || profileAvatar || user?.avatar ? (
                      <Image
                        source={{ uri: pendingAvatarUri || profileAvatar || user?.avatar }}
                        style={styles.avatarPreviewImage}
                      />
                    ) : (
                      <Text style={[styles.avatarTextLarge, { color: colors.text }]}>{initials}</Text>
                    )}
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Display Name</Text>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Your name"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>User ID</Text>
                  <TextInput
                    value={draftUserId}
                    onChangeText={setDraftUserId}
                    placeholder="@username"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mobile Number</Text>
                  <TextInput
                    value={draftMobile}
                    onChangeText={setDraftMobile}
                    placeholder="+91..."
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
                  <TextInput
                    value={draftEmail}
                    onChangeText={setDraftEmail}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
                  <TextInput
                    value={draftBio}
                    onChangeText={setDraftBio}
                    placeholder="Tell people about you"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />
                </>
              ) : null}

              {panel === 'account' ? (
                <>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleText}>
                      <Text style={[styles.menuItemText, { color: colors.text }]}>Private Account</Text>
                      <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Only approved users can follow</Text>
                    </View>
                    <Switch
                      value={draftPrivate}
                      onValueChange={setDraftPrivate}
                      trackColor={{ false: '#94A3B8', true: colors.verifiedBlue }}
                      thumbColor={'#fff'}
                      ios_backgroundColor="#E2E8F0"
                    />
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Language</Text>
                  <TextInput
                    value={draftLanguage}
                    onChangeText={setDraftLanguage}
                    placeholder="en"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />
                </>
              ) : null}

              {panel === 'notification' ? (
                <>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleText}>
                      <Text style={[styles.menuItemText, { color: colors.text }]}>Push Notifications</Text>
                      <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Mentions, replies, updates</Text>
                    </View>
                    <Switch
                      value={draftNotifyPush}
                      onValueChange={setDraftNotifyPush}
                      trackColor={{ false: '#94A3B8', true: colors.verifiedBlue }}
                      thumbColor={'#fff'}
                      ios_backgroundColor="#E2E8F0"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleText}>
                      <Text style={[styles.menuItemText, { color: colors.text }]}>Email Alerts</Text>
                      <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>Security and account notifications</Text>
                    </View>
                    <Switch
                      value={draftNotifyEmail}
                      onValueChange={setDraftNotifyEmail}
                      trackColor={{ false: '#94A3B8', true: colors.verifiedBlue }}
                      thumbColor={'#fff'}
                      ios_backgroundColor="#E2E8F0"
                    />
                  </View>
                </>
              ) : null}

              {panel === 'help' ? (
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  For help, contact support. (Hook this to real FAQ/contact later.)
                </Text>
              ) : panel === 'posts' ? (
                <>
                  {listLoading ? (
                    <View style={styles.centerPad}>
                      <ActivityIndicator color={colors.verifiedBlue} />
                      <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 10 }]}>Loading posts…</Text>
                    </View>
                  ) : myPosts.length === 0 ? (
                    <Text style={[styles.helpText, { color: colors.textSecondary }]}>No posts yet.</Text>
                  ) : (
                    myPosts.map((p: any) => (
                      <View key={String(p._id)} style={[styles.postRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                          {new Date(p.createdAt).toLocaleString()} • {String(p.sentiment || 'neutral')}
                        </Text>
                        <Text style={[styles.postContent, { color: colors.text }]}>
                          {String(p.content || '')}
                        </Text>

                        {Array.isArray(p.mediaUrls) && p.mediaUrls.filter(Boolean).length ? (
                          <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            style={styles.mediaStrip}
                          >
                            {p.mediaUrls
                              .filter(Boolean)
                              .slice(0, 5)
                              .map((uri: string, idx: number) => (
                                <View
                                  key={`${String(p._id)}_${idx}`}
                                  style={[
                                    styles.mediaFrame,
                                    {
                                      width: postMediaWidth,
                                      borderColor: colors.border,
                                      backgroundColor: colors.searchBg,
                                    },
                                  ]}
                                >
                                  <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" />
                                </View>
                              ))}
                          </ScrollView>
                        ) : null}

                        <Text style={[styles.postMeta, { color: colors.textSecondary, marginTop: 8 }]}
                        >
                          ❤ {Number(p.likeCount || 0)}   💬 {Number(p.commentCount || 0)}
                        </Text>

                        <View style={styles.postActionsRow}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.actionChip, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
                            onPress={() => openPostComments(p)}
                          >
                            <Text style={[styles.actionChipText, { color: colors.text }]}>Comments</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.actionChip, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
                            onPress={() => openEditPost(p)}
                          >
                            <Text style={[styles.actionChipText, { color: colors.text }]}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.actionChip, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
                            onPress={() => deletePost(p)}
                          >
                            <Text style={[styles.actionChipText, { color: colors.bearish }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : panel === 'editPost' ? (
                <>
                  {!activePost ? (
                    <Text style={[styles.helpText, { color: colors.textSecondary }]}>Post not found.</Text>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 0 }]}>Caption</Text>
                      <TextInput
                        value={postDraftContent}
                        onChangeText={setPostDraftContent}
                        placeholder="Write something…"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={[
                          styles.textArea,
                          { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 170 },
                        ]}
                      />

                      <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.verifiedBlue, opacity: isPostSaving ? 0.7 : 1 }]}
                        onPress={savePostEdits}
                        activeOpacity={0.85}
                        disabled={isPostSaving}
                      >
                        {isPostSaving ? (
                          <View style={styles.savingRow}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.saveButtonText}>Saving…</Text>
                          </View>
                        ) : (
                          <Text style={styles.saveButtonText}>Update Post</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={() => deletePost(activePost)}
                        activeOpacity={0.85}
                        disabled={isPostSaving}
                      >
                        <Text style={[styles.secondaryButtonText, { color: colors.bearish }]}>Delete Post</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : panel === 'postComments' ? (
                <>
                  {!activePost ? (
                    <Text style={[styles.helpText, { color: colors.textSecondary }]}>Post not found.</Text>
                  ) : (
                    <>
                      <View style={[styles.postRow, { borderColor: colors.border, backgroundColor: colors.card, marginBottom: 14 }]}>
                        <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                          {new Date(activePost.createdAt).toLocaleString()} • {String(activePost.sentiment || 'neutral')}
                        </Text>
                        <Text style={[styles.postContent, { color: colors.text }]}>{String(activePost.content || '')}</Text>

                        {Array.isArray(activePost.mediaUrls) && activePost.mediaUrls.filter(Boolean).length ? (
                          <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            style={styles.mediaStrip}
                          >
                            {activePost.mediaUrls
                              .filter(Boolean)
                              .slice(0, 5)
                              .map((uri: string, idx: number) => (
                                <View
                                  key={`${String(activePost._id)}_${idx}`}
                                  style={[
                                    styles.mediaFrame,
                                    {
                                      width: postMediaWidth,
                                      borderColor: colors.border,
                                      backgroundColor: colors.searchBg,
                                    },
                                  ]}
                                >
                                  <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" />
                                </View>
                              ))}
                          </ScrollView>
                        ) : null}

                        <Text style={[styles.postMeta, { color: colors.textSecondary, marginTop: 8 }]}
                        >
                          ❤ {Number(activePost.likeCount || 0)}   💬 {Number(activePost.commentCount || 0)}
                        </Text>
                      </View>

                      {postCommentsLoading ? (
                        <View style={styles.centerPad}>
                          <ActivityIndicator color={colors.verifiedBlue} />
                          <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 10 }]}>Loading comments…</Text>
                        </View>
                      ) : postComments.length === 0 ? (
                        <Text style={[styles.helpText, { color: colors.textSecondary }]}>No comments yet.</Text>
                      ) : (
                        postComments.map((c: any) => {
                          const author = c?.author;
                          const userId = author?.userId || 'Trader';
                          const avatar = author?.profilePhoto;
                          const body = c?.isDeleted ? 'Comment deleted' : String(c?.content || '');
                          return (
                            <View
                              key={String(c._id)}
                              style={[styles.commentRow, { borderColor: colors.border, backgroundColor: colors.card }]}
                            >
                              <View style={[styles.userListAvatar, { borderColor: colors.border, backgroundColor: colors.searchBg }]}>
                                {avatar ? (
                                  <Image source={{ uri: avatar }} style={styles.userListAvatarImg} />
                                ) : (
                                  <Text style={[styles.userListAvatarFallback, { color: colors.text }]}>
                                    {(userId || 'T').slice(0, 1).toUpperCase()}
                                  </Text>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.menuItemText, { color: colors.text }]}>{userId}</Text>
                                <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>{body}</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </>
                  )}
                </>
              ) : panel === 'followers' ? (
                <>
                  {listLoading ? (
                    <View style={styles.centerPad}>
                      <ActivityIndicator color={colors.verifiedBlue} />
                      <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 10 }]}>Loading followers…</Text>
                    </View>
                  ) : followers.length === 0 ? (
                    <Text style={[styles.helpText, { color: colors.textSecondary }]}>No followers yet.</Text>
                  ) : (
                    followers.map((u) => (
                      <View key={u.id} style={[styles.userListRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <TouchableOpacity
                          style={styles.userListRowLeft}
                          onPress={() => openPublicProfile(u.userId)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.userListAvatar, { borderColor: colors.border, backgroundColor: colors.searchBg }]}>
                            {u.avatar ? (
                              <Image source={{ uri: u.avatar }} style={styles.userListAvatarImg} />
                            ) : (
                              <Text style={[styles.userListAvatarFallback, { color: colors.text }]}>
                                {(u.userId || 'T').slice(0, 1).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.menuItemText, { color: colors.text }]}>{u.name?.trim() ? u.name : u.userId}</Text>
                            <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>@{u.userId}</Text>
                          </View>
                        </TouchableOpacity>

                        {u.isFollowing ? (
                          <View
                            style={[
                              styles.followButton,
                              {
                                backgroundColor: 'transparent',
                                borderColor: colors.border,
                                opacity: 0.85,
                              },
                            ]}
                          >
                            <Text style={[styles.followButtonText, { color: colors.textSecondary }]}>Following</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.followButton, { backgroundColor: colors.verifiedBlue, borderColor: colors.border }]}
                            onPress={() => toggleFollowFromList(u.userId, true)}
                            activeOpacity={0.85}
                            disabled={listFollowBusyUserId === u.userId}
                          >
                            {listFollowBusyUserId === u.userId ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={[styles.followButtonText, { color: '#fff' }]}>Follow</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </>
              ) : panel === 'following' ? (
                <>
                  {listLoading ? (
                    <View style={styles.centerPad}>
                      <ActivityIndicator color={colors.verifiedBlue} />
                      <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 10 }]}>Loading following…</Text>
                    </View>
                  ) : following.length === 0 ? (
                    <Text style={[styles.helpText, { color: colors.textSecondary }]}>Not following anyone yet.</Text>
                  ) : (
                    following.map((u) => (
                      <View key={u.id} style={[styles.userListRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <TouchableOpacity
                          style={styles.userListRowLeft}
                          onPress={() => openPublicProfile(u.userId)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.userListAvatar, { borderColor: colors.border, backgroundColor: colors.searchBg }]}>
                            {u.avatar ? (
                              <Image source={{ uri: u.avatar }} style={styles.userListAvatarImg} />
                            ) : (
                              <Text style={[styles.userListAvatarFallback, { color: colors.text }]}>
                                {(u.userId || 'T').slice(0, 1).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.menuItemText, { color: colors.text }]}>{u.name?.trim() ? u.name : u.userId}</Text>
                            <Text style={[styles.menuSubText, { color: colors.textSecondary }]}>@{u.userId}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.followButton,
                            {
                              backgroundColor: 'transparent',
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => toggleFollowFromList(u.userId, false)}
                          activeOpacity={0.85}
                          disabled={listFollowBusyUserId === u.userId}
                        >
                          {listFollowBusyUserId === u.userId ? (
                            <ActivityIndicator color={colors.textSecondary} />
                          ) : (
                            <Text style={[styles.followButtonText, { color: colors.textSecondary }]}>Unfollow</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.verifiedBlue, opacity: isSaving ? 0.7 : 1 }]}
                  onPress={saveAll}
                  activeOpacity={0.85}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
      </Modal>

      <PublicProfileModal
        visible={publicProfileVisible}
        userId={publicProfileUserId}
        onClose={() => {
          setPublicProfileVisible(false);
          setPublicProfileUserId(null);
        }}
      />
    </>
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
  bioText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 10,
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
  panelBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
  },
  panelCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 100,
    bottom: 60,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  panelClose: {
    fontSize: 14,
    fontWeight: '800',
  },
  panelContent: {
    padding: 16,
    paddingBottom: 28,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  fieldLabelInline: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 110,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  centerPad: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  postMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  postContent: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  mediaStrip: {
    marginTop: 12,
  },
  mediaFrame: {
    height: 210,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  userListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  userListRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userListAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userListAvatarFallback: {
    fontSize: 16,
    fontWeight: '900',
  },
  followButton: {
    minWidth: 92,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '800',
  },
  avatarPreview: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 10,
  },
  toggleText: {
    flex: 1,
    paddingRight: 12,
  },
});
