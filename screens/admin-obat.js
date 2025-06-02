import React, { useState, useEffect } from "react";
import { RefreshControl } from "react-native";
import {
  Box,
  Button,
  Text,
  VStack,
  Input,
  FormControl,
  HStack,
  Modal,
  IconButton,
  Icon,
  Center,
  Heading,
  Badge,
  FlatList,
  Spinner,
  Divider,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import FIREBASE from "../actions/config/FIREBASE";
import Header from "../components/header";
import { getData } from "../utils";
import moment from "moment";

const AdminObat = ({ navigation }) => {
  const [obatData, setObatData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedObat, setSelectedObat] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchObatData();
  }, []);

  useEffect(() => {
    filterObatData();
  }, [searchText, obatData]);

  const fetchObatData = async () => {
    try {
      setLoading(true);
      const obatRef = FIREBASE.database().ref("obat");
      const snapshot = await obatRef.once("value");
      const data = snapshot.val();

      if (data) {
        const obatArray = Object.values(data).map(item => {
          let status = item.status || "Aktif";
          
          if (item.jumlah_obat <= 0) {
            status = "Habis";
          } else if (item.tanggal_kadaluarsa && moment(item.tanggal_kadaluarsa).isBefore(moment())) {
            status = "Kadaluarsa";
          }

          return {
            ...item,
            status: status,
            isExpiringSoon: item.tanggal_kadaluarsa && moment(item.tanggal_kadaluarsa).diff(moment(), 'days') <= 30,
            isLowStock: item.jumlah_obat <= 10
          };
        });

        obatArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setObatData(obatArray);
      } else {
        setObatData([]);
      }
    } catch (error) {
      console.error("Error fetching obat data:", error);
      showModal("Terjadi kesalahan saat mengambil data obat.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchObatData().then(() => setRefreshing(false));
  }, []);

  const filterObatData = () => {
    let filtered = [...obatData];

    if (searchText) {
      filtered = filtered.filter(item => 
        item.nama_obat?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.kode_obat?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.pemasok?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredData(filtered);
  };

  const deleteObat = async (obatId) => {
    try {
      await FIREBASE.database().ref(`obat/${obatId}`).remove();
      showModal("Data obat berhasil dihapus.");
      fetchObatData();
    } catch (error) {
      console.error("Error deleting obat:", error);
      showModal("Terjadi kesalahan saat menghapus data obat.");
    }
  };

  const showModal = (message) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const showDeleteConfirmation = (obat) => {
    setSelectedObat(obat);
    setDeleteModalVisible(true);
  };

  const showDetailModal = (obat) => {
    setSelectedObat(obat);
    setDetailModalVisible(true);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Aktif": return "success";
      case "Habis": return "danger";
      case "Kadaluarsa": return "warning";
      case "Non-Aktif": return "gray";
      default: return "info";
    }
  };

  const renderObatCard = ({ item }) => (
    <Box bg="white" borderRadius="xl" shadow={2} p={4} mb={3}>
      <VStack space={3}>
        {/* Header */}
        <HStack justifyContent="space-between" alignItems="flex-start">
          <VStack flex={1} space={1}>
            <Heading size="sm" numberOfLines={2}>
              {item.nama_obat}
            </Heading>
            <Text fontSize="xs" color="gray.500">
              {item.kode_obat}
            </Text>
            <Badge 
              variant="subtle" 
              colorScheme={getStatusBadgeColor(item.status)}
              alignSelf="flex-start"
              size="sm"
            >
              {item.status}
            </Badge>
          </VStack>
          
          <HStack space={1}>
            <IconButton
              icon={<Icon as={MaterialIcons} name="visibility" color="blue.500" size="sm" />}
              onPress={() => showDetailModal(item)}
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={<Icon as={MaterialIcons} name="edit" color="orange.500" size="sm" />}
              onPress={() => navigation.navigate("AdminEditObat", { obatData: item })}
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={<Icon as={MaterialIcons} name="delete" color="red.500" size="sm" />}
              onPress={() => showDeleteConfirmation(item)}
              variant="ghost"
              size="sm"
            />
          </HStack>
        </HStack>

        <Divider />

        {/* Info */}
        <VStack space={2}>
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.600">Stok:</Text>
            <Text 
              fontSize="sm" 
              fontWeight="bold"
              color={item.isLowStock ? "red.500" : "green.500"}
            >
              {item.jumlah_obat} pcs
            </Text>
          </HStack>
          
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.600">Harga:</Text>
            <Text fontSize="sm" fontWeight="medium">
              Rp {Number(item.harga_satuan || 0).toLocaleString('id-ID')}
            </Text>
          </HStack>
          
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.600">Expired:</Text>
            <Text 
              fontSize="sm" 
              fontWeight="medium"
              color={item.isExpiringSoon ? "orange.500" : "gray.700"}
            >
              {moment(item.tanggal_kadaluarsa).format('DD/MM/YYYY')}
            </Text>
          </HStack>
        </VStack>

        {/* Warning Badges */}
        {(item.isLowStock || item.isExpiringSoon) && (
          <HStack space={2}>
            {item.isLowStock && (
              <Badge colorScheme="red" variant="outline" size="sm">
                Stok Rendah
              </Badge>
            )}
            {item.isExpiringSoon && (
              <Badge colorScheme="orange" variant="outline" size="sm">
                Segera Expired
              </Badge>
            )}
          </HStack>
        )}
      </VStack>
    </Box>
  );

  return (
    <>
      <Header title={"Data Obat"} />
      
      <VStack flex={1} bg="gray.50">
        {/* Search Section */}
        <Box bg="white" p={4} shadow={1}>
          <VStack space={3}>
            <HStack space={3} alignItems="center">
              <FormControl flex={1}>
                <Input
                  placeholder="Cari obat..."
                  value={searchText}
                  onChangeText={setSearchText}
                  borderRadius="lg"
                  bg="gray.50"
                  InputLeftElement={
                    <Icon as={MaterialIcons} name="search" size={5} ml={3} color="gray.400" />
                  }
                  InputRightElement={
                    searchText ? (
                      <IconButton
                        icon={<Icon as={MaterialIcons} name="clear" size={4} />}
                        onPress={() => setSearchText("")}
                        variant="ghost"
                        size="sm"
                      />
                    ) : null
                  }
                />
              </FormControl>
              
              <Button
                size="sm"
                icon={<Icon color="white" as={MaterialIcons} name="add" size="sm" />}
                onPress={() => navigation.navigate("AdminTambahObat")}
                bg="green.500"
                borderRadius="lg"
              >
                + Tambah
              </Button>
            </HStack>

            {/* Statistics */}
            <HStack justifyContent="space-around" bg="emerald.100" p={3} borderRadius="lg" rounded={10}>
              <VStack alignItems="center">
                <Text fontSize="lg" fontWeight="bold" color="blue.500">
                  {obatData.length}
                </Text>
                <Text fontSize="xs" color="gray.600">Total</Text>
              </VStack>
              <VStack alignItems="center">
                <Text fontSize="lg" fontWeight="bold" color="green.500">
                  {obatData.filter(item => item.status === "Aktif").length}
                </Text>
                <Text fontSize="xs" color="gray.600">Aktif</Text>
              </VStack>
              <VStack alignItems="center">
                <Text fontSize="lg" fontWeight="bold" color="orange.500">
                  {obatData.filter(item => item.isExpiringSoon).length}
                </Text>
                <Text fontSize="xs" color="gray.600">Expired</Text>
              </VStack>
              <VStack alignItems="center">
                <Text fontSize="lg" fontWeight="bold" color="red.500">
                  {obatData.filter(item => item.isLowStock).length}
                </Text>
                <Text fontSize="xs" color="gray.600">Rendah</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* Data List */}
        <Box flex={1} px={4} pt={4}>
          {loading ? (
            <Center flex={1}>
              <Spinner size="lg" />
              <Text mt={2}>Memuat data...</Text>
            </Center>
          ) : filteredData.length === 0 ? (
            <Center flex={1}>
              <Icon as={MaterialIcons} name="medical-services" size={16} color="gray.300" />
              <Text mt={4} color="gray.500" textAlign="center">
                {searchText ? "Tidak ditemukan" : "Belum ada data obat"}
              </Text>
            </Center>
          ) : (
            <FlatList
              data={filteredData}
              renderItem={renderObatCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </Box>
      </VStack>

      {/* Detail Modal */}
      <Modal isOpen={detailModalVisible} onClose={() => setDetailModalVisible(false)} size="lg">
        <Modal.Content borderRadius="xl" mx={4}>
          <Modal.CloseButton />
          <Modal.Header bgColor={"emerald.200"}>Detail Obat</Modal.Header>
          <Modal.Body>
            {selectedObat && (
              <VStack space={4}>
                <Box bg="gray.50" p={4} borderRadius="lg">
                  <Heading size="md" mb={2}>{selectedObat.nama_obat}</Heading>
                  <Text color="gray.600" mb={2}>{selectedObat.kode_obat}</Text>
                  <Badge 
                    variant="subtle" 
                    colorScheme={getStatusBadgeColor(selectedObat.status)}
                    alignSelf="flex-start"
                  >
                    {selectedObat.status}
                  </Badge>
                </Box>

                <VStack space={3}>
                  <HStack justifyContent="space-between">
                    <Text fontWeight="medium">Kategori:</Text>
                    <Text>{selectedObat.kategori_obat}</Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontWeight="medium">Stok:</Text>
                    <Text fontWeight="bold" color={selectedObat.isLowStock ? "red.500" : "green.500"}>
                      {selectedObat.jumlah_obat} pcs
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontWeight="medium">Harga:</Text>
                    <Text>Rp {Number(selectedObat.harga_satuan || 0).toLocaleString('id-ID')}</Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontWeight="medium">Expired:</Text>
                    <Text color={selectedObat.isExpiringSoon ? "orange.500" : "gray.700"}>
                      {moment(selectedObat.tanggal_kadaluarsa).format('DD/MM/YYYY')}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontWeight="medium">Pemasok:</Text>
                    <Text flex={1} textAlign="right">{selectedObat.pemasok}</Text>
                  </HStack>
                  {selectedObat.keterangan && (
                    <VStack>
                      <Text fontWeight="medium">Keterangan:</Text>
                      <Text bg="gray.50" p={3} borderRadius="lg">{selectedObat.keterangan}</Text>
                    </VStack>
                  )}
                </VStack>
              </VStack>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}>
        <Modal.Content borderRadius="xl">
          <Modal.CloseButton />
          <Modal.Header>Konfirmasi Hapus</Modal.Header>
          <Modal.Body>
            <VStack space={3}>
              <Text>Yakin ingin menghapus obat "{selectedObat?.nama_obat}"?</Text>
              <Box bg="red.50" p={3} borderRadius="lg">
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="warning" color="red.500" />
                  <Text fontSize="sm" color="red.700">
                    Data tidak dapat dikembalikan
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button
              colorScheme="black"
                variant="ghost"
                onPress={() => setDeleteModalVisible(false)}
              >
                Batal
              </Button>
              <Button
                colorScheme="red"
                onPress={() => {
                  deleteObat(selectedObat.id);
                  setDeleteModalVisible(false);
                }}
              >
                Hapus
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Info Modal */}
      <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
        <Modal.Content borderRadius="xl">
          <Modal.CloseButton />
          <Modal.Header>Informasi</Modal.Header>
          <Modal.Body>
            <Text>{modalMessage}</Text>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onPress={() => setModalVisible(false)}
              colorScheme="green"
            >
              OK
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default AdminObat;