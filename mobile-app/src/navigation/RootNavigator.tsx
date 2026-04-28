import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, View } from 'react-native';
import { useAppSelector } from '../redux/hooks';
import GlobalHeader from '../components/common/GlobalHeader';
import HomeScreen from '../screens/HomeScreen';
import StockScreen from '../screens/StockScreen';
import NewsScreen from '../screens/NewsScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

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
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: '#07111D' }}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: ['Home', 'Search', 'Messages'].includes(route.name),
        headerTransparent: true,
        header: () => <GlobalHeader title={route.name === 'Messages' ? 'Chat' : route.name} />,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 14,
          backgroundColor: 'rgba(17, 17, 33, 0.96)',
          borderTopWidth: 0,
          borderRadius: 24,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 10,
          shadowColor: '#000000',
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 18,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarActiveTintColor: '#6EF3A5',
        tabBarInactiveTintColor: '#8D93A7',
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
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
