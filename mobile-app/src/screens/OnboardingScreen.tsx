import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useAppDispatch } from '../hooks/reduxHooks';
import { setToken, setUser } from '../store/slices/authSlice';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiErrorMessage } from '../utils/apiError';
import debounce from 'lodash.debounce';
import { saveTempToken, getTempToken, saveAuthToken, removeTempToken } from '../utils/secureTokenStorage';

// Username validation rules matching backend
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern: /^[a-z0-9_.]+$/,
};

export default function OnboardingScreen({ navigation, route }: any) {
  const dispatch = useAppDispatch();
  const { user } = route.params || {};

  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'taken' | 'invalid' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Username format validation (client-side only)
  const validateUsernameFormat = (text: string): string | null => {
    if (text.length < USERNAME_RULES.minLength) {
      return `Username must be at least ${USERNAME_RULES.minLength} characters`;
    }
    if (text.length > USERNAME_RULES.maxLength) {
      return `Username must not exceed ${USERNAME_RULES.maxLength} characters`;
    }
    if (!USERNAME_RULES.pattern.test(text)) {
      return 'Username can only contain lowercase letters, numbers, dots, and underscores';
    }
    if (text.startsWith('.') || text.startsWith('_') || text.endsWith('.') || text.endsWith('_')) {
      return 'Username cannot start or end with dots or underscores';
    }
    if (/[._]{2,}/.test(text)) {
      return 'Username cannot contain consecutive dots or underscores';
    }
    return null;
  };

  // Debounced server-side availability check
  const checkUsernameAvailability = useCallback(
    debounce(async (val: string) => {
      if (!val || val.length < USERNAME_RULES.minLength) {
        setAvailabilityStatus(null);
        setIsValidating(false);
        return;
      }

      try {
        setIsValidating(true);
        const response = await api.get(`/auth/check-username?username=${encodeURIComponent(val)}`);
        
        if (response.data.available) {
          setAvailabilityStatus('available');
          setValidationError(null);
        } else {
          setAvailabilityStatus('taken');
          setValidationError(response.data.error || 'Username is already taken');
        }
      } catch (err) {
        console.warn('Check username error:', err);
        setAvailabilityStatus('invalid');
        setValidationError('Failed to check username availability');
      } finally {
        setIsValidating(false);
      }
    }, 600),
    []
  );

  const handleUsernameChange = (text: string) => {
    // Format: lowercase, remove invalid characters
    const formatted = text.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(formatted);

    // Immediate client-side validation
    const error = validateUsernameFormat(formatted);
    if (error) {
      setValidationError(error);
      setAvailabilityStatus('invalid');
    } else {
      setValidationError(null);
      // Trigger server check
      checkUsernameAvailability(formatted);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleSubmit = async () => {
    if (availabilityStatus !== 'available') {
      Alert.alert('Invalid Username', 'Please choose a valid and available username.');
      return;
    }
    if (!tcAccepted) {
      Alert.alert('Accept Terms', 'Please accept the Terms and Conditions to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tempToken = await getTempToken();
      if (!tempToken) {
        throw new Error('Session expired. Please sign in again.');
      }

      const response = await api.put(
        '/auth/complete-onboarding',
        {
          username: username.trim().toLowerCase(),
          tc_accepted: tcAccepted,
          tc_device: Platform.OS,
        },
        {
          headers: { Authorization: `Bearer ${tempToken}` },
        }
      );

      if (!response.data.success && response.data.error) {
        throw new Error(response.data.error);
      }

      const { user: finalizedUser, token: finalToken } = response.data;

      // Save final token and profile securely
      await saveAuthToken(finalToken);
      await removeTempToken();

      dispatch(
        setUser({
          id: finalizedUser.id,
          name: finalizedUser.name || finalizedUser.userId,
          userId: finalizedUser.userId,
          mobileNumber: finalizedUser.mobileNumber,
          avatar: finalizedUser.avatar,
          email: finalizedUser.email,
          bio: finalizedUser.bio || '',
          createdAt: finalizedUser.createdAt,
          isVerified: false,
        })
      );
      dispatch(setToken(finalToken));

      Alert.alert('Success!', 'Your account is ready. Welcome to TradePost!');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      const errorMsg = err.response?.data?.error || err.message || getApiErrorMessage(err);
      Alert.alert('Onboarding Failed', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Pick a unique username to get started</Text>

            {/* Username Input with Validation */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Choose a Unique Username</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="username (no spaces, lowercase)"
                  placeholderTextColor="#6F6F86"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    validationError && styles.inputError,
                    availabilityStatus === 'available' && styles.inputSuccess,
                  ]}
                  maxLength={USERNAME_RULES.maxLength}
                  editable={!isSubmitting}
                />
                <View style={styles.statusIcon}>
                  {isValidating ? (
                    <ActivityIndicator size={20} color="#A0A0A0" />
                  ) : availabilityStatus === 'available' ? (
                    <CheckCircle color="#00D084" size={24} />
                  ) : availabilityStatus === 'taken' ? (
                    <XCircle color="#FF4D4D" size={24} />
                  ) : validationError ? (
                    <AlertCircle color="#FFA500" size={24} />
                  ) : null}
                </View>
              </View>

              {validationError && (
                <Text style={styles.errorText}>⚠️ {validationError}</Text>
              )}

              <Text style={styles.hint}>
                3-20 characters. Use letters, numbers, dots, and underscores only.
              </Text>
            </View>

            {/* Terms & Conditions */}
            <View style={styles.tcSection}>
              <Text style={styles.tcLabel}>Terms & Conditions (SEBI Compliance)</Text>
              <ScrollView
                style={styles.tcBox}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled
              >
                <Text style={styles.tcText}>
                  <Text style={{ fontWeight: '700' }}>1. No Financial Advice</Text>
                  {'\n'}TradePost is a social platform for traders. Content here is not financial advice. You are responsible for your trading decisions.
                  {'\n\n'}
                  <Text style={{ fontWeight: '700' }}>2. SEBI Compliance</Text>
                  {'\n'}All users agree to comply with SEBI regulations and Indian securities laws.
                  {'\n\n'}
                  <Text style={{ fontWeight: '700' }}>3. Data Privacy</Text>
                  {'\n'}We log your device info, acceptance timestamp, and IP address for compliance purposes.
                  {'\n\n'}
                  <Text style={{ fontWeight: '700' }}>4. Prohibited Activities</Text>
                  {'\n'}Market manipulation, insider trading, and spam are strictly prohibited.
                  {'\n\n'}
                  <Text style={{ fontWeight: '700' }}>5. Account Termination</Text>
                  {'\n'}Violating these terms may result in account suspension without notice.
                  {'\n\n\n\n'}
                </Text>
              </ScrollView>

              {!scrolledToBottom && (
                <Text style={styles.scrollPrompt}>⬇️ Scroll down to accept terms</Text>
              )}

              <TouchableOpacity
                style={[styles.checkboxContainer, !scrolledToBottom && { opacity: 0.5 }]}
                onPress={() => scrolledToBottom && setTcAccepted(!tcAccepted)}
                disabled={!scrolledToBottom}
              >
                <View style={[styles.checkbox, tcAccepted && styles.checkboxActive]} />
                <Text style={styles.checkboxLabel}>I accept the Terms & Conditions</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!availabilityStatus || !tcAccepted || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={availabilityStatus !== 'available' || !tcAccepted || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size={20} color="#07130D" />
              ) : (
                <Text style={styles.submitButtonText}>Submit & Accept Terms</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                Alert.alert(
                  'Cancel Onboarding?',
                  'You can sign in again later to complete your profile.',
                  [
                    { text: 'Keep Going', onPress: () => {} },
                    { text: 'Sign Out', onPress: () => navigation.replace('Login') },
                  ]
                );
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel & Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0F0F1E' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A0A0A0', fontSize: 16, marginBottom: 32 },

  inputSection: { marginBottom: 32 },
  label: { color: '#CFCFE2', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  inputContainer: { position: 'relative', marginBottom: 12 },
  input: {
    backgroundColor: '#121226',
    color: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    paddingRight: 50,
  },
  inputError: { borderColor: '#FF4D4D' },
  inputSuccess: { borderColor: '#00D084' },
  statusIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  errorText: { color: '#FF4D4D', fontSize: 12, fontWeight: '600', marginTop: 8 },
  hint: { color: '#6F6F86', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  tcSection: { marginBottom: 24 },
  tcLabel: { color: '#CFCFE2', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  tcBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    height: 200,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tcText: { color: '#A0A0A0', fontSize: 13, lineHeight: 20 },
  scrollPrompt: { color: '#00D084', fontSize: 12, fontWeight: '600', marginBottom: 12 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#00D084',
    marginRight: 12,
  },
  checkboxActive: { backgroundColor: '#00D084' },
  checkboxLabel: { color: '#E0E0E0', fontSize: 14 },

  submitButton: {
    backgroundColor: '#00D084',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#07130D', fontSize: 16, fontWeight: '800' },

  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6F6F86', fontSize: 14, fontWeight: '600' },
});