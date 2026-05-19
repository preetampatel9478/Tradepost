import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface SocialAuthButtonProps {
  provider: 'google' | 'apple';
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({
  provider,
  title,
  onPress,
  isLoading = false,
  disabled = false,
}) => {
  const isGoogle = provider === 'google';
  
  return (
    <TouchableOpacity
      style={[
        styles.button, 
        isGoogle ? styles.googleButton : styles.appleButton, 
        (disabled || isLoading) && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isGoogle ? '#0F0F1E' : '#FFFFFF'} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <FontAwesome 
              name={isGoogle ? 'google' : 'apple'} 
              size={20} 
              color={isGoogle ? '#0F0F1E' : '#FFFFFF'} 
            />
          </View>
          <Text style={[styles.text, isGoogle ? styles.googleText : styles.appleText]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#333333',
  },
  googleText: {
    color: '#1F1F1F',
  },
  appleText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.6,
  },
});
