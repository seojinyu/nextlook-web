import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSession } from './src/lib/auth';
import { supabase } from './src/lib/supabase';
import AuthScreen from './src/screens/AuthScreen';
import WardrobeScreen from './src/screens/WardrobeScreen';
import AddClothingScreen from './src/screens/AddClothingScreen';
import RecommendScreen from './src/screens/RecommendScreen';
import OutfitScreen from './src/screens/OutfitScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const INACTIVE = '#A8A4A0';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1A1A1A',
    background: '#FAFAF8',
    card: '#FFFFFF',
    text: '#1A1A1A',
    border: '#EDEAE6',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EDEAE6',
          borderTopWidth: 0.5,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
      }}
    >
      <Tab.Screen
        name="Recommend"
        component={RecommendScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="sparkles" size={size} color={focused ? '#1B6B4A' : INACTIVE} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color: focused ? '#1B6B4A' : INACTIVE }}>추천</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="shirt" size={size} color={focused ? '#C49A3C' : INACTIVE} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color: focused ? '#C49A3C' : INACTIVE }}>옷장</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Outfit"
        component={OutfitScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="albums" size={size} color={focused ? '#3D5A80' : INACTIVE} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color: focused ? '#3D5A80' : INACTIVE }}>메모리</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { session, loading } = useSession();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (!session) {
      setProfileChecked(false);
      setNeedsProfile(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('profile_completed_at')
          .eq('id', session.user.id)
          .maybeSingle();
        setNeedsProfile(!data?.profile_completed_at);
      } catch (e) {
        setNeedsProfile(false); // 에러 시 그냥 통과
      } finally {
        setProfileChecked(true);
      }
    })();
  }, [session]);

  if (loading || (session && !profileChecked)) {
    return (
      <View style={styles.splash}>
        <Ionicons name="shirt-outline" size={48} color="#1B6B4A" />
        <ActivityIndicator color="#1B6B4A" style={{ marginTop: 20 }} />
      </View>
    );
  }

  const provider = session?.user?.app_metadata?.provider as 'email' | 'google' | 'kakao' | undefined;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme}>
        {!session ? (
          <AuthScreen />
        ) : needsProfile ? (
          <ProfileSetupScreen
            email={session.user.email ?? undefined}
            signupSource={provider}
            onComplete={() => setNeedsProfile(false)}
          />
        ) : (
          <Stack.Navigator>
            <Stack.Screen
              name="Tabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddClothing"
              component={AddClothingScreen}
              options={{
                title: '옷 등록',
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTitleStyle: { fontWeight: '700', color: '#1A1A1A', fontSize: 17 },
                headerShadowVisible: false,
                headerTintColor: '#1A1A1A',
              }}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },
});
