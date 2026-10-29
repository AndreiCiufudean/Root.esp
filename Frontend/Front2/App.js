import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext, useAuth } from './src/auth';
import { api } from './src/api';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import AddPlantScreen from './src/screens/AddPlantScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import MenuScreen from './src/screens/MenuScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const icon = (glyph) => ({ focused }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>
);

function MainTabs() {
  const { user, unread, setUnread } = useAuth();

  useEffect(() => {
    api.getNotifications(user.UserID).then((n) => setUnread(n.filter((x) => !x.IsRead).length)).catch(() => {});
  }, [user.UserID]);

  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.fern,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { color: colors.soil },
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: icon('🌿') }} />
      <Tabs.Screen name="Assistant" component={ChatScreen} options={{ tabBarIcon: icon('💬') }} />
      <Tabs.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{ tabBarIcon: icon('🔔'), tabBarBadge: unread > 0 ? unread : undefined }}
      />
      {user.IsAdmin && <Tabs.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: icon('🛠') }} />}
      <Tabs.Screen name="Menu" component={MenuScreen} options={{ tabBarIcon: icon('☰') }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  return (
    <AuthContext.Provider value={{ user, unread, setUnread, signIn: setUser, signOut: () => { setUser(null); setUnread(0); } }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen name="PlantDetail" component={PlantDetailScreen} options={{ title: 'Plant' }} />
              <Stack.Screen name="AddPlant" component={AddPlantScreen} options={{ title: 'Add plant' }} />
              <Stack.Screen name="Devices" component={DevicesScreen} options={{ title: 'My devices' }} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
