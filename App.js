import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { NativeBaseProvider, Text, Badge, Box, Icon } from "native-base";
import Ionicons from "@expo/vector-icons/Ionicons";
import FIREBASE from "./actions/config/FIREBASE/index.js";
import { getData } from "./utils/index.js";

// Import custom screens
import UserHome from "./screens/user-home.js";
import UserBeliObat from "./screens/user-beliobat.js";
import UserObat from "./screens/user-obat.js";
import UserProfile from "./screens/profile.js";
import Splash from "./screens/splash.js";
import Login from "./screens/login.js";
import Register from "./screens/register.js";
import AdminObat from "./screens/admin-obat.js";
import AdminRequest from "./screens/admin-request.js";
import Invoice from "./screens/invoice.js";
import AdminTambahObat from "./screens/admin-tambahobat.js";
import Profile from "./screens/profile.js";
import AdminEditObat from "./screens/admin-editobat.js";

// Navigator Declaration
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const noHead = { headerShown: false };
// Common tab bar style configuration
const commonTabBarStyle = {
  height: 75,
  paddingBottom: 10,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  borderTopWidth: 1,
  borderTopColor: "rgba(0, 0, 0, 0.1)",
  elevation: 8,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: -4,
  },
  shadowOpacity: 0.1,
  shadowRadius: 8,
};

// UP3 Tabs Navigator
const Tabs = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  const commonTabBarStyle = {
    backgroundColor: "white",
    height: 75,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  };

  // Options untuk hide header jika diperlukan
  const noHead = {
    headerShown: false,
  };

  useEffect(() => {
    // Mengambil data user saat komponen dimuat
    const fetchUser = async () => {
      try {
        const userData = await getData("user");
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return (
            <Box position="relative">
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? "#10b981" : "#64748b"} // Emerald-500 untuk focused
              />
            </Box>
          );
        },
        tabBarStyle: commonTabBarStyle,
        tabBarLabel: ({ focused }) => (
          <Text
            style={{
              fontSize: 12,
              fontWeight: focused ? "600" : "400",
              color: focused ? "#10b981" : "#64748b", // Emerald-500 untuk focused
              marginTop: 4,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarActiveTintColor: "#10b981", // Emerald-500
        tabBarInactiveTintColor: "#64748b", // Slate-500
      })}
    >
      <Tab.Screen name="Home" component={UserHome} options={noHead} />
      <Tab.Screen name="Profile" component={Profile} options={noHead} />
    </Tab.Navigator>
  );
};

const AdminTabs = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  const commonTabBarStyle = {
    backgroundColor: "white",
    height: 75,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  };

  const noHead = {
    headerShown: false,
  };

  useEffect(() => {
    // Mengambil data user saat komponen dimuat
    const fetchUser = async () => {
      try {
        const userData = await getData("user");
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, []);


  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          switch (route.name) {
            case "Data Obat":
            iconName = focused ? "stats-chart" : "stats-chart-outline";
            break;
            case "Request":
            iconName = focused ? "people" : "people-outline";
            break;
          case "Profile":
            iconName = focused ? "person" : "person-outline";
            break;
          }

          return (
            <Box position="relative">
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? "#10b981" : "#64748b"} // Emerald-500 untuk focused
              />
            </Box>
          );
        },
        tabBarStyle: commonTabBarStyle,
        tabBarLabel: ({ focused }) => (
          <Text
            style={{
              fontSize: 12,
              fontWeight: focused ? "600" : "400",
              color: focused ? "#10b981" : "#64748b", // Emerald-500 untuk focused
              marginTop: 4,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarActiveTintColor: "#10b981", // Emerald-500
        tabBarInactiveTintColor: "#64748b", // Slate-500
      })}
    >
      <Tab.Screen name="Data Obat" component={AdminObat} options={noHead} />
       <Tab.Screen name="Request" component={AdminRequest} options={noHead} />
      <Tab.Screen name="Profile" component={Profile} options={noHead} />
    </Tab.Navigator>
  );
};

// Main App component with Stack Navigator
const App = () => {
  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">
          <Stack.Screen name="Splash" component={Splash} options={noHead} />
          <Stack.Screen name="Tabs" component={Tabs} options={noHead} />
          <Stack.Screen
            name="AdminTabs"
            component={AdminTabs}
            options={noHead}
          />
          <Stack.Screen name="Login" component={Login} options={noHead} />
          <Stack.Screen
            name="Invoice"
            component={Invoice}
            options={noHead}
          />
           <Stack.Screen
            name="Register"
            component={Register}
            options={noHead}
          />
           <Stack.Screen
            name="UserBeliObat"
            component={UserBeliObat}
            options={noHead}
          />
           <Stack.Screen
            name="AdminTambahObat"
            component={AdminTambahObat}
            options={noHead}
          />
           <Stack.Screen
            name="UserObat"
            component={UserObat}
            options={noHead}
          />
           <Stack.Screen
            name="AdminEditObat"
            component={AdminEditObat}
            options={noHead}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#24a8e0",
    shadowOffset: {
      width: 0,
      height: 100,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
});
