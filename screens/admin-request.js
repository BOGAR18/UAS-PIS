import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Center,
  useColorModeValue,
  useToast,
  FlatList,
  Modal,
  FormControl,
  TextArea,
  Divider,
} from "native-base";
import {
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
  off,
} from "firebase/database";
import { RefreshControl } from "react-native";
import { Linking } from "react-native";
import Header from "../components/header";

// Constants
const REQUEST_TYPES = {
  BARANG_KELUAR: "barang_keluar",
  PEMBELIAN_OBAT: "pembelian_obat",
};

const STATUS_TYPES = {
  ALL: "all",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  PAID: "paid",
  UNPAID: "unpaid",
};

const FILTER_CONFIGS = [
  { label: "Semua", value: STATUS_TYPES.ALL, icon: "filter-outline", color: "emerald.600" },
  { label: "Pending", value: STATUS_TYPES.PENDING, icon: "clock-outline", color: "yellow.600" },
  { label: "Disetujui", value: STATUS_TYPES.APPROVED, icon: "check-circle-outline", color: "green.600" },
  { label: "Ditolak", value: STATUS_TYPES.REJECTED, icon: "close-circle-outline", color: "red.600" },
  { label: "Selesai", value: STATUS_TYPES.COMPLETED, icon: "check-all", color: "blue.600" },
];

