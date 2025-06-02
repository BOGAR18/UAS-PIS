import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import {
  Box,
  Image,
  Text,
  Heading,
  VStack,
  Icon,
  Button,
  HStack,
  Divider,
  Pressable,
  Badge,
  Center,
  Spinner,
} from "native-base";
import Header from "../components/header";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import FIREBASE from "../actions/config/FIREBASE";
import { getData } from "../utils";
import { useNavigation } from "@react-navigation/native";
import { getDatabase, ref, onValue } from "firebase/database";
import moment from "moment";
import "moment/locale/id";

const UserHome = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [recentPembelian, setRecentPembelian] = useState([]);
  const [statsData, setStatsData] = useState({
    totalPembelian: 0,
    pending: 0,
    approved: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  // Set moment locale to Indonesian
  moment.locale("id");

  const getUserData = async () => {
    try {
      const userData = await getData("user");
      if (userData) {
        const userRef = FIREBASE.database().ref(`users/${userData.uid}`);
        const snapshot = await userRef.once("value");
        const updatedUserData = snapshot.val();
        if (updatedUserData) {
          setUser(updatedUserData);
        } else {
          console.log("User data not found");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getRecentPembelian = async () => {
    try {
      const userData = await getData("user");
      if (userData) {
        const database = getDatabase();
        const pembelianRef = ref(database, "pembelian_obat");

        onValue(pembelianRef, (snapshot) => {
          const pembelianData = snapshot.val();
          if (pembelianData) {
            // Filter by current user and get recent purchases
            const pembelianArray = Object.entries(pembelianData)
              .map(([key, value]) => ({
                id: key,
                ...value,
              }))
              .filter((item) => item.userId === userData.uid)
              .sort((a, b) => new Date(b.createdAt || b.tanggal_pembelian) - new Date(a.createdAt || a.tanggal_pembelian))
              .slice(0, 5); // Get 5 most recent items

            setRecentPembelian(pembelianArray);

            // Calculate statistics
            const totalPembelian = pembelianArray.length;
            const pending = pembelianArray.filter(item => item.status === "Pending").length;
            const approved = pembelianArray.filter(item => item.status === "Disetujui" || item.status === "Approved").length;
            const totalSpent = pembelianArray
              .filter(item => item.status === "Selesai" || item.status_pembayaran === "Sudah Dibayar")
              .reduce((sum, item) => sum + (item.total_harga || 0), 0);

            setStatsData({
              totalPembelian,
              pending,
              approved,
              totalSpent,
            });
          } else {
            setRecentPembelian([]);
            setStatsData({
              totalPembelian: 0,
              pending: 0,
              approved: 0,
              totalSpent: 0,
            });
          }
          setLoading(false);
        });
      }
    } catch (error) {
      console.error("Error fetching recent pembelian:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      getUserData();
      getRecentPembelian();
    });

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // Function to get status badge color
  const getStatusColor = (status) => {
    if (status === "Disetujui" || status === "Approved") return "success";
    if (status === "Ditolak" || status === "Rejected") return "error";
    if (status === "Selesai" || status === "Completed") return "info";
    return "warning"; // Default for pending
  };

  const getStatusText = (status) => {
    switch(status) {
      case "Pending": return "Menunggu Verifikasi";
      case "Disetujui":
      case "Approved": return "Disetujui";
      case "Ditolak":
      case "Rejected": return "Ditolak";
      case "Selesai":
      case "Completed": return "Selesai";
      default: return status || "Tidak Diketahui";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Tidak ada tanggal";
    return moment(dateString).format("DD MMM YYYY");
  };

  return (
    <Box flex={1} bg="gray.50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Header title={"Healify"} />

        {/* Hero Section with Gradient */}
        <Box bg={"emerald.500"} pt={6} pb={20} px={6}>
          <VStack space={2}>
            <HStack space={2} alignItems="center">
              <Icon as={MaterialIcons} name="medical-services" size={6} color="emerald.100" />
              <Text fontSize="md" color="emerald.100" fontWeight="medium">
                Selamat Datang di Healify
              </Text>
            </HStack>
            <Text
              fontSize="3xl"
              color="white"
              fontWeight="bold"
              numberOfLines={1}
            >
              {user?.name || "Customer"}
            </Text>
            <Text fontSize="sm" color="emerald.100" mt={1}>
              Apotek terpercaya untuk kebutuhan kesehatan Anda
            </Text>
          </VStack>
        </Box>

        {/* Stats Cards */}
        <Box px={6} mt={-16} mb={6}>
          <HStack space={3} justifyContent="space-between">
            <Box flex={1} bg="white" rounded="xl" p={4} shadow={2}>
              <Center>
                <Icon as={MaterialIcons} name="shopping-cart" size={8} color="emerald.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {statsData.totalPembelian}
                </Text>
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  Total Pembelian
                </Text>
              </Center>
            </Box>


            <Box flex={1} bg="white" rounded="xl" p={4} shadow={2}>
              <Center>
                <Icon as={MaterialIcons} name="attach-money" size={8} color="green.500" mb={2} />
                <Text fontSize="2xl" fontWeight="bold" color="gray.800" numberOfLines={2} textAlign="center">
                  {formatCurrency(statsData.totalSpent)}
                </Text>
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  Total Belanja
                </Text>
              </Center>
            </Box>
          </HStack>
        </Box>

        <Box px={6}>
          {/* Why Choose Us Section */}
          <Box
            bg="white"
            rounded="xl"
            p={5}
            mb={6}
            shadow={2}
            borderWidth={1}
            borderColor="emerald.100"
          >
            <HStack space={2} alignItems="center" mb={4}>
              <Icon as={MaterialIcons} name="verified" size={6} color="emerald.600" />
              <Heading size="md" color="emerald.700">
                Mengapa Memilih Healify?
              </Heading>
            </HStack>

            <HStack space={8} justifyContent="center">
              <VStack space={3} alignItems="center" flex={1}>
                <Box bg="emerald.50" p={3} rounded="full">
                  <Icon as={MaterialIcons} name="verified-user" size={8} color="emerald.600" />
                </Box>
                <Text color="gray.700" fontSize="sm" textAlign="center" fontWeight="medium">
                  Terjamin
                </Text>
              </VStack>

              <VStack space={3} alignItems="center" flex={1}>
                <Box bg="blue.50" p={3} rounded="full">
                  <Icon as={MaterialIcons} name="schedule" size={8} color="blue.600" />
                </Box>
                <Text color="gray.700" fontSize="sm" textAlign="center" fontWeight="medium">
                  Cepat
                </Text>
              </VStack>

              <VStack space={3} alignItems="center" flex={1}>
                <Box bg="orange.50" p={3} rounded="full">
                  <Icon as={MaterialIcons} name="local-pharmacy" size={8} color="orange.600" />
                </Box>
                <Text color="gray.700" fontSize="sm" textAlign="center" fontWeight="medium">
                  Terpercaya
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Action Buttons */}
          <VStack space={4} mb={6}>
            <Button
              size="lg"
              bg="emerald.600"
              _pressed={{ bg: "emerald.700" }}
              leftIcon={
                <Icon as={MaterialIcons} name="add-shopping-cart" size="sm" />
              }
              onPress={() => navigation.navigate("UserBeliObat")}
              py={4}
              rounded="xl"
              shadow={2}
            >
              <Text color="white" fontSize="md" fontWeight="bold">
                Beli Obat Sekarang
              </Text>
            </Button>

            {/* <HStack space={3}>
              <Button
                flex={1}
                size="lg"
                bg="blue.500"
                _pressed={{ bg: "blue.600" }}
                leftIcon={<Icon as={MaterialIcons} name="history" size="sm" />}
                onPress={() => navigation.navigate("UserObat")}
                py={4}
                rounded="xl"
                shadow={2}
              >
                <Text color="white" fontSize="sm" fontWeight="medium">
                  Riwayat
                </Text>
              </Button>

              <Button
                flex={1}
                size="lg"
                bg="orange.500"
                _pressed={{ bg: "orange.600" }}
                leftIcon={<Icon as={MaterialIcons} name="support_agent" size="sm" />}
                onPress={() => navigation.navigate("CustomerService")}
                py={4}
                rounded="xl"
                shadow={2}
              >
                <Text color="white" fontSize="sm" fontWeight="medium">
                  Bantuan
                </Text>
              </Button>
            </HStack> */}
          </VStack>

          {/* Recent Purchases Section */}
          <Box mb={6}>
            <HStack justifyContent="space-between" alignItems="center" mb={4}>
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="receipt" size={5} color="gray.700" />
                <Heading size="md" color="gray.800">
                  Pembelian Terbaru
                </Heading>
              </HStack>
              {recentPembelian.length > 3 && (
                <Pressable onPress={() => navigation.navigate("UserObat")}>
                  <Text color="emerald.600" fontSize="sm" fontWeight="medium">
                    Lihat Semua
                  </Text>
                </Pressable>
              )}
            </HStack>

            {loading ? (
              <Center py={8}>
                <Spinner size="lg" color="emerald.500" />
                <Text mt={2} color="gray.500">Memuat data pembelian...</Text>
              </Center>
            ) : recentPembelian.length > 3 ? (
              <VStack space={3}>
                {recentPembelian.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate("UserObat", { id: item.id })}
                  >
                    <Box
                      bg="white"
                      p={4}
                      rounded="xl"
                      shadow={1}
                      borderWidth={1}
                      borderColor="gray.100"
                    >
                      <HStack justifyContent="space-between" alignItems="flex-start" mb={3}>
                        <VStack flex={1} space={1}>
                          <HStack space={2} alignItems="center">
                            <Icon as={MaterialIcons} name="receipt" size={4} color="emerald.600" />
                            <Text fontWeight="bold" color="gray.800" fontSize="sm">
                              Pembelian #{item.id.substring(0, 8)}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(item.tanggal_pembelian)}
                          </Text>
                        </VStack>
                        
                        <Badge
                          colorScheme={getStatusColor(item.status)}
                          variant="subtle"
                          rounded="full"
                          px={3}
                        >
                          <Text fontSize="xs" fontWeight="medium">
                            {getStatusText(item.status)}
                          </Text>
                        </Badge>
                      </HStack>

                      <VStack space={2}>
                        <HStack justifyContent="space-between" alignItems="center">
                          <HStack space={2} alignItems="center">
                            <Icon as={MaterialIcons} name="medical-services" size={4} color="gray.500" />
                            <Text fontSize="sm" color="gray.600">
                              {item.total_item || 0} obat
                            </Text>
                          </HStack>
                          
                          <Text fontSize="sm" fontWeight="bold" color="emerald.600">
                            {formatCurrency(item.total_harga || 0)}
                          </Text>
                        </HStack>

                        <HStack justifyContent="space-between" alignItems="center">
                          <HStack space={2} alignItems="center">
                            <Icon as={MaterialIcons} name="payment" size={4} color="gray.500" />
                            <Text fontSize="sm" color="gray.600">
                              {item.metode_pembayaran || "Tidak ada"}
                            </Text>
                          </HStack>

                          {item.status_pembayaran && (
                            <Badge
                              colorScheme={item.status_pembayaran === "Sudah Dibayar" ? "success" : "warning"}
                              variant="outline"
                              size="sm"
                            >
                              <Text fontSize="xs">
                                {item.status_pembayaran}
                              </Text>
                            </Badge>
                          )}
                        </HStack>

                        {item.resep_required && (
                          <HStack space={2} alignItems="center">
                            <Icon as={MaterialIcons} name="description" size={4} color="orange.500" />
                            <Text fontSize="xs" color="orange.600" fontWeight="medium">
                              Memerlukan resep dokter
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  </Pressable>
                ))}
              </VStack>
            ) : (
              <Box
                bg="white"
                p={8}
                rounded="xl"
                shadow={1}
                borderWidth={1}
                borderColor="gray.100"
                alignItems="center"
              >
                <Icon
                  as={MaterialIcons}
                  name="shopping-cart-checkout"
                  size="4xl"
                  color="gray.300"
                  mb={4}
                />
                <Text color="gray.500" textAlign="center" fontSize="md" fontWeight="medium" mb={2}>
                  Belum Ada Pembelian
                </Text>
                <Text color="gray.400" textAlign="center" fontSize="sm" mb={4}>
                  Mulai belanja obat untuk kebutuhan kesehatan Anda
                </Text>
                
                <Button
                  size="sm"
                  bg="emerald.500"
                  _pressed={{ bg: "emerald.600" }}
                  onPress={() => navigation.navigate("UserBeliObat")}
                  leftIcon={<Icon as={MaterialIcons} name="add-shopping-cart" size="xs" />}
                  rounded="lg"
                >
                  <Text color="white" fontSize="sm" fontWeight="medium">
                    Mulai Belanja
                  </Text>
                </Button>
              </Box>
            )}
          </Box>

          {/* Quick Access Section */}
          {/* <Box bg="white" rounded="xl" p={5} mb={6} shadow={2}>
            <HStack space={2} alignItems="center" mb={4}>
              <Icon as={MaterialIcons} name="flash-on" size={5} color="blue.600" />
              <Heading size="sm" color="gray.800">
                Akses Cepat
              </Heading>
            </HStack>

            <VStack space={3}>
              <Pressable
                onPress={() => navigation.navigate("CariObat")}
                _pressed={{ bg: "gray.50" }}
                p={3}
                rounded="lg"
              >
                <HStack space={3} alignItems="center">
                  <Box bg="blue.50" p={2} rounded="lg">
                    <Icon as={MaterialIcons} name="search" size={5} color="blue.600" />
                  </Box>
                  <VStack flex={1}>
                    <Text fontWeight="medium" color="gray.800">
                      Cari Obat
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Temukan obat yang Anda butuhkan
                    </Text>
                  </VStack>
                  <Icon as={MaterialIcons} name="chevron-right" size={5} color="gray.400" />
                </HStack>
              </Pressable>

              <Divider />

              <Pressable
                onPress={() => navigation.navigate("ProfilSaya")}
                _pressed={{ bg: "gray.50" }}
                p={3}
                rounded="lg"
              >
                <HStack space={3} alignItems="center">
                  <Box bg="emerald.50" p={2} rounded="lg">
                    <Icon as={MaterialIcons} name="person" size={5} color="emerald.600" />
                  </Box>
                  <VStack flex={1}>
                    <Text fontWeight="medium" color="gray.800">
                      Profil Saya
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Kelola informasi akun Anda
                    </Text>
                  </VStack>
                  <Icon as={MaterialIcons} name="chevron-right" size={5} color="gray.400" />
                </HStack>
              </Pressable>

              <Divider />

              <Pressable
                onPress={() => navigation.navigate("Notifikasi")}
                _pressed={{ bg: "gray.50" }}
                p={3}
                rounded="lg"
              >
                <HStack space={3} alignItems="center">
                  <Box bg="orange.50" p={2} rounded="lg">
                    <Icon as={MaterialIcons} name="notifications" size={5} color="orange.600" />
                  </Box>
                  <VStack flex={1}>
                    <Text fontWeight="medium" color="gray.800">
                      Notifikasi
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Lihat update pembelian Anda
                    </Text>
                  </VStack>
                  <Icon as={MaterialIcons} name="chevron-right" size={5} color="gray.400" />
                </HStack>
              </Pressable>
            </VStack>
          </Box> */}

          {/* Emergency Contact */}
          {/* <Box bg="red.50" rounded="xl" p={4} mb={8} borderWidth={1} borderColor="red.200">
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="emergency" size={6} color="red.600" />
              <VStack flex={1}>
                <Text fontWeight="bold" color="red.700" fontSize="sm">
                  Darurat? Hubungi Kami
                </Text>
                <Text fontSize="xs" color="red.600">
                  Layanan 24/7 untuk konsultasi obat
                </Text>
              </VStack>
              <Button
                size="sm"
                bg="red.500"
                _pressed={{ bg: "red.600" }}
                onPress={() => navigation.navigate("EmergencyContact")}
                rounded="lg"
              >
                <Text color="white" fontSize="xs" fontWeight="medium">
                  Hubungi
                </Text>
              </Button>
            </HStack>
          </Box> */}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default UserHome;