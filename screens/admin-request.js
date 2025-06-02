import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ScrollView,
  Badge,
  Icon,
  Pressable,
  Heading,
  StatusBar,
  Input,
  IconButton,
  Center,
  useColorModeValue,
  useToast,
  FlatList,
  Modal,
  FormControl,
  TextArea,
  Spinner,
  Divider,
  Image,
} from "native-base";
import {
  Ionicons,
  FontAwesome5,
  AntDesign,
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import moment from "moment";
import "moment/locale/id";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  set,
  get
} from "firebase/database";
import { RefreshControl } from "react-native";
import { Linking } from "react-native";
import Header from "../components/header";

// Filter Button Component - Updated to accept color props
const FilterButton = ({ 
  label, 
  statusValue, 
  iconName, 
  isActive, 
  onPress, 
  activeColor = "blue.600", 
  inactiveColor = "white" 
}) => {
  return (
    <Pressable
      onPress={() => onPress(statusValue)}
      bg={isActive ? activeColor : inactiveColor}
      px={4}
      py={2}
      rounded="full"
      shadow={isActive ? 3 : 1}
      borderWidth={1}
      borderColor={isActive ? activeColor : "coolGray.200"}
    >
      <HStack space={2} alignItems="center">
        <Icon
          as={MaterialCommunityIcons}
          name={iconName}
          color={isActive ? "white" : "gray.500"}
          size="sm"
        />
        <Text
          color={isActive ? "white" : "gray.700"}
          fontWeight={isActive ? "medium" : "normal"}
          fontSize="sm"
        >
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
};

const AdminRequest = ({ navigation }) => {
  const [requestList, setRequestList] = useState([]);
  const [filteredRequestList, setFilteredRequestList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all"); // New filter for request type
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  // States for rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);

  // Color and styling
  const primaryColor = "white";
  const accentColor = "#3f37c9";
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subtextColor = useColorModeValue("gray.600", "gray.400");

  // Set moment locale to Indonesian
  moment.locale("id");

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Tidak ada tanggal";
    return moment(dateString).format("DD MMMM YYYY");
  };

  // Direct download function
  const handleDirectDownload = async (fileUrl, type) => {
    try {
      if (!fileUrl) {
        toast.show({
          title: "Error",
          description: `URL ${type} tidak ditemukan`,
          status: "error",
        });
        return;
      }

      await Linking.openURL(fileUrl);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      toast.show({
        title: "Error",
        description: `Gagal mendownload ${type}`,
        status: "error",
      });
    }
  };

  // Fetch both Barang Keluar and Pembelian Obat data from Firebase
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const database = getDatabase();
      
      // Fetch Barang Keluar
      const barangKeluarRef = ref(database, "Barang_Keluar");
      // Fetch Pembelian Obat
      const pembelianObatRef = ref(database, "pembelian_obat");

      const combinedData = [];

      // Listen to Barang Keluar
      onValue(barangKeluarRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const processedBarangKeluar = Object.keys(data).map((key) => {
            let items = [];
            if (data[key].barang) {
              if (Array.isArray(data[key].barang)) {
                items = data[key].barang;
              } else {
                items = Object.values(data[key].barang);
              }
            }

            return {
              id: key,
              ...data[key],
              items: items,
              total_barang: items.length,
              request_type: "barang_keluar",
              title: data[key].Nama_PihakPeminjam || "Tidak ada nama",
              subtitle: data[key].Kategori_Peminjaman || "Kategori tidak ada",
              date: data[key].tanggal_peminjamanbarang,
            };
          });

          updateCombinedData(processedBarangKeluar, "barang_keluar");
        }
      });

      // Listen to Pembelian Obat
      onValue(pembelianObatRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const processedPembelianObat = Object.keys(data).map((key) => {
            let items = [];
            if (data[key].obat) {
              if (Array.isArray(data[key].obat)) {
                items = data[key].obat;
              } else {
                items = Object.values(data[key].obat);
              }
            }

            return {
              id: key,
              ...data[key],
              items: items,
              total_barang: items.length,
              request_type: "pembelian_obat",
              title: data[key].nama_customer || "Tidak ada nama",
              subtitle: `${data[key].metode_pembayaran || "Metode tidak ada"} - Rp ${Number(data[key].total_harga || 0).toLocaleString('id-ID')}`,
              date: data[key].tanggal_pembelian,
            };
          });

          updateCombinedData(processedPembelianObat, "pembelian_obat");
        }
      });

      setIsRefreshing(false);
    } catch (error) {
      console.error("Fetch data error:", error);
      toast.show({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data",
        status: "error",
      });
      setIsRefreshing(false);
    }
  };

  // Temporary storage for combined data
  const [tempBarangKeluar, setTempBarangKeluar] = useState([]);
  const [tempPembelianObat, setTempPembelianObat] = useState([]);

  const updateCombinedData = (data, type) => {
    if (type === "barang_keluar") {
      setTempBarangKeluar(data);
    } else if (type === "pembelian_obat") {
      setTempPembelianObat(data);
    }
  };

  useEffect(() => {
    const combined = [...tempBarangKeluar, ...tempPembelianObat];
    setRequestList(combined);
    applyFilters(combined, searchQuery, filterStatus, filterType);
  }, [tempBarangKeluar, tempPembelianObat]);

  // Apply filters to data
  const applyFilters = (data, query, status, type) => {
    let filtered = [...data];

    // Filter by request type
    if (type !== "all") {
      filtered = filtered.filter(item => item.request_type === type);
    }

    // Filter by search query
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(searchLower)) ||
          (item.No_SuratJalanBK && item.No_SuratJalanBK.toLowerCase().includes(searchLower)) ||
          (item.kode_obat && item.kode_obat.toLowerCase().includes(searchLower)) ||
          (item.items &&
            item.items.some(
              (barang) =>
                (barang.nama_barang && barang.nama_barang.toLowerCase().includes(searchLower)) ||
                (barang.nama_obat && barang.nama_obat.toLowerCase().includes(searchLower)) ||
                (barang.kode_barang && barang.kode_barang.toLowerCase().includes(searchLower)) ||
                (barang.kode_obat && barang.kode_obat.toLowerCase().includes(searchLower))
            ))
      );
    }

    // Filter by status
    if (status !== "all") {
      const now = moment();

      if (status === "pending") {
        filtered = filtered.filter((item) => item.status === "Pending");
      } else if (status === "approved") {
        filtered = filtered.filter((item) => 
          item.status === "Accepted" || item.status === "Approved" || item.status === "Disetujui"
        );
      } else if (status === "rejected") {
        filtered = filtered.filter((item) => 
          item.status === "Rejected" || item.status === "Ditolak"
        );
      } else if (status === "completed") {
        filtered = filtered.filter((item) => 
          item.status === "Dikembalikan" || item.status === "Selesai" || item.status === "Completed"
        );
      } else if (status === "paid") {
        filtered = filtered.filter((item) => 
          item.status_pembayaran === "Sudah Dibayar"
        );
      } else if (status === "unpaid") {
        filtered = filtered.filter((item) => 
          item.status_pembayaran === "Belum Dibayar"
        );
      }
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf();
      }
      if (a.date && b.date) {
        return moment(b.date).valueOf() - moment(a.date).valueOf();
      }
      return 0;
    });

    setFilteredRequestList(filtered);
  };

  // Watch for changes to filters
  useEffect(() => {
    applyFilters(requestList, searchQuery, filterStatus, filterType);
  }, [searchQuery, filterStatus, filterType, requestList]);

  // Get status badge component
  const getStatusBadge = (item) => {
    if (item.request_type === "pembelian_obat") {
      // Pembelian Obat status badges
      if (item.status === "Pending") {
        return (
          <Badge colorScheme="warning" rounded="full" variant="solid">
            Menunggu Verifikasi
          </Badge>
        );
      } else if (item.status === "Disetujui" || item.status === "Approved") {
        if (item.status_pembayaran === "Sudah Dibayar") {
          return (
            <Badge colorScheme="success" rounded="full" variant="solid">
              Lunas
            </Badge>
          );
        } else {
          return (
            <Badge colorScheme="info" rounded="full" variant="solid">
              Disetujui
            </Badge>
          );
        }
      } else if (item.status === "Ditolak" || item.status === "Rejected") {
        return (
          <Badge colorScheme="error" rounded="full" variant="solid">
            Ditolak
          </Badge>
        );
      } else if (item.status === "Selesai" || item.status === "Completed") {
        return (
          <Badge colorScheme="success" rounded="full" variant="solid">
            Selesai
          </Badge>
        );
      }
    } else {
      // Barang Keluar status badges (existing logic)
      if (item.status === "Rejected") {
        return (
          <Badge colorScheme="error" rounded="full" variant="solid">
            Ditolak
          </Badge>
        );
      } else if (item.status === "Accepted") {
        if (item.Tanggal_PengembalianBarang) {
          const remainingTime = getRemainingTime(
            item.tanggal_peminjamanbarang,
            item.Tanggal_PengembalianBarang
          );

          if (remainingTime === "Expired") {
            return (
              <Badge colorScheme="danger" rounded="full" variant="solid">
                Expired
              </Badge>
            );
          } else {
            return (
              <Badge colorScheme="warning" rounded="full" variant="solid">
                {remainingTime}
              </Badge>
            );
          }
        } else {
          return (
            <Badge colorScheme="success" rounded="full" variant="solid">
              Accepted
            </Badge>
          );
        }
      } else if (item.status === "Dikembalikan") {
        return (
          <Badge colorScheme="info" rounded="full" variant="solid">
            Dikembalikan
          </Badge>
        );
      } else {
        return (
          <Badge colorScheme="warning" rounded="full" variant="solid">
            Pending
          </Badge>
        );
      }
    }

    return (
      <Badge colorScheme="gray" rounded="full" variant="solid">
        Unknown
      </Badge>
    );
  };

  // Calculate time remaining for barang keluar
  const getRemainingTime = (startDate, returnDate) => {
    if (!startDate || !returnDate) return null;

    const end = moment(returnDate);
    const start = moment();

    if (start.isAfter(end)) return "Expired";

    const duration = moment.duration(end.diff(start));
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();

    return `${days}d ${hours}h ${minutes}m`;
  };

 // Handle approval for pembelian obat
