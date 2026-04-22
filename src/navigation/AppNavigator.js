import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import UploadScreen from '../screens/UploadScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function UploadButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.uploadBtn}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <Stack.Screen name="MyProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Feed: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Upload: 'add',
            Earnings: focused ? 'cash' : 'cash-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={({ navigation }) => ({
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <UploadButton onPress={() => navigation.navigate('Upload')} />
          ),
        })}
      />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earn' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,10,10,0.97)',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 0.5,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  uploadBtn: {
    width: 46,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fe2c55',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});
