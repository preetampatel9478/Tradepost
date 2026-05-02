import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from '../contexts/ThemeContext';
import { X, TrendingUp, TrendingDown, Info } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks'; // Use to check user status
import { createPost } from '../store/slices/postSlice';
import { getApiErrorMessage } from '../utils/apiError';

interface PostFormData {
  opinion: string;
}

export default function ComposePostScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [isPosting, setIsPosting] = useState(false);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | null>(null);
  
  // 3. Verification Check: Assume we extract user status from Redux
  const userStatus = useAppSelector(state => state.auth.user?.status || 'Active'); // Assume 'Active', 'Pending', 'Inactive'
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<PostFormData>({
    defaultValues: { opinion: '' }
  });

  const opinionValue = watch('opinion');
  const isPostDisabled = !opinionValue.trim() || isPosting;

  const onSubmit = async (data: PostFormData) => {
    // Prevent non-verified users from posting
    if (userStatus !== 'Active') {
      Alert.alert('Account Verified Required', 'Your account must be fully verified to post opinions.');
      return;
    }

    if (!data.opinion.trim()) {
      Alert.alert('Validation Error', 'You cannot create an empty post.');
      return;
    }

    setIsPosting(true);
    try {
      const apiSentiment = sentiment === 'BULLISH' ? 'bullish' : sentiment === 'BEARISH' ? 'bearish' : 'neutral';
      await dispatch(createPost({ content: data.opinion.trim(), sentiment: apiSentiment })).unwrap();
      Alert.alert('Success', 'Your opinion has been published!');
      navigation?.navigate?.('Home');
    } catch (error) {
      Alert.alert('Post Failed', getApiErrorMessage(error));
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 1. Header Cleanup: Sleek Top-Right Post Button */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation?.goBack()} disabled={isPosting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.postButton, 
              isPostDisabled ? { backgroundColor: colors.border } : { backgroundColor: colors.verifiedBlue }
            ]} 
            onPress={handleSubmit(onSubmit)}
            disabled={isPostDisabled}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Input Area */}
          <Controller
            control={control}
            name="opinion"
            rules={{ maxLength: 500 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Write your opinion… use @mention, #tag, $stock"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isPosting}
                />
                <Text style={[styles.charCount, { color: value.length === 500 ? colors.bearish : colors.textSecondary }]}>
                  {value.length}/500
                </Text>
              </View>
            )}
          />

          {/* Priority: Sentiment Toggle */}
          <View style={styles.sentimentSection}>
             <TouchableOpacity
               style={[
                 styles.sentimentCard, 
                 { borderColor: colors.border },
                 sentiment === 'BULLISH' && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.bullish }
               ]}
               onPress={() => setSentiment('BULLISH')}
               disabled={isPosting}
             >
               <TrendingUp size={20} color={sentiment === 'BULLISH' ? colors.bullish : colors.textSecondary} />
               <Text style={[styles.sentimentText, { color: sentiment === 'BULLISH' ? colors.bullish : colors.textSecondary }]}>
                 Bullish 📈
               </Text>
             </TouchableOpacity>

             <TouchableOpacity
               style={[
                 styles.sentimentCard, 
                 { borderColor: colors.border },
                 sentiment === 'BEARISH' && { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: colors.bearish }
               ]}
               onPress={() => setSentiment('BEARISH')}
               disabled={isPosting}
             >
               <TrendingDown size={20} color={sentiment === 'BEARISH' ? colors.bearish : colors.textSecondary} />
               <Text style={[styles.sentimentText, { color: sentiment === 'BEARISH' ? colors.bearish : colors.textSecondary }]}>
                 Bearish 📉
               </Text>
             </TouchableOpacity>
          </View>

        </ScrollView>

        {/* 3. SEBI Safety & Compliance Footer */}
        <View style={[styles.safetyFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Info size={14} color={colors.disclaimer} style={{ marginTop: 2, marginRight: 6 }} />
          <Text style={[styles.safetyText, { color: colors.disclaimer }]}>
            Disclaimer: This post represents my personal opinion and is for educational purposes only. It is NOT financial advice. Always consult a SEBI registered advisor.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, width: '100%' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1 
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center'
  },
  postButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  textInput: { fontSize: 18, minHeight: 140, lineHeight: 28 },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 4 },
  
  
  sentimentSection: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 },
  sentimentCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8
  },
  sentimentText: { fontWeight: '600', fontSize: 15 },
  
  safetyFooter: { 
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, 
    borderTopWidth: 1, alignItems: 'flex-start' 
  },
  safetyText: { flex: 1, fontSize: 12, fontStyle: 'italic', lineHeight: 18 }
});
