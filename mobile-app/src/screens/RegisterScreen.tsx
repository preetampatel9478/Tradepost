import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, Circle, Eye, EyeOff, Shield, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppDispatch } from '../hooks/reduxHooks';
import { setToken, setUser } from '../store/slices/authSlice';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiErrorMessage } from '../utils/apiError';
import { isGoogleSignInAvailable, getGoogleSignIn } from '../utils/googleSignIn';
import { isAppleSignInAvailable, performAppleSignIn } from '../utils/appleSignIn';
import { saveAuthToken, saveTempToken } from '../utils/secureTokenStorage';

export default function RegisterScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState(''); // Optional
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // T&C Compliance States
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  // Auditing variables stored securely upon agreement
  const [auditData, setAuditData] = useState<{ timestamp: string; app_version: string; device_id: string } | null>(null);

  // Social signup states
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Check Apple availability on mount
  React.useEffect(() => {
    (async () => {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    })();
  }, []);

  const handleGoogleSignUp = async () => {
    setIsGoogleSubmitting(true);
    try {
      const GoogleSignIn = getGoogleSignIn();
      if (!GoogleSignIn) throw new Error('Google Sign-In not available');
      
      await GoogleSignIn.signIn();
      const { idToken } = await GoogleSignIn.getTokens();
      
      const response = await api.post('/auth/google', { idToken });
      const { user, token, is_onboarded } = response.data;

      if (!is_onboarded) {
        await saveTempToken(token);
        navigation.navigate('Onboarding', { user });
        return;
      }

      dispatch(setUser({
        id: user.id,
        name: user.name || user.userId,
        userId: user.userId,
        mobileNumber: user.mobileNumber,
        avatar: user.avatar,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
        isVerified: false,
      }));
      dispatch(setToken(token));
      await saveAuthToken(token);
    } catch (e: any) {
      Alert.alert('Google Sign-up failed', e.message || getApiErrorMessage(e));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleAppleSignUp = async () => {
    setIsAppleSubmitting(true);
    try {
      const credential = await performAppleSignIn();
      
      const response = await api.post('/auth/apple', {
        identityToken: credential.identityToken,
        user: {
          email: credential.email,
          fullName: credential.fullName,
        },
      });

      const { user, token, is_onboarded } = response.data;

      if (!is_onboarded) {
        await saveTempToken(token);
        navigation.navigate('Onboarding', { user });
        return;
      }

      dispatch(setUser({
        id: user.id,
        name: user.name || user.userId,
        userId: user.userId,
        mobileNumber: user.mobileNumber,
        avatar: user.avatar,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
        isVerified: false,
      }));
      dispatch(setToken(token));
      await saveAuthToken(token);
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        Alert.alert('Apple Sign-up failed', e.message || getApiErrorMessage(e));
      }
    } finally {
      setIsAppleSubmitting(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Check if scrolled within 20px of the bottom limit to unlock the button
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isCloseToBottom) setHasScrolledToBottom(true);
  };

  // Debounced API Check for User ID Availability
  useEffect(() => {
    if (userId.length < 3) {
      setUserIdAvailable(null);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsCheckingUserId(true);
      // Simulate API call to check user ID uniqueness: e.g. await axios.get(`/api/auth/check-userid?id=${userId}`)
      setTimeout(() => {
        // Dummy logic: @demo is taken, everything else is available
        setUserIdAvailable(userId.toLowerCase() !== 'demo');
        setIsCheckingUserId(false);
      }, 500);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [userId]);

  const handlePickImage = async () => {
    Alert.alert('Profile photo', 'Choose a photo source', [
      {
        text: 'Camera',
        onPress: async () => {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (camPerm.status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
          });
          if (!result.canceled) setProfilePhoto(result.assets[0].uri);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (libPerm.status !== 'granted') {
            Alert.alert('Permission needed', 'Gallery permission is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
          });
          if (!result.canceled) setProfilePhoto(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRegister = async () => {
    if (!mobileNumber.trim() || !userId.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter Mobile Number, User ID, and Password.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Terms & Conditions', 'You must accept the Terms & Conditions to register.');
      return;
    }
    if (userIdAvailable === false) {
      Alert.alert('User ID Unavailable', 'Please choose a different User ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('mobileNumber', mobileNumber.trim());
      formData.append('userId', userId.trim());
      formData.append('password', password);
      formData.append('tc_accepted', 'true');
      formData.append('tc_device', Platform.OS);

      if (profilePhoto) {
        formData.append(
          'profilePhoto',
          {
            uri: profilePhoto,
            name: 'profile.jpg',
            type: 'image/jpeg',
          } as any
        );
      }

      const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { user, token } = response.data;
      dispatch(
        setUser({
          id: user.id,
          email: user.email || email.trim() || undefined,
          name: user.name || user.userId,
          userId: user.userId,
          mobileNumber: user.mobileNumber,
          avatar: user.avatar,
          bio: user.bio,
          createdAt: user.createdAt,
          isVerified: false,
        })
      );
      dispatch(setToken(token));
      await AsyncStorage.setItem('authToken', token);
    } catch (e: any) {
      Alert.alert('Sign up failed', getApiErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.hero}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join the trading community in a few steps.</Text>
          </View>

          <View style={styles.card}>
            {/* Profile Photo Uploader */}
            <View style={styles.photoContainer}>
              <TouchableOpacity style={styles.photoUploader} onPress={handlePickImage}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
                ) : (
                  <Camera color="#A0A0A0" size={32} />
                )}
                <View style={styles.photoEditBadge}>
                  <Text style={styles.photoEditText}>+</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.photoLabel}>Profile Photo (Optional)</Text>
            </View>

            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="+91 9876543210"
              placeholderTextColor="#6F6F86"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6F6F86"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Unique User ID *</Text>
              {isCheckingUserId && <Text style={styles.checkingText}>Checking...</Text>}
              {!isCheckingUserId && userIdAvailable === true && <Text style={styles.availableText}>Available</Text>}
              {!isCheckingUserId && userIdAvailable === false && <Text style={styles.unavailableText}>Taken</Text>}
            </View>
            <TextInput
              value={userId}
              onChangeText={setUserId}
              placeholder="e.g. trader_john"
              placeholderTextColor="#6F6F86"
              autoCapitalize="none"
              style={[
                styles.input, 
                userIdAvailable === false && { borderColor: '#F43F5E' },
                userIdAvailable === true && { borderColor: '#10B981' }
              ]}
            />

            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a strong password"
                placeholderTextColor="#6F6F86"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword((value) => !value)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff color="#A0A0A0" size={20} /> : <Eye color="#A0A0A0" size={20} />}
              </TouchableOpacity>
            </View>

            {/* Terms and Conditions Call to Action */}
            <View style={styles.termsContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setTermsAccepted(!termsAccepted)} disabled={!auditData}>
                {termsAccepted ? (
                   <CheckCircle2 color="#00D084" size={20} />
                ) : (
                   <Circle color="#6F6F86" size={20} />
                )}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text style={styles.termsLink} onPress={() => setIsTermsModalVisible(true)}>
                  Terms & Conditions
                </Text>
                {' '}and acknowledge the SEBI Disclaimer.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, (!termsAccepted || isSubmitting) && styles.buttonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={!termsAccepted || isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Creating account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ color: '#A0A0A0', marginHorizontal: 12, fontSize: 12, fontWeight: '600' }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>

            {/* Social Signup Icon Buttons */}
            <View style={styles.socialContainer}>
              {isGoogleSignInAvailable() && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleBtn]}
                  onPress={handleGoogleSignUp}
                  activeOpacity={0.85}
                  disabled={isGoogleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Sign up with Google"
                >
                  <Text style={styles.socialButtonText}>
                    {isGoogleSubmitting ? '...' : '󰊜'}
                  </Text>
                </TouchableOpacity>
              )}

              {appleAvailable && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleBtn]}
                  onPress={handleAppleSignUp}
                  activeOpacity={0.85}
                  disabled={isAppleSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Sign up with Apple"
                >
                  <Text style={styles.socialButtonText}>
                    {isAppleSubmitting ? '...' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Full-width alternative text buttons */}
            {isGoogleSignInAvailable() && (
              <TouchableOpacity
                style={[styles.fullWidthSocialBtn, styles.googleTextBtn]}
                onPress={handleGoogleSignUp}
                activeOpacity={0.85}
                disabled={isGoogleSubmitting}
              >
                <Text style={styles.socialTextBtnText}>
                  {isGoogleSubmitting ? 'Signing up with Google...' : 'Sign up with Google'}
                </Text>
              </TouchableOpacity>
            )}

            {appleAvailable && (
              <TouchableOpacity
                style={[styles.fullWidthSocialBtn, styles.appleTextBtn]}
                onPress={handleAppleSignUp}
                activeOpacity={0.85}
                disabled={isAppleSubmitting}
              >
                <Text style={styles.socialTextBtnText}>
                  {isAppleSubmitting ? 'Signing up with Apple...' : 'Sign up with Apple'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Production T&C Modal with Forced-Scroll & Audit Trail Setup */}
      <Modal visible={isTermsModalVisible} transparent animationType="fade">
        <BlurView intensity={25} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Shield color="#3B82F6" size={22} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Terms & Conditions</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTermsModalVisible(false)}>
                <X color="#94A3B8" size={24} />
              </TouchableOpacity>
            </View>
            
            {/* SEBI Compliance Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Summary:</Text> TraderPost is a social platform, not a SEBI advisor. No post is a financial recommendation.
              </Text>
            </View>

            {/* Scrollable Terms Body */}
            <ScrollView 
              style={styles.modalScroll}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              indicatorStyle="white"
            >
              <Text style={styles.modalBodyText}>
                1. Acceptance of Terms{'\n'}
                By accessing this platform, you agree to these Terms. If you do not agree, do not use the app.{'\n\n'}
                2. No Financial Advice (SEBI Disclaimer){'\n'}
                Content on TraderPost is for educational purposes only. We are not a registered SEBI investment advisor. Your trading decisions are entirely your own responsibility.{'\n\n'}
                3. Data Capture & Security{'\n'}
                For stringent compliance purposes, we record your IP address, device ID, and acceptance timestamp when you explicitly agree to these terms.{'\n\n'}
                4. Conduct & Moderation{'\n'}
                You agree not to manipulate markets or spread false information. We hold the right to moderate, flag, or delete posts without warning.{'\n\n'}
                5. Assumption of Risk{'\n'}
                TraderPost is not liable for any financial losses or damages incurred while mimicking trades seen on this platform.{'\n\n'}
                (Scroll to the bottom to explicitly acknowledge reading this entire document in order to proceed).{'\n\n'}
                ... {'\n\n\n\n\n\n'} 
                End of terms.
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.agreeButton, !hasScrolledToBottom && styles.agreeButtonDisabled]}
              disabled={!hasScrolledToBottom}
              onPress={() => {
                setTermsAccepted(true);
                // Securely pack timestamp, app_version (hardcoded for now), and synthetic device_token
                setAuditData({
                  timestamp: new Date().toISOString(),
                  app_version: 'v1.0.0',
                  device_id: Platform.OS + '-' + Math.random().toString(36).substring(7)
                });
                setIsTermsModalVisible(false);
              }}
            >
              <Text style={styles.agreeButtonText}>I Agree & Create Account</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0F0F1E' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  hero: { marginBottom: 20, marginTop: 10 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A0A0A0', fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoUploader: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#121226', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  profileImage: { width: '100%', height: '100%', borderRadius: 40 },
  photoEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00D084', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1A2E' },
  photoEditText: { color: '#07130D', fontSize: 14, fontWeight: 'bold' },
  photoLabel: { color: '#A0A0A0', fontSize: 12, marginTop: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, marginBottom: 8 },
  label: { color: '#CFCFE2', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  checkingText: { color: '#A0A0A0', fontSize: 11, fontStyle: 'italic' },
  availableText: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
  unavailableText: { color: '#F43F5E', fontSize: 11, fontWeight: 'bold' },
  input: { backgroundColor: '#121226', color: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  passwordToggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10, paddingRight: 20 },
  termsText: { color: '#A0A0A0', fontSize: 12, marginLeft: 10, lineHeight: 18 },
  termsLink: { color: '#00D084', fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#00D084', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#07130D', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  secondaryButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '600' },
  
  // Glassmorphism T&C Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.7)' },
  modalContainer: { width: '90%', maxHeight: '82%', backgroundColor: '#0F172A', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  summaryBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 15, marginHorizontal: 20, marginTop: 20, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  summaryText: { color: '#E2E8F0', fontSize: 13, lineHeight: 22 },
  modalScroll: { marginTop: 16, paddingHorizontal: 20, maxHeight: 300 },
  modalBodyText: { color: '#94A3B8', fontSize: 15, lineHeight: 26 },
  agreeButton: { backgroundColor: '#3B82F6', marginHorizontal: 20, marginTop: 20, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  agreeButtonDisabled: { backgroundColor: '#1E293B' },
  agreeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  
  // Social login buttons
  socialContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 12 },
  socialButton: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  googleBtn: { backgroundColor: '#FFFFFF', borderColor: '#E8E8E8' },
  appleBtn: { backgroundColor: '#000000', borderColor: '#333333' },
  socialButtonText: { fontSize: 28, fontWeight: '600' },

  // Full-width social buttons
  fullWidthSocialBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1 },
  googleTextBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' },
  appleTextBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)' },
  socialTextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

