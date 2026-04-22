import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthStack from './src/navigation/AuthStack';

function RootNav() {
  const { user } = useAuth();
  return user ? <AppNavigator /> : <AuthStack />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer theme={{ dark: true, colors: { background: '#000', card: '#0a0a0a', text: '#fff', border: '#1a1a1a', primary: '#fe2c55', notification: '#fe2c55' } }}>
        <AuthProvider>
          <RootNav />
          <StatusBar style="light" backgroundColor="#000" />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
