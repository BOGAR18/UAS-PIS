import React, { useState, useEffect, useMemo } from "react";
import { ScrollView, RefreshControl } from "react-native";
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Center,
  Divider,
  Icon,
  Badge,
  Pressable,
  useToast,
  Skeleton,
  Input,
  Actionsheet,
  useDisclose,
} from "native-base";
import { getDatabase, ref, onValue } from "firebase/database";
import Header from "../components/header";
import { MaterialIcons } from "@expo/vector-icons";
import FIREBASE from "../actions/config/FIREBASE";
import { getData } from "../utils";
import moment from "moment";
import "moment/locale/id";

const UserObat = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [pembelianData, setPembelianData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPembayaran, setFilterPembayaran] = useState("All");
  const [statsData, setStatsData] = useState({
    totalPembelian: 0,
    pending: 0,
    approved: 0,
    selesai: 0,
    totalSpent: 0,
  });
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclose();

  // Set moment locale to Indonesian
  moment.locale("id");

  // Filtered and searched data
  const filteredPembelianData = useMemo(() => {
    return pembelianData.filter((item) => {
      // Search filter
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.obat_items &&
          item.obat_items.some((obat) =>
            obat.nama.toLowerCase().includes(searchQuery.toLowerCase())
          )) ||
        (item.metode_pembayaran &&
          item.metode_pembayaran.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        filterStatus === "All" ||
        item.status === filterStatus;

      // Payment status filter
      const matchesPembayaran =
        filterPembayaran === "All" ||
        item.status_pembayaran === filterPembayaran;

      return matchesSearch && matchesStatus && matchesPembayaran;
    });
  }, [pembelianData, searchQuery, filterStatus, filterPembayaran]);

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const database = getDatabase();
    const pembelianRef = ref(database, "pembelian_obat");

    const unsubscribe = onValue(pembelianRef, (snapshot) => {
      const pembelianDataFromDB = snapshot.val();
      if (pembelianDataFromDB) {
        const pembelianArray = Object.entries(pembelianDataFromDB)
          .map(([key, value]) => ({
            id: key,
            ...value,
          }))
          .filter((item) => item.userId === user.uid)
          .sort(
            (a, b) =>
              new Date(b.createdAt || b.tanggal_pembelian) -
              new Date(a.createdAt || a.tanggal_pembelian)
          );

        setPembelianData(pembelianArray);

        // Calculate statistics
        const totalPembelian = pembelianArray.length;
        const pending = pembelianArray.filter(item => item.status === "Pending").length;
        const approved = pembelianArray.filter(item => item.status === "Disetujui" || item.status === "Approved").length;
        const selesai = pembelianArray.filter(item => item.status === "Selesai" || item.status === "Completed").length;
        const totalSpent = pembelianArray
          .filter(item => item.status === "Selesai" || item.status_pembayaran === "Sudah Dibayar")
          .reduce((sum, item) => sum + (item.total_harga || 0), 0);

        setStatsData({
          totalPembelian,
          pending,
          approved,
          selesai,
          totalSpent,
        });
      } else {
        setPembelianData([]);
        setStatsData({
          totalPembelian: 0,
          pending: 0,
          approved: 0,
          selesai: 0,
          totalSpent: 0,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getUserData = async () => {
    try {
      const userData = await getData("user");
      if (userData) {
        const userRef = FIREBASE.database().ref(`users/${userData.uid}`);
        const snapshot = await userRef.once("value");
        const updatedUserData = snapshot.val();
        if (updatedUserData) {
          setUser(updatedUserData);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.show({
        title: "Error",
        description: "Gagal memuat data pengguna",
        status: "error",
      });
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    getUserData().finally(() => setRefreshing(false));
  }, []);

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
    return moment(dateString).format("DD MMM YYYY, HH:mm");
  };

  const StatusBadge = ({ status }) => {
    return (
      <Badge
        colorScheme={getStatusColor(status)}
        variant="subtle"
        rounded="full"
        px={3}
        py={1}
        _text={{
          fontSize: "xs",
          fontWeight: "bold",
        }}
      >
        {getStatusText(status)}
      </Badge>
    );
  };

  // Component untuk menampilkan item obat individual
  const ObatItem = ({ obat, isPreview = false }) => {
    return (
      <Box
        bg={isPreview ? "gray.50" : "white"}
        p={3}
        rounded="lg"
        borderWidth={1}
        borderColor={isPreview ? "gray.100" : "gray.200"}
        mb={2}
      >
        <HStack justifyContent="space-between" alignItems="center" mb={2}>
          <VStack flex={1} mr={2}>
            <Text fontSize={isPreview ? "sm" : "md"} fontWeight="semibold" color="gray.800">
              {obat.nama}
            </Text>
            {obat.kategori && (
              <Text fontSize="xs" color="gray.500">
                {obat.kategori}
              </Text>
            )}
          </VStack>
          <VStack alignItems="flex-end">
            <Text fontSize={isPreview ? "sm" : "md"} fontWeight="bold" color="emerald.600">
              {formatCurrency(obat.harga || 0)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Qty: {obat.jumlah}
            </Text>
          </VStack>
        </HStack>
        
        {!isPreview && (
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="xs" color="gray.500">
              Subtotal:
            </Text>
            <Text fontSize="sm" color="gray.700" fontWeight="medium">
              {formatCurrency((obat.harga || 0) * (obat.jumlah || 0))}
            </Text>
          </HStack>
        )}
      </Box>
    );
  };

  const PembelianCard = ({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const previewLimit = 2; // Tampilkan 2 obat pertama di preview
    const hasMoreItems = item.obat_items && item.obat_items.length > previewLimit;

    const toggleExpand = () => {
      setExpanded(!expanded);
    };

    return (
      <Box
        bg="white"
        rounded="2xl"
        shadow="md"
        mb={4}
        borderWidth={1}
        borderColor="gray.200"
        overflow="hidden"
      >
        <Box p={4}>
          <HStack justifyContent="space-between" alignItems="center" mb={3}>
            <VStack space={1} flex={1}>
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="receipt" size={4} color="emerald.600" />
                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                  #{item.id.substring(0, 8)}
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                {formatDate(item.tanggal_pembelian || item.createdAt)}
              </Text>
            </VStack>

            <HStack alignItems="center" space={2}>
              <StatusBadge status={item.status} />

              <Pressable
                onPress={toggleExpand}
                p={2}
                rounded="full"
                _pressed={{ bg: "gray.100" }}
              >
                <Icon
                  as={MaterialIcons}
                  name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size="md"
                  color="gray.500"
                />
              </Pressable>
            </HStack>
          </HStack>

          {/* Display rejection reason if item is rejected */}
          {(item.status === "Ditolak" || item.status === "Rejected") && item.alasan_penolakan && (
            <Box mb={3} p={3} bg="red.50" rounded="md" borderWidth={1} borderColor="red.100">
              <Text fontSize="xs" color="red.700" fontWeight="medium">
                Alasan Penolakan:
              </Text>
              <Text fontSize="sm" color="red.600">
                {item.alasan_penolakan}
              </Text>
            </Box>
          )}

          {/* Tampilkan preview obat langsung tanpa expand */}
          <VStack space={3} mb={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="medical-services" size={4} color="emerald.500" />
                <Text fontSize="sm" color="emerald.700" fontWeight="medium">
                  Obat yang dibeli ({item.total_item || 0} item)
                </Text>
              </HStack>
              
              <Text fontSize="md" fontWeight="bold" color="emerald.600">
                {formatCurrency(item.total_harga || 0)}
              </Text>
            </HStack>

            {/* Preview Daftar Obat - Selalu tampil */}
            {item.obat_items && item.obat_items.length > 0 ? (
              <VStack space={2}>
                {item.obat_items.slice(0, previewLimit).map((obat, index) => (
                  <ObatItem key={index} obat={obat} isPreview={true} />
                ))}
                
                {hasMoreItems && !expanded && (
                  <Pressable onPress={toggleExpand}>
                    <Box
                      bg="emerald.50"
                      p={3}
                      rounded="lg"
                      borderWidth={1}
                      borderColor="emerald.100"
                      borderStyle="dashed"
                    >
                      <HStack justifyContent="center" alignItems="center" space={2}>
                        <Icon as={MaterialIcons} name="more-horiz" size={4} color="emerald.600" />
                        <Text fontSize="sm" color="emerald.600" fontWeight="medium">
                          Lihat {item.obat_items.length - previewLimit} obat lainnya
                        </Text>
                        <Icon as={MaterialIcons} name="keyboard-arrow-down" size={4} color="emerald.600" />
                      </HStack>
                    </Box>
                  </Pressable>
                )}
              </VStack>
            ) : (
              <Box bg="gray.50" p={3} rounded="lg">
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Tidak ada data obat
                </Text>
              </Box>
            )}
          </VStack>

          {/* Info pembayaran dan pengiriman */}
          <VStack space={2} mb={expanded ? 4 : 0}>
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

          {expanded && (
            <VStack space={4} mt={4}>
              <Divider />

              {/* Tampilkan semua obat ketika expanded */}
              {hasMoreItems && (
                <VStack space={3}>
                  <Text fontSize="md" fontWeight="semibold" color="gray.700">
                    Semua Obat ({item.obat_items.length} item)
                  </Text>
                  {item.obat_items.map((obat, index) => (
                    <ObatItem key={index} obat={obat} isPreview={false} />
                  ))}
                </VStack>
              )}

              {/* Order Details */}
              <VStack space={3}>
                <Text fontSize="md" fontWeight="semibold" color="gray.700">
                  Detail Pesanan
                </Text>
                
                {item.alamat_pengiriman && (
                  <Box bg="gray.50" p={3} rounded="lg">
                    <HStack space={2} alignItems="flex-start">
                      <Icon as={MaterialIcons} name="location-on" size={4} color="gray.500" mt={0.5} />
                      <VStack flex={1}>
                        <Text fontSize="xs" color="gray.500" fontWeight="medium">
                          Alamat Pengiriman
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          {item.alamat_pengiriman}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}

                {item.catatan && (
                  <Box bg="gray.50" p={3} rounded="lg">
                    <HStack space={2} alignItems="flex-start">
                      <Icon as={MaterialIcons} name="note" size={4} color="gray.500" mt={0.5} />
                      <VStack flex={1}>
                        <Text fontSize="xs" color="gray.500" fontWeight="medium">
                          Catatan
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          {item.catatan}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </VStack>
          )}
        </Box>
      </Box>
    );
  };

  const LoadingSkeleton = () => (
    <VStack space={4} p={4}>
      {[1, 2, 3].map((item) => (
        <Box key={item} bg="white" rounded="xl" overflow="hidden" p={4}>
          <Skeleton.Text px={4} />
          <Skeleton h={6} rounded="full" mt={4} />
          <Skeleton.Text px={4} mt={4} />
        </Box>
      ))}
    </VStack>
  );

  return (
    <>
      <Header title="Riwayat Pembelian" withBack={true} />
      <Box flex={1} bg="gray.100">
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header Section with Stats */}
          <Box bg="emerald.600" p={4}>
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack space={1}>
                  <Text fontSize="xl" color="white" fontWeight="bold">
                    Riwayat Pembelian Obat
                  </Text>
                  <Text fontSize="xs" color="emerald.100" opacity={0.9}>
                    {user?.name || "Customer"}
                  </Text>
                </VStack>
                <Button
                  onPress={() => navigation.navigate("UserBeliObat")}
                  bg="white"
                  _pressed={{ bg: "gray.100" }}
                  rounded="full"
                  size="sm"
                  leftIcon={
                    <Icon
                      as={MaterialIcons}
                      name="add-shopping-cart"
                      size="sm"
                      color="emerald.600"
                    />
                  }
                >
                  <Text color="emerald.600" fontSize="sm" fontWeight="medium">
                    Beli Obat
                  </Text>
                </Button>
              </HStack>

              {/* Quick Stats */}
              <HStack space={4} justifyContent="space-around" mt={2}>
                <VStack alignItems="center">
                  <Text fontSize="2xl" color="white" fontWeight="bold">
                    {statsData.totalPembelian}
                  </Text>
                  <Text fontSize="xs" color="emerald.100">
                    Total
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="2xl" color="white" fontWeight="bold">
                    {statsData.pending}
                  </Text>
                  <Text fontSize="xs" color="emerald.100">
                    Pending
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="2xl" color="white" fontWeight="bold">
                    {statsData.selesai}
                  </Text>
                  <Text fontSize="xs" color="emerald.100">
                    Selesai
                  </Text>
                </VStack>
                <VStack alignItems="center">
                  <Text fontSize="lg" color="white" fontWeight="bold">
                    {formatCurrency(statsData.totalSpent).replace(/\D/g, '').slice(0, -3)}K
                  </Text>
                  <Text fontSize="xs" color="emerald.100">
                    Total Belanja
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          {/* Search and Filter */}
          <Box bg="white" p={4}>
            <HStack space={2}>
              <Input
                flex={1}
                placeholder="Cari pembelian..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                InputLeftElement={
                  <Icon
                    as={MaterialIcons}
                    name="search"
                    size="md"
                    ml={2}
                    color="gray.400"
                  />
                }
                bg="gray.50"
                borderColor="gray.200"
                _focus={{ borderColor: "emerald.500", bg: "white" }}
              />
              <Button
                onPress={onOpen}
                variant="outline"
                colorScheme="emerald"
                leftIcon={<Icon as={MaterialIcons} name="filter-list" />}
              >
                Filter
              </Button>
            </HStack>

            <Actionsheet isOpen={isOpen} onClose={onClose}>
              <Actionsheet.Content>
                <Box w="100%" h={60} px={4} justifyContent="center">
                  <Text fontSize="16" color="gray.500" fontWeight="bold">
                    Filter Pembelian
                  </Text>
                </Box>

                {/* Payment Status Filter */}
                <Divider />
                <Actionsheet.Item
                  onPress={() => {
                    setFilterPembayaran("All");
                    onClose();
                  }}
                  startIcon={
                    <Icon
                      as={MaterialIcons}
                      name="payment"
                      color={filterPembayaran === "All" ? "emerald.500" : "gray.500"}
                    />
                  }
                >
                  Semua Pembayaran
                </Actionsheet.Item>
                <Actionsheet.Item
                  onPress={() => {
                    setFilterPembayaran("Sudah Dibayar");
                    onClose();
                  }}
                  startIcon={
                    <Icon
                      as={MaterialIcons}
                      name="paid"
                      color={filterPembayaran === "Sudah Dibayar" ? "emerald.500" : "gray.500"}
                    />
                  }
                >
                  Sudah Dibayar
                </Actionsheet.Item>
                <Actionsheet.Item
                  onPress={() => {
                    setFilterPembayaran("Belum Dibayar");
                    onClose();
                  }}
                  startIcon={
                    <Icon
                      as={MaterialIcons}
                      name="payment"
                      color={filterPembayaran === "Belum Dibayar" ? "emerald.500" : "gray.500"}
                    />
                  }
                >
                  Belum Dibayar
                </Actionsheet.Item>
              </Actionsheet.Content>
            </Actionsheet>
          </Box>

          <Box p={4}>
            {/* Content Section */}
            {loading ? (
              <LoadingSkeleton />
            ) : filteredPembelianData.length > 0 ? (
              filteredPembelianData.map((item) => (
                <PembelianCard key={item.id} item={item} />
              ))
            ) : (
              <Center py={12}>
                <Icon
                  as={MaterialIcons}
                  name="receipt-long"
                  size="4xl"
                  color="gray.300"
                />
                <Text fontSize="lg" color="gray.500" mt={4} fontWeight="medium">
                  {searchQuery || filterStatus !== "All" || filterPembayaran !== "All"
                    ? "Tidak ada pembelian yang cocok"
                    : "Belum ada riwayat pembelian"}
                </Text>
                <Text fontSize="sm" color="gray.400" mt={2} textAlign="center">
                  {searchQuery || filterStatus !== "All" || filterPembayaran !== "All"
                    ? "Coba ubah filter atau kata kunci pencarian"
                    : "Mulai belanja obat untuk melihat riwayat di sini"}
                </Text>
                {(!searchQuery && filterStatus === "All" && filterPembayaran === "All") && (
                  <Button
                    mt={4}
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
                )}
              </Center>
            )}
          </Box>
        </ScrollView>
      </Box>
    </>
  );
};

export default UserObat;