// Filter Button Component
const FilterButton = ({ 
  label, 
  statusValue, 
  iconName, 
  isActive, 
  onPress, 
  activeColor = "blue.600", 
  inactiveColor = "white" 
}) => (
  <Pressable
    onPress={() => onPress(statusValue)}
    bg={isActive ? activeColor : inactiveColor}
    px={4}
    py={2}
    rounded="full"
    shadow={isActive ? 3 : 1}
    borderWidth={1}
    borderColor={isActive ? activeColor : "coolGray.200"}
    _pressed={{ opacity: 0.8 }}
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

// Custom hooks
const useRequestData = () => {
  const [requestList, setRequestList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const database = getDatabase();
      const barangKeluarRef = ref(database, "Barang_Keluar");
      const pembelianObatRef = ref(database, "pembelian_obat");

      let barangKeluarData = [];
      let pembelianObatData = [];

      // Create promise-based listeners
      const barangKeluarPromise = new Promise((resolve) => {
        const unsubscribe = onValue(barangKeluarRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            barangKeluarData = Object.keys(data).map((key) => {
              const items = data[key].barang 
                ? Array.isArray(data[key].barang) 
                  ? data[key].barang 
                  : Object.values(data[key].barang)
                : [];

              return {
                id: key,
                ...data[key],
                items,
                total_barang: items.length,
                request_type: REQUEST_TYPES.BARANG_KELUAR,
                title: data[key].Nama_PihakPeminjam || "Tidak ada nama",
                subtitle: data[key].Kategori_Peminjaman || "Kategori tidak ada",
                date: data[key].tanggal_peminjamanbarang,
              };
            });
          }
          resolve(unsubscribe);
        });
      });

      const pembelianObatPromise = new Promise((resolve) => {
        const unsubscribe = onValue(pembelianObatRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            pembelianObatData = Object.keys(data).map((key) => {
              const items = data[key].obat_items
                ? Array.isArray(data[key].obat_items)
                  ? data[key].obat_items
                  : Object.values(data[key].obat_items)
                : [];

              return {
                id: key,
                ...data[key],
                items,
                total_barang: data[key].total_item || items.length,
                request_type: REQUEST_TYPES.PEMBELIAN_OBAT,
                title: data[key].nama_customer || "Tidak ada nama",
                subtitle: `${data[key].metode_pembayaran || "Metode tidak ada"} - Rp ${Number(data[key].total_harga || 0).toLocaleString('id-ID')}`,
                date: data[key].tanggal_pembelian || data[key].tanggal_disetujui,
              };
            });
          }
          resolve(unsubscribe);
        });
      });

      // Wait for both promises and combine data
      await Promise.all([barangKeluarPromise, pembelianObatPromise]);
      
      const combinedData = [...barangKeluarData, ...pembelianObatData]
        .sort((a, b) => {
          const dateA = moment(a.createdAt || a.date);
          const dateB = moment(b.createdAt || b.date);
          return dateB.valueOf() - dateA.valueOf();
        });

      setRequestList(combinedData);
    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.message);
      toast.show({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { requestList, isLoading, error, fetchData };
};

const useFilteredData = (requestList, searchQuery, filterStatus, filterType) => {
  return useMemo(() => {
    let filtered = [...requestList];

    // Filter by request type
    if (filterType !== STATUS_TYPES.ALL) {
      filtered = filtered.filter(item => item.request_type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchFields = [
          item.title,
          item.subtitle,
          item.No_SuratJalanBK,
          item.kode_obat,
          item.invoice_number,
        ].filter(Boolean);

        const itemMatches = searchFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );

        const itemsMatch = item.items?.some(barang => {
          const itemFields = [
            barang.nama_barang,
            barang.nama_obat,
            barang.nama,
            barang.kode_barang,
            barang.kode_obat,
          ].filter(Boolean);

          return itemFields.some(field => 
            field.toLowerCase().includes(searchLower)
          );
        });

        return itemMatches || itemsMatch;
      });
    }

    // Filter by status
    if (filterStatus !== STATUS_TYPES.ALL) {
      filtered = filtered.filter(item => {
        switch (filterStatus) {
          case STATUS_TYPES.PENDING:
            return item.status === "Pending";
          case STATUS_TYPES.APPROVED:
            return ["Accepted", "Approved", "Disetujui"].includes(item.status);
          case STATUS_TYPES.REJECTED:
            return ["Rejected", "Ditolak"].includes(item.status);
          case STATUS_TYPES.COMPLETED:
            return ["Dikembalikan", "Selesai", "Completed"].includes(item.status);
          case STATUS_TYPES.PAID:
            return item.status_pembayaran === "Sudah Dibayar";
          case STATUS_TYPES.UNPAID:
            return item.status_pembayaran === "Belum Dibayar";
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [requestList, searchQuery, filterStatus, filterType]);
};

// Status Badge Component
const StatusBadge = ({ item }) => {
  const isPembelianObat = item.request_type === REQUEST_TYPES.PEMBELIAN_OBAT;

  const getBadgeProps = () => {
    if (isPembelianObat) {
      switch (item.status) {
        case "Pending":
          return { colorScheme: "warning", text: "Menunggu Verifikasi" };
        case "Disetujui":
        case "Approved":
          return item.status_pembayaran === "Sudah Dibayar"
            ? { colorScheme: "success", text: "Lunas" }
            : { colorScheme: "info", text: "Disetujui" };
        case "Ditolak":
        case "Rejected":
          return { colorScheme: "error", text: "Ditolak" };
        case "Selesai":
        case "Completed":
          return { colorScheme: "success", text: "Selesai" };
        default:
          return { colorScheme: "gray", text: "Unknown" };
      }
    } else {
      // Barang Keluar logic
      switch (item.status) {
        case "Rejected":
          return { colorScheme: "error", text: "Ditolak" };
        case "Accepted":
          if (item.Tanggal_PengembalianBarang) {
            const remainingTime = getRemainingTime(
              item.tanggal_peminjamanbarang,
              item.Tanggal_PengembalianBarang
            );
            return remainingTime === "Expired"
              ? { colorScheme: "danger", text: "Expired" }
              : { colorScheme: "warning", text: remainingTime };
          }
          return { colorScheme: "success", text: "Accepted" };
        case "Dikembalikan":
          return { colorScheme: "info", text: "Dikembalikan" };
        default:
          return { colorScheme: "warning", text: "Pending" };
      }
    }
  };

  const { colorScheme, text } = getBadgeProps();

  return (
    <Badge colorScheme={colorScheme} rounded="full" variant="solid">
      {text}
    </Badge>
  );
};

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return "Tidak ada tanggal";
  return moment(dateString).format("DD MMMM YYYY");
};

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

const handleDirectDownload = async (fileUrl, type, toast) => {
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

// Item Details List Component
const ItemDetailsList = ({ items, isPembelianObat }) => {
  const subtextColor = useColorModeValue("gray.600", "gray.400");
  const textColor = useColorModeValue("gray.800", "gray.100");

  if (!items || items.length === 0) {
    return (
      <Box p={3} bg="coolGray.50" rounded="lg" mt={3}>
        <Text fontSize="sm" color={subtextColor} textAlign="center">
          Tidak ada detail item
        </Text>
      </Box>
    );
  }

  return (
    <VStack space={2} mt={3}>
      <HStack justifyContent="space-between" alignItems="center" mb={2}>
        <Text fontSize="sm" fontWeight="bold" color={subtextColor}>
          Detail {isPembelianObat ? "Obat" : "Barang"}:
        </Text>
        <Text fontSize="xs" color={subtextColor}>
          {items.length} item
        </Text>
      </HStack>
      {items.map((item, index) => (
        <Box 
          key={`${item.kode_obat || item.kode_barang || index}`}
          bg="coolGray.50" 
          p={3} 
          rounded="lg" 
          borderWidth={1} 
          borderColor="coolGray.200"
        >
          <VStack space={2}>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack flex={1} mr={2}>
                <Text fontSize="sm" fontWeight="bold" color={textColor} numberOfLines={2}>
                  {item.nama || item.nama_obat || item.nama_barang || "Nama tidak tersedia"}
                </Text>
                <Text fontSize="xs" color={subtextColor}>
                  {item.kode_obat || item.kode_barang || "Kode tidak tersedia"}
                </Text>
              </VStack>
              <Badge colorScheme="blue" variant="subtle" size="sm">
                {item.kategori || item.jenis || "Umum"}
              </Badge>
            </HStack>
            
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={4}>
                <VStack>
                  <Text fontSize="xs" color={subtextColor}>Jumlah</Text>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    {item.jumlah || item.jumlah_barang || 0} {item.satuan || "unit"}
                  </Text>
                </VStack>
                
                {isPembelianObat && item.harga && (
                  <VStack>
                    <Text fontSize="xs" color={subtextColor}>Harga</Text>
                    <Text fontSize="sm" fontWeight="medium" color={textColor}>
                      Rp {Number(item.harga || 0).toLocaleString('id-ID')}
                    </Text>
                  </VStack>
                )}
              </HStack>
              
              {isPembelianObat && item.subtotal && (
                <VStack alignItems="flex-end">
                  <Text fontSize="xs" color={subtextColor}>Subtotal</Text>
                  <Text fontSize="sm" fontWeight="bold" color="emerald.600">
                    Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                  </Text>
                </VStack>
              )}
            </HStack>

            {isPembelianObat && (
              <HStack space={4} mt={1}>
                {item.batch_info?.[0]?.batch_obat && (
                  <Text fontSize="xs" color={subtextColor}>
                    Batch: {item.batch_info[0].batch_obat}
                  </Text>
                )}
                {item.tanggal_kadaluarsa && (
                  <Text fontSize="xs" color={subtextColor}>
                    Exp: {formatDate(item.tanggal_kadaluarsa)}
                  </Text>
                )}
              </HStack>
            )}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

// Main Component
const AdminRequest = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState(STATUS_TYPES.ALL);
  const [filterType, setFilterType] = useState(STATUS_TYPES.ALL);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  
  // Rejection modal states
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);

  const toast = useToast();
  const { requestList, isLoading, fetchData } = useRequestData();
  const filteredRequestList = useFilteredData(requestList, searchQuery, filterStatus, filterType);

  // Color and styling
  const primaryColor = "white";
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const subtextColor = useColorModeValue("gray.600", "gray.400");

  // Set moment locale to Indonesian
  moment.locale("id");

  // Handlers
  const toggleItemExpansion = useCallback((itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  const handleApprovePembelianObat = useCallback(async (id) => {
    try {
      const database = getDatabase();
      const approveRef = ref(database, `pembelian_obat/${id}`);
      
      const invoiceNumber = `INV-${moment().format('YYYYMMDD')}-${id.slice(-6).toUpperCase()}`;
      
      await update(approveRef, {
        status: "Disetujui",
        tanggal_disetujui: moment().format("YYYY-MM-DD HH:mm:ss"),
        invoice_number: invoiceNumber,
        invoice_generated: true,
        invoice_date: moment().toISOString(),
      });

      toast.show({
        title: "Sukses",
        description: "Pembelian obat berhasil disetujui",
        status: "success",
      });

      setTimeout(() => {
        navigation.navigate("Invoice", { 
          pembelianId: id,
          invoiceNumber 
        });
      }, 1000);

    } catch (error) {
      console.error("Error approving pembelian obat:", error);
      toast.show({
        title: "Error",
        description: "Gagal menyetujui pembelian obat",
        status: "error",
      });
    }
  }, [navigation, toast]);

  const handleMarkAsPaid = useCallback(async (id) => {
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

    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.show({
        title: "Error",
        description: "Gagal memperbarui status pembayaran",
        status: "error",
      });
    }
  }, [toast]);

  const handleRejectApplication = useCallback(async () => {
    if (!selectedItemId || !rejectionReason.trim()) {
      toast.show({
        title: "Error",
        description: "Alasan penolakan harus diisi",
        status: "error",
      });
      return;
    }

    try {
      const database = getDatabase();
      const tableName = selectedItemType === REQUEST_TYPES.PEMBELIAN_OBAT ? "pembelian_obat" : "Barang_Keluar";
      const rejectRef = ref(database, `${tableName}/${selectedItemId}`);

      const updateData = selectedItemType === REQUEST_TYPES.PEMBELIAN_OBAT ? {
        status: "Ditolak",
        alasan_penolakan: rejectionReason,
        tanggal_penolakan: moment().format("YYYY-MM-DD HH:mm:ss"),
      } : {
        status: "Rejected",
        alasan_penolakan: rejectionReason,
        tanggal_penolakan: moment().format("YYYY-MM-DD HH:mm:ss"),
      };

      await update(rejectRef, updateData);

      toast.show({
        title: "Sukses",
        description: "Permintaan berhasil ditolak",
        status: "success",
      });

      // Reset modal state
      setRejectionModalOpen(false);
      setRejectionReason("");
      setSelectedItemId(null);
      setSelectedItemType(null);

    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.show({
        title: "Error",
        description: "Gagal menolak permintaan",
        status: "error",
      });
    }
  }, [selectedItemId, selectedItemType, rejectionReason, toast]);

  const handleViewInvoice = useCallback((item) => {
    if (!item.invoice_number) {
      toast.show({
        title: "Info",
        description: "Invoice belum tersedia",
        status: "info",
      });
      return;
    }

    navigation.navigate("Invoice", { 
      pembelianId: item.id,
      invoiceNumber: item.invoice_number 
    });
  }, [navigation, toast]);

  const openRejectionModal = useCallback((itemId, itemType) => {
    setSelectedItemId(itemId);
    setSelectedItemType(itemType);
    setRejectionModalOpen(true);
  }, []);

  const closeRejectionModal = useCallback(() => {
    setRejectionModalOpen(false);
    setRejectionReason("");
    setSelectedItemId(null);
    setSelectedItemType(null);
  }, []);

  // Item Card Component
  const ItemCard = useCallback(({ item }) => {
    const itemCount = item.items?.length || 0;
    const isPembelianObat = item.request_type === REQUEST_TYPES.PEMBELIAN_OBAT;
    const isExpanded = expandedItems[item.id] || false;

    return (
      <Box
        bg={cardBg}
        rounded="xl"
        shadow={3}
        mb={4}
        overflow="hidden"
        borderWidth={1}
        borderColor="coolGray.200"
      >
        {/* Request Type Indicator */}
        <Box bg={isPembelianObat ? "emerald.500" : "blue.500"} px={4} py={2}>
          <HStack space={2} alignItems="center" justifyContent="space-between">
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
            {isPembelianObat && item.invoice_number && (
              <Badge colorScheme="yellow" variant="solid" rounded="md">
                {item.invoice_number}
              </Badge>
            )}
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
            <StatusBadge item={item} />
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
                    as={MaterialIcons}
                    name={isPembelianObat ? "medical-services" : "cube"}
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

                {item.invoice_generated && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="xs" color={subtextColor} fontWeight="medium">Invoice:</Text>
                    <HStack space={2} alignItems="center">
                      <Icon as={MaterialIcons} name="receipt" color="emerald.600" size="sm" />
                      <Text fontSize="sm" color="emerald.600" fontWeight="bold">
                        Tersedia
                      </Text>
                    </HStack>
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

            {/* Expandable Item Details Section */}
            {itemCount > 0 && (
              <Pressable onPress={() => toggleItemExpansion(item.id)}>
                <Box 
                  p={3} 
                  bg="blue.50" 
                  rounded="lg" 
                  borderWidth={1} 
                  borderColor="blue.200"
                  _pressed={{ bg: "blue.100" }}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <HStack space={2} alignItems="center">
                      <Icon 
                        as={MaterialIcons} 
                        name="list-alt" 
                        color="blue.600" 
                        size="sm" 
                      />
                      <Text fontSize="sm" color="blue.700" fontWeight="medium">
                        Lihat Detail {isPembelianObat ? "Obat" : "Barang"} ({itemCount})
                      </Text>
                    </HStack>
                    <Icon
                      as={MaterialIcons}
                      name={isExpanded ? "expand-less" : "expand-more"}
                      color="blue.600"
                      size="md"
                    />
                  </HStack>
                </Box>
              </Pressable>
            )}

            {/* Expanded Item Details */}
            {isExpanded && (
              <ItemDetailsList items={item.items} isPembelianObat={isPembelianObat} />
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
                      onPress={() => handleDirectDownload(item.File_BeritaAcara, "Berita Acara", toast)}
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
                      onPress={() => handleDirectDownload(item.file_resep, "Resep", toast)}
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
                      onPress={() => openRejectionModal(item.id, REQUEST_TYPES.PEMBELIAN_OBAT)}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                {(item.status === "Disetujui" || item.status === "Approved") && item.invoice_generated && (
                  <Button
                    size="sm"
                    colorScheme="purple"
                    variant="solid"
                    leftIcon={<Icon as={MaterialIcons} name="receipt" size="sm" />}
                    onPress={() => handleViewInvoice(item)}
                  >
                    Lihat Invoice
                  </Button>
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
                {item.status === "Selesai" && item.invoice_generated && (
                  <Button
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                    leftIcon={<Icon as={MaterialIcons} name="print" size="sm" />}
                    onPress={() => handleViewInvoice(item)}
                  >
                    Print Invoice
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
                      onPress={() => openRejectionModal(item.id, REQUEST_TYPES.BARANG_KELUAR)}
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
  }, [
    cardBg, textColor, subtextColor, expandedItems, toggleItemExpansion,
    handleApprovePembelianObat, handleViewInvoice, handleMarkAsPaid,
    openRejectionModal, navigation, toast
  ]);

  const renderItem = useCallback(({ item }) => (
    <ItemCard item={item} />
  ), [ItemCard]);

  const keyExtractor = useCallback((item) => 
    `${item.request_type}-${item.id}`, []
  );

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Empty state component
  const EmptyState = () => (
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
            {isLoading ? "Memuat Permintaan..." : "Tidak Ada Permintaan"}
          </Text>
          <Text fontSize="sm" color="coolGray.500" textAlign="center">
            {isLoading 
              ? "Mohon tunggu sebentar..." 
              : "Belum ada permintaan yang sesuai dengan filter yang dipilih"
            }
          </Text>
        </VStack>
      </VStack>
    </Center>
  );

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {/* Header */}
      <Header title="Permintaan Obat" bg={primaryColor} color="white" />
      
      {/* Main Content */}
      <VStack flex={1} space={4}>
        {/* Search Bar */}
        {/* <Box px={4} pt={3}>
          <Input
            placeholder="Cari permintaan atau invoice..."
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
        </Box> */}

        {/* Filter Buttons */}
        {/* <Box px={4}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space={2} alignItems="center" pr={4}>
              {FILTER_CONFIGS.map((filter) => (
                <FilterButton
                  key={filter.value}
                  label={filter.label}
                  statusValue={filter.value}
                  iconName={filter.icon}
                  isActive={
                    filter.value === STATUS_TYPES.ALL 
                      ? filterType === STATUS_TYPES.ALL && filterStatus === STATUS_TYPES.ALL
                      : filterStatus === filter.value
                  }
                  onPress={(value) => {
                    if (value === STATUS_TYPES.ALL) {
                      setFilterStatus(STATUS_TYPES.ALL);
                      setFilterType(STATUS_TYPES.ALL);
                    } else {
                      setFilterStatus(value);
                      setFilterType(STATUS_TYPES.ALL);
                    }
                  }}
                  activeColor={filter.color}
                  inactiveColor="gray.200"
                />
              ))}
            </HStack>
          </ScrollView>
        </Box> */}

        {/* Request List */}
        <Box flex={1} px={4}mt={4}>
          {isLoading || filteredRequestList.length === 0 ? (
            <EmptyState />
          ) : (
            <FlatList
              data={filteredRequestList}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={primaryColor}
                  colors={[primaryColor]}
                />
              }
              contentContainerStyle={{ 
                paddingBottom: 24,
                flexGrow: 1 
              }}
              ItemSeparatorComponent={() => <Box h={3} />}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={5}
              getItemLayout={(data, index) => ({
                length: 300, // Approximate item height
                offset: 300 * index,
                index,
              })}
            />
          )}
        </Box>
      </VStack>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectionModalOpen}
        onClose={closeRejectionModal}
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
                onPress={closeRejectionModal}
              >
                Batal
              </Button>
              <Button
                flex={1}
                colorScheme="error"
                onPress={handleRejectApplication}
                leftIcon={<Icon as={MaterialIcons} name="send" size="sm" />}
                isDisabled={!rejectionReason.trim()}
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