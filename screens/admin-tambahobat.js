import React, { useState, useEffect } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
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
  Pressable,
  IconButton,
  Icon,
  Center,
  Heading,
  Badge,
  useTheme,
} from "native-base";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import FIREBASE from "../actions/config/FIREBASE";
import Header from "../components/header";
import { getData } from "../utils";
import moment from "moment";

const AdminTambahObat = ({ navigation }) => {
  const [formData, setFormData] = useState({
    nama_obat: "",
    kode_obat: "",
    jenis_obat: "",
    kategori_obat: "",
    jumlah_obat: "",
    harga_satuan: "",
    tanggal_beli: "",
    tanggal_kadaluarsa: "",
    pemasok: "",
    keterangan: "",
  });

  // State untuk date picker
  const [showTanggalBeli, setShowTanggalBeli] = useState(false);
  const [showTanggalKadaluarsa, setShowTanggalKadaluarsa] = useState(false);

  // State lainnya
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Options untuk dropdown
  const jenisObatOptions = ["Tablet", "Kapsul", "Sirup", "Salep", "Gel"];

  const kategoriObatOptions = [
    "Obat Bebas",
    "Obat Keras",
    "Obat Narkotika",
    "Suplemen",
    "Vitamin",
  ];

  useEffect(() => {
    getUserData();
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
      showModal("Error", "Terjadi kesalahan saat mengambil data pengguna.");
    }
  };

  const handleInputChange = (name, value) => {
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (formError) {
      setFormError("");
    }
  };

  const handleTanggalBeliChange = (event, selectedDate) => {
    setShowTanggalBeli(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setFormData((prevState) => ({
        ...prevState,
        tanggal_beli: formattedDate,
      }));
    }
  };

  const handleTanggalKadaluarsaChange = (event, selectedDate) => {
    setShowTanggalKadaluarsa(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setFormData((prevState) => ({
        ...prevState,
        tanggal_kadaluarsa: formattedDate,
      }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      "nama_obat",
      "kode_obat",
      "jenis_obat",
      "kategori_obat",
      "jumlah_obat",
      "harga_satuan",
      "tanggal_beli",
      "tanggal_kadaluarsa",
      "pemasok",
    ];

    for (let field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        return `Field ${field.replace("_", " ")} wajib diisi.`;
      }
    }

    // Validate jumlah_obat is a positive number
    if (isNaN(formData.jumlah_obat) || parseInt(formData.jumlah_obat) <= 0) {
      return "Jumlah obat harus berupa angka positif.";
    }

    // Validate harga_satuan is a positive number
    if (
      isNaN(formData.harga_satuan) ||
      parseFloat(formData.harga_satuan) <= 0
    ) {
      return "Harga satuan harus berupa angka positif.";
    }

    // Validate tanggal_kadaluarsa is after tanggal_beli
    if (
      new Date(formData.tanggal_kadaluarsa) <= new Date(formData.tanggal_beli)
    ) {
      return "Tanggal kadaluarsa harus setelah tanggal pembelian.";
    }

    return null;
  };

  const generateKodeObat = () => {
    // Generate kode otomatis berdasarkan kategori dan timestamp
    const kategoriCode = formData.kategori_obat.substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `${kategoriCode}${timestamp}${randomNum}`;
  };

  const checkKodeObatExists = async (kode) => {
    try {
      const obatRef = FIREBASE.database().ref("obat");
      const snapshot = await obatRef
        .orderByChild("kode_obat")
        .equalTo(kode)
        .once("value");
      return snapshot.exists();
    } catch (error) {
      console.error("Error checking kode obat:", error);
      return false;
    }
  };

  const addObat = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      setModalVisible(true);
      setModalMessage(validationError);
      return;
    }

    setIsSaving(true);

    try {
      // Check if kode_obat already exists
      const kodeExists = await checkKodeObatExists(formData.kode_obat);
      if (kodeExists) {
        showModal("Error", "Kode obat sudah ada. Silakan gunakan kode lain.");
        setIsSaving(false);
        return;
      }

      const newRef = FIREBASE.database().ref("obat").push();
      const obat_id = newRef.key;

      const data = {
        id: obat_id,
        userId: user.uid,
        nama_obat: formData.nama_obat.trim(),
        kode_obat: formData.kode_obat.trim(),
        jenis_obat: formData.jenis_obat,
        kategori_obat: formData.kategori_obat,
        jumlah_obat: parseInt(formData.jumlah_obat),
        stok_awal: parseInt(formData.jumlah_obat), // Simpan stok awal
        harga_satuan: parseFloat(formData.harga_satuan),
        tanggal_beli: formData.tanggal_beli,
        tanggal_kadaluarsa: formData.tanggal_kadaluarsa,
        pemasok: formData.pemasok.trim(),
        keterangan: formData.keterangan.trim(),
        status: "Aktif",
        createdAt: moment().toISOString(),
        updatedAt: moment().toISOString(),
        createdBy: user.name || user.nama || "",
      };

      await newRef.set(data);

      showModal("Berhasil", "Data obat berhasil ditambahkan.");
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error saving data:", error);
      showModal(
        "Error",
        "Terjadi kesalahan saat menyimpan data: " + error.message
      );
    } finally {
      setIsSaving(false);
    }
  };

  const showModal = (title, message) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      nama_obat: "",
      kode_obat: "",
      jenis_obat: "",
      kategori_obat: "",
      jumlah_obat: "",
      harga_satuan: "",
      tanggal_beli: "",
      tanggal_kadaluarsa: "",
      pemasok: "",
      keterangan: "",
    });
    setFormError("");
  };

  return (
    <>
      <Header title={"Tambah Data Obat"} withBack={true} />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Box
          w="full"
          bgColor={"green.500"}
          p={6}
          borderRadius="2xl"
          shadow={4}
          mb={6}
        >
          <HStack alignItems="center" space={3}>
            <Icon
              as={MaterialIcons}
              name="medical-services"
              size={8}
              color="white"
            />
            <VStack>
              <Text color="white" fontSize="lg" fontWeight="bold">
                Form Tambah Obat
              </Text>
              <Text color="white" opacity={0.8}>
                Silakan isi detail data obat
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Main Form Container */}
        <Box bg="white" borderRadius="2xl" shadow={2} p={5} mb={6}>
          <VStack space={5}>
            {/* Nama Obat */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Nama Obat *
              </FormControl.Label>
              <Input
                value={formData.nama_obat}
                onChangeText={(value) => handleInputChange("nama_obat", value)}
                placeholder="Masukkan nama obat"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                InputLeftElement={
                  <Icon
                    as={MaterialIcons}
                    name="medication"
                    size={5}
                    ml={3}
                    color="gray.400"
                  />
                }
              />
            </FormControl>

            {/* Kode Obat */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Kode Obat *
              </FormControl.Label>
              <HStack space={2}>
                <Input
                  flex={1}
                  value={formData.kode_obat}
                  onChangeText={(value) =>
                    handleInputChange("kode_obat", value)
                  }
                  placeholder="Masukkan kode obat"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  InputLeftElement={
                    <Icon
                      as={MaterialIcons}
                      name="qr-code"
                      size={5}
                      ml={3}
                      color="gray.400"
                    />
                  }
                />
                <Button
                  onPress={() =>
                    handleInputChange("kode_obat", generateKodeObat())
                  }
                  variant="outline"
                  colorScheme="blue"
                  borderRadius="lg"
                  px={4}
                >
                  Generate
                </Button>
              </HStack>
            </FormControl>

            {/* Jenis dan Kategori Obat */}
            <HStack space={4}>
              <FormControl flex={1}>
                <FormControl.Label _text={{ fontWeight: "bold" }}>
                  Jenis Obat *
                </FormControl.Label>
                <Select
                  selectedValue={formData.jenis_obat}
                  onValueChange={(value) =>
                    handleInputChange("jenis_obat", value)
                  }
                  placeholder="Pilih Jenis Obat"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  _selectedItem={{
                    bg: "green.100",
                    endIcon: <Icon as={MaterialIcons} name="check" size={5} />,
                  }}
                >
                  {jenisObatOptions.map((jenis) => (
                    <Select.Item key={jenis} label={jenis} value={jenis} />
                  ))}
                </Select>
              </FormControl>

              <FormControl flex={1}>
                <FormControl.Label _text={{ fontWeight: "bold" }}>
                  Kategori Obat *
                </FormControl.Label>
                <Select
                  selectedValue={formData.kategori_obat}
                  onValueChange={(value) =>
                    handleInputChange("kategori_obat", value)
                  }
                  placeholder="Pilih Kategori"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  _selectedItem={{
                    bg: "green.100",
                    endIcon: <Icon as={MaterialIcons} name="check" size={5} />,
                  }}
                >
                  {kategoriObatOptions.map((kategori) => (
                    <Select.Item
                      key={kategori}
                      label={kategori}
                      value={kategori}
                    />
                  ))}
                </Select>
              </FormControl>
            </HStack>

            {/* Jumlah dan Harga */}
            <HStack space={4}>
              <FormControl flex={1}>
                <FormControl.Label _text={{ fontWeight: "bold" }}>
                  Jumlah Stok *
                </FormControl.Label>
                <Input
                  value={formData.jumlah_obat}
                  onChangeText={(value) =>
                    handleInputChange("jumlah_obat", value)
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  InputRightElement={
                    <Text mr={3} color="gray.400">
                      pcs
                    </Text>
                  }
                />
              </FormControl>

              <FormControl flex={1}>
                <FormControl.Label _text={{ fontWeight: "bold" }}>
                  Harga Satuan *
                </FormControl.Label>
                <Input
                  value={formData.harga_satuan}
                  onChangeText={(value) =>
                    handleInputChange("harga_satuan", value)
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  InputLeftElement={
                    <Text ml={3} color="gray.400">
                      Rp
                    </Text>
                  }
                />
              </FormControl>
            </HStack>

            {/* Tanggal Beli */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Tanggal Pembelian *
              </FormControl.Label>
              <Pressable onPress={() => setShowTanggalBeli(true)}>
                <Input
                  placeholder="Pilih Tanggal Pembelian"
                  value={formData.tanggal_beli || ""}
                  isReadOnly={true}
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  InputLeftElement={
                    <Icon
                      as={MaterialIcons}
                      name="date-range"
                      size={5}
                      ml={3}
                      color="gray.400"
                    />
                  }
                  InputRightElement={
                    <Icon
                      as={MaterialIcons}
                      name="calendar-today"
                      size={5}
                      mr={3}
                      color="green.500"
                    />
                  }
                />
              </Pressable>

              {showTanggalBeli && (
                <DateTimePicker
                  value={
                    formData.tanggal_beli
                      ? new Date(formData.tanggal_beli)
                      : new Date()
                  }
                  mode="date"
                  display="default"
                  onChange={handleTanggalBeliChange}
                />
              )}
            </FormControl>

            {/* Tanggal Kadaluarsa */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Tanggal Kadaluarsa *
              </FormControl.Label>
              <Pressable onPress={() => setShowTanggalKadaluarsa(true)}>
                <Input
                  placeholder="Pilih Tanggal Kadaluarsa"
                  value={formData.tanggal_kadaluarsa || ""}
                  isReadOnly={true}
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  InputLeftElement={
                    <Icon
                      as={MaterialIcons}
                      name="event-busy"
                      size={5}
                      ml={3}
                      color="gray.400"
                    />
                  }
                  InputRightElement={
                    <Icon
                      as={MaterialIcons}
                      name="warning"
                      size={5}
                      mr={3}
                      color="orange.500"
                    />
                  }
                />
              </Pressable>

              {showTanggalKadaluarsa && (
                <DateTimePicker
                  value={
                    formData.tanggal_kadaluarsa
                      ? new Date(formData.tanggal_kadaluarsa)
                      : new Date()
                  }
                  mode="date"
                  display="default"
                  onChange={handleTanggalKadaluarsaChange}
                  minimumDate={
                    formData.tanggal_beli
                      ? new Date(formData.tanggal_beli)
                      : new Date()
                  }
                />
              )}
            </FormControl>

            {/* Pemasok */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Pemasok *
              </FormControl.Label>
              <Input
                value={formData.pemasok}
                onChangeText={(value) => handleInputChange("pemasok", value)}
                placeholder="Masukkan nama pemasok"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                InputLeftElement={
                  <Icon
                    as={MaterialIcons}
                    name="business"
                    size={5}
                    ml={3}
                    color="gray.400"
                  />
                }
              />
            </FormControl>

            {/* Keterangan */}
            <FormControl>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                Keterangan
              </FormControl.Label>
              <Input
                value={formData.keterangan}
                onChangeText={(value) => handleInputChange("keterangan", value)}
                placeholder="Tambahkan keterangan (opsional)"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                multiline
                numberOfLines={3}
                InputLeftElement={
                  <Icon
                    as={MaterialIcons}
                    name="notes"
                    size={5}
                    ml={3}
                    color="gray.400"
                  />
                }
              />
            </FormControl>
          </VStack>
        </Box>

        {/* Action Buttons */}
        <VStack space={3} mb={8}>
          <Button
            onPress={addObat}
            isDisabled={isSaving}
            colorScheme="green"
            _text={{ fontWeight: "bold" }}
            py={4}
            borderRadius="lg"
          >
            {isSaving ? (
              <HStack space={2} alignItems="center">
                <ActivityIndicator color="white" />
                <Text color="white" fontWeight="bold">
                  Menyimpan...
                </Text>
              </HStack>
            ) : (
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="save" size="sm" />
                <Text color="white" fontWeight="bold">
                  Simpan Data Obat
                </Text>
              </HStack>
            )}
          </Button>

          <Button
            onPress={resetForm}
            variant="outline"
            colorScheme="gray"
            _text={{ fontWeight: "bold" }}
            py={4}
            borderRadius="lg"
            bgColor={"white.400"}
          >
            <HStack space={2} alignItems="center">
              <Icon as={MaterialIcons} name="refresh" size="sm" />
              <Text fontWeight="bold">Reset Form</Text>
            </HStack>
          </Button>
        </VStack>
      </ScrollView>

      {/* Modal */}
      <Modal isOpen={modalVisible} onClose={() => setModalVisible(false)}>
        <Modal.Content borderRadius="xl">
          <Modal.CloseButton />
          <Modal.Header borderBottomWidth={0}>Informasi</Modal.Header>
          <Modal.Body>
            <Text>{modalMessage}</Text>
          </Modal.Body>
          <Modal.Footer borderTopWidth={0}>
            <Button
              onPress={() => setModalVisible(false)}
              colorScheme="green"
              borderRadius="lg"
              _text={{ fontWeight: "bold" }}
            >
              Ok
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default AdminTambahObat;