const handleApprovePembelianObat = async (id) => {
  try {
    const database = getDatabase();
    const approveRef = ref(database, `pembelian_obat/${id}`);
    
    await update(approveRef, {
      status: "Disetujui",
      tanggal_disetujui: moment().format("YYYY-MM-DD HH:mm:ss"),
    });

    toast.show({
      title: "Sukses",
      description: "Pembelian obat berhasil disetujui",
      status: "success",
    });

    fetchData();
  } catch (error) {
    console.error("Error approving pembelian obat:", error);
    toast.show({
      title: "Error",
      description: "Gagal menyetujui pembelian obat",
      status: "error",
    });
  }
};
  // Handle marking payment as completed
  const handleMarkAsPaid = async (id) => {
    try {
      const database = getDatabase();
      const paidRef = ref(database, `pembelian_obat/${id}`);
      
      await update(paidRef, {
        status_pembayaran: "Sudah Dibayar",
        tanggal_pembayaran: moment().format("YYYY-MM-DD HH:mm:ss"),
        status: "Selesai",
      });

      toast.show({
        title: "Sukses",
        description: "Status pembayaran berhasil diperbarui",
        status: "success",
      });

      fetchData();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.show({
        title: "Error",
        description: "Gagal memperbarui status pembayaran",
        status: "error",
      });
    }
  };

  // Modified rejection handler to support both types
  const handleRejectApplication = () => {
    if (!selectedItemId || !rejectionReason.trim()) {
      toast.show({
        title: "Error",
        description: "Alasan penolakan harus diisi",
        status: "error",
      });
      return;
    }

    const database = getDatabase();
    const tableName = selectedItemType === "pembelian_obat" ? "pembelian_obat" : "Barang_Keluar";
    const rejectRef = ref(database, `${tableName}/${selectedItemId}`);

    const selectedItem = requestList.find(item => item.id === selectedItemId);

    if (!selectedItem) {
      toast.show({
        title: "Error",
        description: "Data pengajuan tidak ditemukan",
        status: "error",
      });
      return;
    }

    const updateData = selectedItemType === "pembelian_obat" ? {
      status: "Ditolak",
      alasan_penolakan: rejectionReason,
      tanggal_penolakan: moment().format("YYYY-MM-DD HH:mm:ss"),
    } : {
      status: "Rejected",
      alasan_penolakan: rejectionReason,
      tanggal_penolakan: moment().format("YYYY-MM-DD HH:mm:ss"),
    };
  };



  // Item card component for displaying each request entry
  const ItemCard = ({ item }) => {
    const itemCount = item.items?.length || 0;
    const isPembelianObat = item.request_type === "pembelian_obat";

    return (
      <Box
        bg={cardBg}
        rounded="xl"
        shadow={3}
        mb={4}
        mx={4}
        overflow="hidden"
        borderWidth={1}
        borderColor="coolGray.200"
      >
        {/* Request Type Indicator */}
        <Box bg={isPembelianObat ? "emerald.500" : "blue.500"} px={4} py={2}>
          <HStack space={2} alignItems="center">
            <Icon
              as={MaterialIcons}
              name={isPembelianObat ? "shopping-cart" : "inventory"}
              color="white"
              size="sm"
            />
            <Text color="white" fontSize="sm" fontWeight="medium">
              {isPembelianObat ? "Pembelian Obat" : "Barang Keluar"}
            </Text>
          </HStack>
        </Box>

        {/* Card Content */}
        <VStack space={4} p={4}>
          {/* Header Section */}
          <HStack justifyContent="space-between" alignItems="flex-start">
            <VStack flex={1} space={1} mr={3}>
              <Heading size="sm" color={textColor} numberOfLines={2}>
                {item.title}
              </Heading>
              <Text fontSize="sm" color={subtextColor} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </VStack>
            {getStatusBadge(item)}
          </HStack>

          {/* Date and Main Details */}
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1}>
                <Text fontSize="xs" color={subtextColor} fontWeight="medium">
                  {isPembelianObat ? "Tanggal Pembelian" : "Tanggal Peminjaman"}
                </Text>
                <Text fontSize="sm" color={textColor} fontWeight="medium">
                  {formatDate(item.date)}
                </Text>
              </VStack>

              <VStack alignItems="flex-end">
                <Text fontSize="xs" color={subtextColor} fontWeight="medium">
                  Total {isPembelianObat ? "Obat" : "Barang"}
                </Text>
                <HStack alignItems="center" space={1}>
                  <Icon
                    as={Ionicons}
                    name={isPembelianObat ? "medical-outline" : "cube-outline"}
                    size="sm"
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color={textColor} fontWeight="medium">
                    {itemCount} item
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {/* Pembelian Obat specific details */}
            {isPembelianObat && (
              <VStack space={2} p={3} bg="coolGray.50" rounded="lg">
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="xs" color={subtextColor} fontWeight="medium">Total Harga:</Text>
                  <Text fontSize="lg" fontWeight="bold" color="emerald.600">
                    Rp {Number(item.total_harga || 0).toLocaleString('id-ID')}
                  </Text>
                </HStack>
                
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="xs" color={subtextColor} fontWeight="medium">Metode Pembayaran:</Text>
                  <Badge colorScheme="blue" variant="subtle" size="sm">
                    {item.metode_pembayaran}
                  </Badge>
                </HStack>

                {item.status_pembayaran && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="xs" color={subtextColor} fontWeight="medium">Status Pembayaran:</Text>
                    <Badge 
                      colorScheme={item.status_pembayaran === "Sudah Dibayar" ? "success" : "warning"}
                      variant="solid"
                      size="sm"
                    >
                      {item.status_pembayaran}
                    </Badge>
                  </HStack>
                )}

                {item.nomor_telepon && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="xs" color={subtextColor} fontWeight="medium">Telepon:</Text>
                    <Text fontSize="sm" color={textColor} fontWeight="medium">{item.nomor_telepon}</Text>
                  </HStack>
                )}

                {item.resep_required && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="xs" color={subtextColor} fontWeight="medium">Resep:</Text>
                    <Badge colorScheme={item.file_resep ? "success" : "warning"} size="sm" variant="solid">
                      {item.file_resep ? "Tersedia" : "Tidak ada"}
                    </Badge>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Barang Keluar specific details */}
            {!isPembelianObat && item.Kategori_Peminjaman?.toLowerCase() === "insidentil" && (
              <VStack space={2} p={3} bg="blue.50" rounded="lg">
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="xs" color={subtextColor} fontWeight="medium">Tanggal Pengembalian:</Text>
                  <Text fontSize="sm" color={textColor} fontWeight="medium">
                    {formatDate(item.Tanggal_PengembalianBarang)}
                  </Text>
                </HStack>
              </VStack>
            )}

            {/* Display rejection reason if item is rejected */}
            {(item.status === "Rejected" || item.status === "Ditolak") && item.alasan_penolakan && (
              <Box p={3} bg="red.50" rounded="lg" borderWidth={1} borderColor="red.200">
                <HStack space={2} alignItems="flex-start">
                  <Icon as={MaterialIcons} name="error-outline" color="red.600" size="sm" mt={0.5} />
                  <VStack flex={1} space={1}>
                    <Text fontSize="xs" color="red.700" fontWeight="bold">
                      Alasan Penolakan:
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      {item.alasan_penolakan}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Documents Section */}
            {(item.File_BeritaAcara || item.file_resep) && (
              <VStack space={2} p={3} bg="blue.50" rounded="lg">
                <Text fontSize="xs" color={subtextColor} fontWeight="bold">
                  Dokumen:
                </Text>
                <HStack space={2} flexWrap="wrap">
                  {item.File_BeritaAcara && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      leftIcon={<Icon as={MaterialIcons} name="description" size="sm" />}
                      onPress={() => handleDirectDownload(item.File_BeritaAcara, "Berita Acara")}
                    >
                      Berita Acara
                    </Button>
                  )}
                  {item.file_resep && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      leftIcon={<Icon as={MaterialIcons} name="local-hospital" size="sm" />}
                      onPress={() => handleDirectDownload(item.file_resep, "Resep")}
                    >
                      Resep
                    </Button>
                  )}
                </HStack>
              </VStack>
            )}
          </VStack>

          {/* Action Buttons */}
          <Divider />
          <HStack space={2} justifyContent="flex-end" flexWrap="wrap">
            {/* Pembelian Obat Actions */}
            {isPembelianObat && (
              <>
                {item.status === "Pending" && (
                  <>
                    <Button
                      size="sm"
                      colorScheme="success"
                      variant="solid"
                      leftIcon={<Icon as={MaterialIcons} name="check" size="sm" />}
                      onPress={() => handleApprovePembelianObat(item.id)}
                    >
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="error"
                      variant="outline"
                      leftIcon={<Icon as={MaterialIcons} name="close" size="sm" />}
                      onPress={() => {
                        setSelectedItemId(item.id);
                        setSelectedItemType("pembelian_obat");
                        setRejectionModalOpen(true);
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                {item.status === "Disetujui" && item.status_pembayaran !== "Sudah Dibayar" && (
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="solid"
                    leftIcon={<Icon as={MaterialIcons} name="payment" size="sm" />}
                    onPress={() => handleMarkAsPaid(item.id)}
                  >
                    Tandai Lunas
                  </Button>
                )}
              </>
            )}

            {/* Barang Keluar Actions */}
            {!isPembelianObat && (
              <>
                {item.status === "Pending" && (
                  <>
                    <Button
                      size="sm"
                      colorScheme="success"
                      variant="solid"
                      leftIcon={<Icon as={MaterialIcons} name="assignment" size="sm" />}
                      onPress={() => navigation.navigate("BeritaAcara", { id: item.id })}
                    >
                      Buat BA
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="error"
                      variant="outline"
                      leftIcon={<Icon as={MaterialIcons} name="close" size="sm" />}
                      onPress={() => {
                        setSelectedItemId(item.id);
                        setSelectedItemType("barang_keluar");
                        setRejectionModalOpen(true);
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
              </>
            )}
          </HStack>
        </VStack>
      </Box>
    );
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
   <Box flex={1} bg="coolGray.50">
  <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
  
  {/* Header */}
  <Header title="Kelola Permintaan" bg={primaryColor} color="white" />
  
  {/* Main Content */}
  <VStack flex={1} space={4}>
    {/* Search Bar */}
    <Box px={4} pt={3}>
      <Input
        placeholder="Cari permintaan..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        bg="white"
        borderRadius="lg"
        size="md"
        InputLeftElement={
          <Icon
            as={MaterialIcons}
            name="search"
            size="md"
            ml={3}
            color="coolGray.400"
          />
        }
        _focus={{
          borderColor: primaryColor,
          backgroundColor: "white",
        }}
      />
    </Box>

    {/* Filter Buttons */}
    <Box px={4} >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <HStack space={2} alignItems="center" pr={4}  >
          {/* Request Type Filters */}
          <FilterButton
            label="Semua"
            statusValue="all"
            iconName="filter-outline"
            isActive={filterType === "all" && filterStatus === "all"}
            onPress={(value) => {
              setFilterType("all");
              setFilterStatus("all");
            }}
            activeColor="emerald.600"
            inactiveColor="gray.200"
          />
         
          {/* Status Filters */}
          <FilterButton
            label="Pending"
            statusValue="pending"
            iconName="clock-outline"
            isActive={filterStatus === "pending"}
            onPress={(value) => {
              setFilterStatus(value);
              setFilterType("all");
            }}
            activeColor="emerald.600"
            inactiveColor="gray.200"
          />
          <FilterButton
            label="Disetujui"
            statusValue="approved"
            iconName="check-circle-outline"
            isActive={filterStatus === "approved"}
            onPress={(value) => {
              setFilterStatus(value);
              setFilterType("all");
            }}
            activeColor="emerald.600"
            inactiveColor="gray.200"
          />
          <FilterButton
            label="Ditolak"
            statusValue="rejected"
            iconName="close-circle-outline"
            isActive={filterStatus === "rejected"}
            onPress={(value) => {
              setFilterStatus(value);
              setFilterType("all");
            }}
            activeColor="emerald.600"
            inactiveColor="gray.200"
          />
          <FilterButton
            label="Selesai"
            statusValue="completed"
            iconName="check-all"
            isActive={filterStatus === "completed"}
            onPress={(value) => {
              setFilterStatus(value);
              setFilterType("all");
            }}
            activeColor="emerald.600"
            inactiveColor="gray.200"
          />
        </HStack>
      </ScrollView>
    </Box>

    {/* Request List */}
    <Box flex={1} px={4}>
      {filteredRequestList.length === 0 ? (
        <Center flex={1}>
          <VStack space={4} alignItems="center">
            <Icon
              as={MaterialIcons}
              name="inbox"
              size="6xl"
              color="coolGray.400"
            />
            <VStack space={2} alignItems="center" px={6}>
              <Text fontSize="lg" color="coolGray.600" fontWeight="medium">
                Memuat Permintaan
              </Text>
              <Text fontSize="sm" color="coolGray.500" textAlign="center">
                Belum ada permintaan yang sesuai dengan filter yang dipilih
              </Text>
            </VStack>
          </VStack>
        </Center>
      ) : (
        <FlatList
          data={filteredRequestList}
          keyExtractor={(item) => `${item.request_type}-${item.id}`}
          renderItem={({ item }) => <ItemCard item={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={fetchData}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
          contentContainerStyle={{ 
            paddingBottom: 24,
            flexGrow: 1 
          }}
          ItemSeparatorComponent={() => <Box h={3} />}
        />
      )}
    </Box>
  </VStack>

  {/* Rejection Modal */}
  <Modal
    isOpen={rejectionModalOpen}
    onClose={() => {
      setRejectionModalOpen(false);
      setRejectionReason("");
      setSelectedItemId(null);
      setSelectedItemType(null);
    }}
    size="lg"
  >
    <Modal.Content mx={6}>
      <Modal.CloseButton />
      <Modal.Header pb={2}>
        <HStack space={2} alignItems="center">
          <Icon as={MaterialIcons} name="error-outline" color="red.600" size="md" />
          <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
            Tolak Permintaan
          </Text>
        </HStack>
      </Modal.Header>
      <Modal.Body p={2}>
        <VStack space={5}>
          <Text fontSize="sm" color="coolGray.600">
            Berikan alasan penolakan untuk permintaan ini:
          </Text>
          <FormControl>
            <FormControl.Label mb={2}>
              <Text fontSize="sm" fontWeight="medium" color="coolGray.700">
                Alasan Penolakan
              </Text>
            </FormControl.Label>
            <TextArea
              placeholder="Masukkan alasan penolakan..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              h={20}
              borderRadius="md"
              _focus={{
                borderColor: "red.400",
                bg: "white"
              }}
              fontSize="sm"
            />
          </FormControl>
        </VStack>
      </Modal.Body>
      <Modal.Footer pt={2}>
        <Button.Group space={3} flex={1}>
          <Button
            flex={1}
            variant="ghost"
            colorScheme="blueGray"
            onPress={() => {
              setRejectionModalOpen(false);
              setRejectionReason("");
              setSelectedItemId(null);
              setSelectedItemType(null);
            }}
          >
            Batal
          </Button>
          <Button
            flex={1}
            colorScheme="error"
            onPress={handleRejectApplication}
            leftIcon={<Icon as={MaterialIcons} name="send" size="sm" />}
          >
            Kirim Penolakan
          </Button>
        </Button.Group>
      </Modal.Footer>
    </Modal.Content>
  </Modal>
</Box>
  );
};

export default AdminRequest;