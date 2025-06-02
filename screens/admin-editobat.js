import React, { useState, useEffect } from "react";
import { ScrollView, Alert } from "react-native";
import {
  Box,
  Button,
  Text,
  VStack,
  Input,
  Select,
  FormControl,
  HStack,
  Modal,
  Icon,
  Center,
  Heading,
  TextArea,
  Spinner,
  Divider,
  Badge,
  CheckIcon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import FIREBASE from "../actions/config/FIREBASE";
import Header from "../components/header";
import { getData } from "../utils";
import moment from "moment";

const AdminEditObat = ({ navigation, route }) => {
  const { obatData } = route.params;
  
  // Form states
  const [formData, setFormData] = useState({
    nama_obat: "",
    kode_obat: "",
    jenis_obat: "",
    kategori_obat: "",
    jumlah_obat: "",
    stok_awal: "",
    harga_satuan: "",
    tanggal_beli: "",
    tanggal_kadaluarsa: "",
    pemasok: "",
    keterangan: "",
    status: "Aktif"
  });

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [user, setUser] = useState(null);

  // Options
  const jenisObatOptions = [
    "Tablet",
    "Kapsul",
    "Sirup",
    "Salep",
    "Gel"
  ];

  const kategoriOptions = [
   "Obat Bebas",
    "Obat Keras",
    "Obat Narkotika",
    "Suplemen",
    "Vitamin",
  ];

  const statusOptions = [
    "Aktif",
    "Non-Aktif",
    "Habis",
    "Kadaluarsa"
  ];

  useEffect(() => {
    getUserData();
    initializeFormData();
  }, []);

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
    }
  };

  const initializeFormData = () => {
    if (obatData) {
      setFormData({
        nama_obat: obatData.nama_obat || "",
        kode_obat: obatData.kode_obat || "",
        jenis_obat: obatData.jenis_obat || "",
        kategori_obat: obatData.kategori_obat || "",
        jumlah_obat: obatData.jumlah_obat?.toString() || "",
        stok_awal: obatData.stok_awal?.toString() || "",
        harga_satuan: obatData.harga_satuan?.toString() || "",
        tanggal_beli: obatData.tanggal_beli ? moment(obatData.tanggal_beli).format('YYYY-MM-DD') : "",
        tanggal_kadaluarsa: obatData.tanggal_kadaluarsa ? moment(obatData.tanggal_kadaluarsa).format('YYYY-MM-DD') : "",
        pemasok: obatData.pemasok || "",
        keterangan: obatData.keterangan || "",
        status: obatData.status || "Aktif"
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = [
      'nama_obat',  'jenis_obat', 'kategori_obat', 
      'jumlah_obat', 'harga_satuan', 'tanggal_beli', 'tanggal_kadaluarsa', 'pemasok'
    ];

    for (let field of required) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        return `${getFieldLabel(field)} harus diisi`;
      }
    }

    // Validate numbers
    if (isNaN(formData.jumlah_obat) || parseInt(formData.jumlah_obat) < 0) {
      return "Jumlah obat harus berupa angka positif";
    }

    if (isNaN(formData.harga_satuan) || parseInt(formData.harga_satuan) < 0) {
      return "Harga satuan harus berupa angka positif";
    }

    if (formData.stok_awal && (isNaN(formData.stok_awal) || parseInt(formData.stok_awal) < 0)) {
      return "Stok awal harus berupa angka positif";
    }

    // Validate dates
    if (moment(formData.tanggal_kadaluarsa).isBefore(moment(formData.tanggal_beli))) {
      return "Tanggal kadaluarsa tidak boleh lebih awal dari tanggal beli";
    }

    return null;
  };

  const getFieldLabel = (field) => {
    const labels = {
      nama_obat: "Nama obat",
      kode_obat: "Kode obat",
      jenis_obat: "Jenis obat",
      kategori_obat: "Kategori obat",
      jumlah_obat: "Jumlah obat",
      harga_satuan: "Harga satuan",
      tanggal_beli: "Tanggal beli",
      tanggal_kadaluarsa: "Tanggal kadaluarsa",
      pemasok: "Pemasok"
    };
    return labels[field] || field;
  };

  const updateObat = async () => {
    const validationError = validateForm();
    if (validationError) {
      showModal(validationError);
      return;
    }

    try {
      setLoading(true);

      const updatedData = {
        ...formData,
        jumlah_obat: parseInt(formData.jumlah_obat),
        stok_awal: formData.stok_awal ? parseInt(formData.stok_awal) : 0,
        harga_satuan: parseInt(formData.harga_satuan),
        tanggal_beli: formData.tanggal_beli,
        tanggal_kadaluarsa: formData.tanggal_kadaluarsa,
        updatedAt: moment().format(),
        updatedBy: user?.nama || "Admin"
      };

      // Auto-update status based on stock and expiry
      if (updatedData.jumlah_obat <= 0) {
        updatedData.status = "Habis";
      } else if (moment(updatedData.tanggal_kadaluarsa).isBefore(moment())) {
        updatedData.status = "Kadaluarsa";
      } else if (formData.status === "Habis" || formData.status === "Kadaluarsa") {
        updatedData.status = "Aktif"; // Reset to active if stock is available and not expired
      }

      await FIREBASE.database().ref(`obat/${obatData.id}`).update(updatedData);

      showModal("Data obat berhasil diperbarui!", () => {
        navigation.goBack();
      });

    } catch (error) {
      console.error("Error updating obat:", error);
      showModal("Terjadi kesalahan saat memperbarui data obat.");
    } finally {
      setLoading(false);
    }
  };

  const showModal = (message, onClose) => {
    setModalMessage(message);
    setModalVisible(true);
    if (onClose) {
      setTimeout(() => {
        setModalVisible(false);
        onClose();
      }, 2000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Aktif": return "success";
      case "Habis": return "danger";
      case "Kadaluarsa": return "warning";
      case "Non-Aktif": return "gray";
      default: return "info";
    }
  };

  const isExpiringSoon = formData.tanggal_kadaluarsa && 
    moment(formData.tanggal_kadaluarsa).diff(moment(), 'days') <= 30;

  const isLowStock = parseInt(formData.jumlah_obat) <= 10;

  return (
    <>
      <Header title="Edit Obat" withBack />
      
      <ScrollView flex={1} bg="gray.50">
        <VStack space={4} p={4}>
          {/* Info Card */}
          <Box bg="white" borderRadius="xl" shadow={2} p={4}>
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Heading size="md">Informasi Obat</Heading>
                <Badge 
                  variant="subtle" 
                  colorScheme={getStatusColor(formData.status)}
                >
                  {formData.status}
                </Badge>
              </HStack>
              
              {(isLowStock || isExpiringSoon) && (
                <HStack space={2}>
                  {isLowStock && (
                    <Badge colorScheme="red" variant="outline" size="sm">
                      Stok Rendah
                    </Badge>
                  )}
                  {isExpiringSoon && (
                    <Badge colorScheme="orange" variant="outline" size="sm">
                      Segera Expired
                    </Badge>
                  )}
                </HStack>
              )}
            </VStack>
          </Box>

          {/* Form */}
          <Box bg="white" borderRadius="xl" shadow={2} p={4}>
            <VStack space={4}>
              <Heading size="sm" color="gray.700">Data Obat</Heading>
              
              {/* Nama Obat */}
              <FormControl isRequired>
                <FormControl.Label>Nama Obat</FormControl.Label>
                <Input
                  placeholder="Masukkan nama obat"
                  value={formData.nama_obat}
                  onChangeText={(value) => handleInputChange('nama_obat', value)}
                  bg="gray.50"
                  borderRadius="lg"
                />
              </FormControl>

              {/* Kode Obat */}
              <FormControl>
                <FormControl.Label>Kode Obat</FormControl.Label>
                <Input
                  placeholder="Masukkan kode obat"
                  value={formData.kode_obat}
                  onChangeText={(value) => handleInputChange('kode_obat', value)}
                  bg="gray.50"
                  borderRadius="lg"
                  isReadOnly
                />
              </FormControl>

              {/* Jenis & Kategori */}
              <HStack space={3}>
                <FormControl flex={1} isRequired>
                  <FormControl.Label>Jenis Obat</FormControl.Label>
                  <Select
                    selectedValue={formData.jenis_obat}
                    onValueChange={(value) => handleInputChange('jenis_obat', value)}
                    placeholder="Pilih jenis"
                    bg="gray.50"
                    borderRadius="lg"
                    _selectedItem={{
                      bg: "emerald.100",
                      endIcon: <CheckIcon size="5" />
                    }}
                  >
                    {jenisObatOptions.map((option) => (
                      <Select.Item key={option} label={option} value={option} />
                    ))}
                  </Select>
                </FormControl>

                <FormControl flex={1} isRequired>
                  <FormControl.Label>Kategori</FormControl.Label>
                  <Select
                    selectedValue={formData.kategori_obat}
                    onValueChange={(value) => handleInputChange('kategori_obat', value)}
                    placeholder="Pilih kategori"
                    bg="gray.50"
                    borderRadius="lg"
                    _selectedItem={{
                      bg: "emerald.100",
                      endIcon: <CheckIcon size="5" />
                    }}
                  >
                    {kategoriOptions.map((option) => (
                      <Select.Item key={option} label={option} value={option} />
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <Divider />

              {/* Stok & Harga */}
              <HStack space={3}>
                <FormControl flex={1} isRequired>
                  <FormControl.Label>Jumlah Stok</FormControl.Label>
                  <Input
                    placeholder="0"
                    value={formData.jumlah_obat}
                    onChangeText={(value) => handleInputChange('jumlah_obat', value)}
                    keyboardType="numeric"
                    bg="gray.50"
                    borderRadius="lg"
                  />
                </FormControl>

                <FormControl flex={1}>
                  <FormControl.Label>Stok Awal</FormControl.Label>
                  <Input
                    placeholder="0"
                    value={formData.stok_awal}
                    onChangeText={(value) => handleInputChange('stok_awal', value)}
                    keyboardType="numeric"
                    bg="gray.50"
                    borderRadius="lg"
                    isReadOnly
                  />
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Harga Satuan</FormControl.Label>
                <Input
                  placeholder="0"
                  value={formData.harga_satuan}
                  onChangeText={(value) => handleInputChange('harga_satuan', value)}
                  keyboardType="numeric"
                  bg="gray.50"
                  borderRadius="lg"
                  InputLeftElement={
                    <Text ml={3} color="gray.500">Rp</Text>
                  }
                />
              </FormControl>

              <Divider />

              {/* Tanggal */}
              <HStack space={3}>
                <FormControl flex={1} isRequired>
                  <FormControl.Label>Tanggal Beli</FormControl.Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={formData.tanggal_beli}
                    onChangeText={(value) => handleInputChange('tanggal_beli', value)}
                    bg="gray.50"
                    borderRadius="lg"
                    InputLeftElement={
                      <Icon as={MaterialIcons} name="calendar-today" size={5} ml={3} color="gray.400" />
                    }
                  />
                </FormControl>

                <FormControl flex={1} isRequired>
                  <FormControl.Label>Tanggal Expired</FormControl.Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={formData.tanggal_kadaluarsa}
                    onChangeText={(value) => handleInputChange('tanggal_kadaluarsa', value)}
                    bg="gray.50"
                    borderRadius="lg"
                    InputLeftElement={
                      <Icon as={MaterialIcons} name="calendar-today" size={5} ml={3} color="gray.400" />
                    }
                  />
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Pemasok</FormControl.Label>
                <Input
                  placeholder="Masukkan nama pemasok"
                  value={formData.pemasok}
                  onChangeText={(value) => handleInputChange('pemasok', value)}
                  bg="gray.50"
                  borderRadius="lg"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Status</FormControl.Label>
                <Select
                  selectedValue={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  placeholder="Pilih status"
                  bg="gray.50"
                  borderRadius="lg"
                  _selectedItem={{
                    bg: "emerald.100",
                    endIcon: <CheckIcon size="5" />
                  }}
                >
                  {statusOptions.map((option) => (
                    <Select.Item key={option} label={option} value={option} />
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormControl.Label>Keterangan</FormControl.Label>
                <TextArea
                  placeholder="Keterangan tambahan (opsional)"
                  value={formData.keterangan}
                  onChangeText={(value) => handleInputChange('keterangan', value)}
                  bg="gray.50"
                  borderRadius="lg"
                  h={20}
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Action Buttons */}
          <VStack space={3} pb={6}>
            <Button
              onPress={updateObat}
              colorScheme="emerald"
              size="lg"
              borderRadius="xl"
              isLoading={loading}
              isDisabled={loading}
              leftIcon={<Icon as={MaterialIcons} name="save" size="sm" />}
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>

            <Button
              onPress={() => navigation.goBack()}
              bgColor={"red.500"}
              variant="outline"
              colorScheme="white"
              size="lg"
              borderRadius="xl"
              leftIcon={<Icon as={MaterialIcons} name="arrow-back" size="sm" color={"white"}/>}
            >
            <Text color={"white"}>
              Batal
              </Text>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Modal */}
      <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
        <Modal.Content borderRadius="xl">
          <Modal.CloseButton />
          <Modal.Header>Informasi</Modal.Header>
          <Modal.Body>
            <Center>
              <Icon 
                as={MaterialIcons} 
                name={modalMessage.includes("berhasil") ? "check-circle" : "error"} 
                size={12} 
                color={modalMessage.includes("berhasil") ? "green.500" : "red.500"} 
              />
              <Text mt={3} textAlign="center">{modalMessage}</Text>
            </Center>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onPress={() => setModalVisible(false)}
              colorScheme="emerald"
              borderRadius="lg"
            >
              OK
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default AdminEditObat;