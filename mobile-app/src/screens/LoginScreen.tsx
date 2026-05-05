import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch } from '../hooks/reduxHooks';
import { setToken, setUser } from '../store/slices/authSlice';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiErrorMessage } from '../utils/apiError';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  
  // Single input for either identifier
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your Mobile Number or User ID, and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const { user, token } = response.data;
      dispatch(
        setUser({
          id: user.id,
          name: user.name || user.userId,
          userId: user.userId,
          mobileNumber: user.mobileNumber,
          avatar: user.avatar,
          email: user.email,
          bio: user.bio,
          createdAt: user.createdAt,
          isVerified: false,
        })
      );
      dispatch(setToken(token));
      await AsyncStorage.setItem('authToken', token);
    } catch (e: any) {
      Alert.alert('Sign in failed', getApiErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please enter your Mobile Number or User ID to receive a reset OTP.');
    // Implement navigation to OTP reset flow here
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.brand}>TradePost</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in using your Mobile Number or User ID.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Mobile Number or User ID</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="e.g. +91 9876543210 or @trader_john"
              placeholderTextColor="#6F6F86"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6F6F86"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.8}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Authenticating...' : 'Secure Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>New to TradePost? Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#0F0F1E' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  hero: { marginBottom: 24 },
  brand: { color: '#00D084', fontSize: 14, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A0A0A0', fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  label: { color: '#CFCFE2', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#121226', color: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 8 },
  forgotText: { color: '#00D084', fontSize: 13, fontWeight: '600' },
  primaryButton: { backgroundColor: '#00D084', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#07130D', fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  secondaryButtonText: { color: '#A0A0A0', fontSize: 14, fontWeight: '600' },
});
