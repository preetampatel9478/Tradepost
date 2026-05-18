import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks';
import { incrementUnread } from '../store/slices/chatSlice';
import { getAuthedSocket } from '../services/socket';
import GlobalHeader from '../components/common/GlobalHeader';
import HomeScreen from '../screens/HomeScreen';
import StockScreen from '../screens/StockScreen';
import NewsScreen from '../screens/NewsScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import TagFeedScreen from '../screens/TagFeedScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { useTheme } from '../contexts/ThemeContext';

import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { theme, colors } = useTheme();
  const unreadCount = useAppSelector((state) => state.chat.unreadCount);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    (async () => {
      try {
        const socket = await getAuthedSocket();
        const handleChatMsg = (msg: any) => {
          if (String(msg.senderId) !== String(user?.id)) {
            dispatch(incrementUnread());
          }
        };
        socket.on('chat:message', handleChatMsg);
        cleanup = () => socket.off('chat:message', handleChatMsg);
      } catch (err) {}
    })();
    return () => {
      if (cleanup) cleanup();
    };
  }, [dispatch, user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        headerTransparent: true,
        header: () => <GlobalHeader title={route.name === 'Messages' ? 'Chat' : route.name} />,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 14,
          backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(17, 17, 33, 0.96)',
          borderTopWidth: theme === 'light' ? 1 : 0,
          borderTopColor: colors.border,
          borderRadius: 24,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 10,
          shadowColor: '#000000',
          shadowOpacity: theme === 'light' ? 0.05 : 0.25,
          shadowRadius: theme === 'light' ? 10 : 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: theme === 'light' ? 2 : 18,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarActiveTintColor: theme === 'light' ? colors.verifiedBlue : '#6EF3A5',
        tabBarInactiveTintColor: theme === 'light' ? '#94A3B8' : '#8D93A7',
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Home'
              ? 'home-outline'
              : route.name === 'Shorts'
                ? 'flash-outline'
                : route.name === 'Opinion'
                  ? 'create-outline'
                  : route.name === 'Search'
                    ? 'search-outline'
                    : route.name === 'Messages'
                      ? 'chatbubbles-outline'
                      : 'person-outline';

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Shorts"
        component={StockScreen}
        options={{
          title: 'Shorts',
        }}
      />
      <Tab.Screen
        name="Opinion"
        component={NewsScreen}
        options={{
          title: 'Post Your Opinion',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#FFFFFF',
            fontSize: 10,
          }
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen name="TagFeed" component={TagFeedScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
