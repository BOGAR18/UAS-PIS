import React, { useState, useEffect } from "react";
import { Linking, Alert } from "react-native";
import {
  StatusBar,
  Image,
  Box,
  Heading,
  Text,
  ScrollView,
  VStack,
  Button,
  Icon,
  HStack,
  Divider,
  Pressable,
} from "native-base";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import Header from "../components/header";
import { getData } from "../utils/localStorage";
import FIREBASE from "../actions/config/FIREBASE";
import { logoutUser } from "../actions/AuthAction";

const ProfileCard = ({ icon, title, value }) => (
  <HStack space={4} alignItems="center" py={3}>
    <Box bg="blue.50" p={2} borderRadius="lg">
      <Icon as={Feather} name={icon} size={5} color="blue.500" />
    </Box>
    <VStack>
      <Text fontSize="sm" color="gray.500">
        {title}
      </Text>
      <Text fontSize="md" fontWeight="semibold" color="gray.700">
        {value || "Tidak tersedia"}
      </Text>
    </VStack>
  </HStack>
);

const Profile = ({ navigation }) => {
  const [Profile, setProfile] = useState(null);

  const getUserData = async () => {
    try {
      const userData = await getData("user");

      if (userData) {
        const userRef = FIREBASE.database().ref(`users/${userData.uid}`);
        const snapshot = await userRef.once("value");
        const updatedUserData = snapshot.val();

        if (updatedUserData) {
          setProfile(updatedUserData);
        } else {
          console.log("User data not found");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", getUserData);
    return () => unsubscribe();
  }, [navigation]);

  return (
  <>
      <Header title="Profile" />
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <Box flex={1} p={4}>
        {/* Profile Card */}
        <Box bg="white" borderRadius="3xl" shadow="2" overflow="hidden">
          {/* Banner */}
          <Box
            h={32}
            bg={{
              linearGradient: {
                colors: ["blue.400", "blue.600"],
                start: [0, 0],
                end: [1, 0],
              },
            }}
          />

          {/* Profile Content */}
          <Box px={6} pb={6}>
            {/* Profile Image */}
            <Box alignItems="center" mt={-24}>
              <Box bg="white" p={1} borderRadius="full" shadow="3">
                <Image
                  source={require("../assets/logo.png")}
                  borderRadius="full"
                  h={32}
                  w={32}
                  alt="Profile Logo"
                />
              </Box>

              <VStack space={1} mt={4} alignItems="center">
                <Heading fontSize="2xl" fontWeight="bold" color="gray.800">
                  {Profile?.name}
                </Heading>
                <Text fontSize="md" color="gray.500" fontWeight="medium">
                  UID JAWA TIMUR
                </Text>
              </VStack>
            </Box>

            <Divider my={3} />

            {/* Profile Information */}
            <VStack space={2}>
              <ProfileCard icon="mail" 
              title="Email" 
              value={Profile?.email} />
              <ProfileCard
                icon="phone"
                title="Nomor Telepon"
                value={Profile?.nomorhp}
              />
              <ProfileCard
                icon="shield"
                title="Status"
                value={Profile?.status}
              />
              <Button
            onPress={() => {
              // Use Linking API to open WhatsApp
              Linking.openURL("whatsapp://send?phone=PHONE_NUMBER_HERE").catch(
                (err) => {
                  // If WhatsApp is not installed, you might want to handle that case
                  console.error("An error occurred", err);
                  Alert.alert(
                    "Error",
                    "WhatsApp is not installed on this device"
                  );
                }
              );
            }}
            bg="green.500" // Changed to WhatsApp's color
            _pressed={{ bg: "green.600" }}
            py={4}
            borderRadius="2xl"
            shadow="2"
            leftIcon={
              <Icon
                as={Feather}
                name="message-circle"
                size="sm"
                color="white"
              /> // Changed icon
            }
          >
            Bantuan dan Dukungan
          </Button>
            </VStack>
          </Box>
        </Box>

        {/* Action Buttons */}
        <VStack space={3} mt={6}>
          <Button
            onPress={() => logoutUser(navigation)}
            bg="red.500"
            _pressed={{ bg: "red.600" }}
            py={4}
            borderRadius="2xl"
            shadow="2"
            leftIcon={
              <Icon as={Feather} name="log-out" size="sm" color="white" />
            }
          >
            Keluar
          </Button>
        </VStack>
      </Box>
      </>
  );
};

export default Profile;
