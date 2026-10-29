import React, { createContext, useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import MenuScreen from './src/screens/MenuScreen';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const icon = (glyph) => ({ focused }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>
);

function MainTabs() {
  const { user } = useAuth();
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
      {user.role === 'admin' && (
        <Tabs.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: icon('🛠') }} />
      )}
      <Tabs.Screen name="Menu" component={MenuScreen} options={{ tabBarIcon: icon('☰') }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, signIn: setUser, signOut: () => setUser(null) }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen
                name="PlantDetail"
                component={PlantDetailScreen}
                options={({ route }) => ({ title: route.params.plant.name })}
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
