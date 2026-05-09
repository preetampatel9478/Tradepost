import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type LanguageCode = 'en' | 'hi';

const STORAGE_KEY = 'tradepost.language';

type TranslationKey =
  | 'accountSettings'
  | 'language'
  | 'english'
  | 'hindi'
  | 'privateAccount'
  | 'privateAccountHelp'
  | 'helpSupport'
  | 'faq'
  | 'contactSupport'
  | 'reportProblem'
  | 'reportUserPost'
  | 'communityGuidelines'
  | 'privacyPolicy'
  | 'termsConditions'
  | 'aboutTradePost'
  | 'appVersion'
  | 'supportEmail'
  | 'sendEmail'
  | 'privacySecurity'
  | 'twoFA'
  | 'blockedUsers'
  | 'loginActivity'
  | 'subscription'
  | 'premiumPlan'
  | 'verificationBadge'
  | 'account'
  | 'changePassword'
  | 'deleteAccount'
  | 'comingSoon';

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    accountSettings: 'Account Settings',
    language: 'Language',
    english: 'English',
    hindi: 'Hindi',
    privateAccount: 'Private Account',
    privateAccountHelp: 'Only approved users can follow',
    helpSupport: 'Help & Support',
    faq: 'FAQ',
    contactSupport: 'Contact Support',
    reportProblem: 'Report a Problem',
    reportUserPost: 'Report User/Post',
    communityGuidelines: 'Community Guidelines',
    privacyPolicy: 'Privacy Policy',
    termsConditions: 'Terms & Conditions',
    aboutTradePost: 'About TradePost',
    appVersion: 'App Version',
    supportEmail: 'support@tradepost.com',
    sendEmail: 'Send Email',
    privacySecurity: 'Privacy & Security',
    twoFA: '2FA',
    blockedUsers: 'Blocked Users',
    loginActivity: 'Login Activity',
    subscription: 'Subscription',
    premiumPlan: 'Premium Plan',
    verificationBadge: 'Verification Badge',
    account: 'Account',
    changePassword: 'Change Password',
    deleteAccount: 'Delete Account',
    comingSoon: 'Coming soon',
  },
  hi: {
    accountSettings: 'खाता सेटिंग्स',
    language: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    privateAccount: 'निजी खाता',
    privateAccountHelp: 'केवल अनुमोदित उपयोगकर्ता फॉलो कर सकते हैं',
    helpSupport: 'सहायता और समर्थन',
    faq: 'सामान्य प्रश्न',
    contactSupport: 'सपोर्ट से संपर्क करें',
    reportProblem: 'समस्या रिपोर्ट करें',
    reportUserPost: 'यूज़र/पोस्ट रिपोर्ट करें',
    communityGuidelines: 'समुदाय दिशानिर्देश',
    privacyPolicy: 'गोपनीयता नीति',
    termsConditions: 'नियम और शर्तें',
    aboutTradePost: 'TradePost के बारे में',
    appVersion: 'ऐप संस्करण',
    supportEmail: 'support@tradepost.com',
    sendEmail: 'ईमेल भेजें',
    privacySecurity: 'गोपनीयता और सुरक्षा',
    twoFA: '2FA',
    blockedUsers: 'ब्लॉक किए गए उपयोगकर्ता',
    loginActivity: 'लॉगिन गतिविधि',
    subscription: 'सब्सक्रिप्शन',
    premiumPlan: 'प्रीमियम प्लान',
    verificationBadge: 'वेरिफिकेशन बैज',
    account: 'खाता',
    changePassword: 'पासवर्ड बदलें',
    deleteAccount: 'खाता हटाएं',
    comingSoon: 'जल्द आ रहा है',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (next: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] ?? String(key),
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (stored === 'en' || stored === 'hi') setLanguageState(stored);
      } catch {
        // Ignore storage failures.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[language]?.[key] ?? translations.en[key] ?? String(key);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
