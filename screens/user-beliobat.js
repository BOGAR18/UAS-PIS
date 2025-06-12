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
  Divider,
  useTheme,
  Heading,
  Badge,
  Center,
  Checkbox,
  Radio,
  TextArea,
  Progress,
  AlertDialog,
} from "native-base";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import FIREBASE from "../actions/config/FIREBASE";
import Header from "../components/header";
import * as DocumentPicker from "expo-document-picker";
import { getData } from "../utils";
import moment from "moment";

// Custom Required Label Component
const RequiredLabel = ({ children, required = false }) => (
  <HStack alignItems="flex-start">
    <Text fontWeight="bold" flex={1}>
      {children}
    </Text>
    {required && (
      <Text color="red.500" fontWeight="bold" ml={1}>
        *
      </Text>
    )}
  </HStack>
);

const UserBeliObat = ({ navigation }) => {
  const [items, setItems] = useState([
    {
      id: 1,
      namaObat: "",
      kodeObat: "",
      jenisObat: "",
      kategoriObat: "",
      jumlahBeli: "",
      hargaSatuan: 0,
      subtotal: 0,
      maxStok: 0,
    },
  ]);

  const [customerData, setCustomerData] = useState({
    namaCustomer: "",
    nomorTelepon: "",
    alamat: "",
    email: "",
    tanggalPembelian: "",
    metodePembayaran: "",
    catatanKhusus: "",
  });

  // State untuk menampilkan/menyembunyikan date picker
  const [showTanggalPembelian, setShowTanggalPembelian] = useState(false);

  // State lainnya
  const [obatOptions, setObatOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [totalHarga, setTotalHarga] = useState(0);
  const [totalItem, setTotalItem] = useState(0);
  const [resepRequired, setResepRequired] = useState(false);
  const [fileResep, setFileResep] = useState(null);

  // Payment States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentStep, setPaymentStep] = useState(0); // 0: processing, 1: success, 2: complete
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState("");

  // Payment methods
  const metodePembayaranOptions = [
    "Transfer Bank",
    "E-Wallet",
    "Kartu Kredit/Debit",
    "BPJS/Asuransi"
  ];

  const paymentSteps = [
    { message: "Menginisialisasi pembayaran...", duration: 1000 },
    { message: "Menghubungkan ke payment gateway...", duration: 1500 },
    { message: "Memproses pembayaran...", duration: 2000 },
    { message: "Memverifikasi transaksi...", duration: 1500 },
    { message: "Pembayaran berhasil!", duration: 1000 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const obatData = await getObatTersedia();
      setObatOptions(obatData);
      setLoading(false);
    };

    fetchData();
    getUserData();
    
    // Set default tanggal pembelian ke hari ini
    setCustomerData(prev => ({
      ...prev,
      tanggalPembelian: moment().format('YYYY-MM-DD')
    }));
  }, []);

  // Update total when items change
  useEffect(() => {
    calculateTotal();
    checkResepRequired();
  }, [items]);

  const getObatTersedia = async () => {
    try {
      const obatRef = FIREBASE.database().ref("obat");
      const snapshot = await obatRef.once("value");
      const obatData = snapshot.val();

      if (obatData) {
        const obatMap = new Map();

        Object.entries(obatData).forEach(([firebaseKey, item]) => {
          // Only process active medicines with stock > 0 and not expired
          if (item.status === "Aktif" && 
              item.jumlah_obat > 0 && 
              moment(item.tanggal_kadaluarsa).isAfter(moment())) {
            
            const key = item.nama_obat; // Group by medicine name
            
            if (obatMap.has(key)) {
              // If medicine already exists, update the aggregated data
              const existing = obatMap.get(key);
              
              // Add to total stock
              existing.jumlah_obat += item.jumlah_obat;
              
              // Keep track of all batches (for later use in stock deduction)
              existing.batches.push({
                firebaseKey: firebaseKey,
                batch_obat: item.batch_obat,
                jumlah_obat: item.jumlah_obat,
                tanggal_kadaluarsa: item.tanggal_kadaluarsa,
                harga_satuan: item.harga_satuan
              });
              
              // Sort batches by expiry date (FIFO - First In First Out)
              existing.batches.sort((a, b) => 
                moment(a.tanggal_kadaluarsa).diff(moment(b.tanggal_kadaluarsa))
              );
              
              // Update earliest expiry date
              existing.tanggal_kadaluarsa = existing.batches[0].tanggal_kadaluarsa;
              
              // Calculate weighted average price
              const totalValue = existing.batches.reduce((sum, batch) => 
                sum + (batch.harga_satuan * batch.jumlah_obat), 0
              );
              existing.harga_satuan = Math.round(totalValue / existing.jumlah_obat);
              
            } else {
              // New medicine, add to map with batch tracking
              obatMap.set(key, {
                ...item,
                jumlah_obat: item.jumlah_obat,
                batches: [{
                  firebaseKey: firebaseKey,
                  batch_obat: item.batch_obat,
                  jumlah_obat: item.jumlah_obat,
                  tanggal_kadaluarsa: item.tanggal_kadaluarsa,
                  harga_satuan: item.harga_satuan
                }]
              });
            }
          }
        });
        
        // Convert map to array
        const availableObat = Array.from(obatMap.values());
        
        // Sort by medicine name for better UX
        availableObat.sort((a, b) => a.nama_obat.localeCompare(b.nama_obat));
        
        return availableObat;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching obat data:", error);
      showModal("Error", "Terjadi kesalahan saat mengambil data obat.");
      return [];
    }
  };

  const getUserData = async () => {
    try {
      const userData = await getData("user");

      if (userData) {
        const userRef = FIREBASE.database().ref(`users/${userData.uid}`);
        const snapshot = await userRef.once("value");
        const updatedUserData = snapshot.val();

        if (updatedUserData) {
          setUser(updatedUserData);
          // Pre-fill customer data if available
          setCustomerData(prev => ({
            ...prev,
            namaCustomer: updatedUserData.name || updatedUserData.nama || "",
            email: updatedUserData.email || "",
            nomorTelepon: updatedUserData.nomorhp || "",
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showModal("Error", "Terjadi kesalahan saat mengambil data pengguna.");
    }
  };

  const calculateTotal = () => {
    let total = 0;
    let itemCount = 0;
    
    items.forEach(item => {
      if (item.jumlahBeli && item.hargaSatuan) {
        const subtotal = parseInt(item.jumlahBeli) * parseFloat(item.hargaSatuan);
        total += subtotal;
        itemCount += parseInt(item.jumlahBeli);
      }
    });
    
    setTotalHarga(total);
    setTotalItem(itemCount);
  };

  const checkResepRequired = () => {
    const needsResep = items.some(item => 
      item.kategoriObat === "Obat Keras" || 
      item.kategoriObat === "Obat Narkotika" 
    );
    setResepRequired(needsResep);
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
      });

      if (result && !result.canceled) {
        const selectedFile = result.assets ? result.assets[0] : result;
        setFileResep(selectedFile);
        showModal("File Terpilih", `File resep terpilih: ${selectedFile.name}`);
      } else {
        showModal("Error", "Tidak ada file yang dipilih.");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      showModal("Error", "Terjadi kesalahan saat memilih file.");
    }
  };

  const uploadFileResep = async (pembelian_id, fileResep) => {
    if (fileResep) {
      try {
        const response = await fetch(fileResep.uri);
        const blob = await response.blob();

        const fileName = `${pembelian_id}_${fileResep.name}`;
        const reference = FIREBASE.storage().ref(`resep_obat/${fileName}`);

        await reference.put(blob);

        const downloadURL = await reference.getDownloadURL();
        return downloadURL;
      } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
      }
    }
    return null;
  };

  const updateStokObat = async (obatItems) => {
    try {
      const updates = {};
      
      for (const item of obatItems) {
        // Find the medicine in our grouped data
        const selectedObat = obatOptions.find(
          option => option.kode_obat === item.kode_obat
        );
        
        if (selectedObat && selectedObat.batches) {
          let remainingToDeduct = item.jumlah;
          
          // Process batches in FIFO order (already sorted by expiry date)
          for (const batch of selectedObat.batches) {
            if (remainingToDeduct <= 0) break;
            
            const obatRef = FIREBASE.database().ref(`obat/${batch.firebaseKey}`);
            const snapshot = await obatRef.once("value");
            
            if (snapshot.exists()) {
              const currentData = snapshot.val();
              const currentStok = currentData.jumlah_obat;
              
              // Calculate how much to deduct from this batch
              const deductAmount = Math.min(remainingToDeduct, currentStok);
              const newStok = currentStok - deductAmount;
              
              // Update this batch
              updates[`obat/${batch.firebaseKey}/jumlah_obat`] = Math.max(0, newStok);
              updates[`obat/${batch.firebaseKey}/updatedAt`] = moment().toISOString();
              
              // Update status if stock is depleted
              if (newStok <= 0) {
                updates[`obat/${batch.firebaseKey}/status`] = "Habis";
              }
              
              // Reduce remaining amount to deduct
              remainingToDeduct -= deductAmount;
            }
          }
          
          // If we couldn't deduct all (shouldn't happen with proper validation)
          if (remainingToDeduct > 0) {
            console.warn(`Could not deduct all stock for ${item.nama}. Remaining: ${remainingToDeduct}`);
          }
        }
      }
      
      // Apply all updates at once
      await FIREBASE.database().ref().update(updates);
    } catch (error) {
      console.error("Error updating stok obat:", error);
      throw error;
    }
  };

  const addPembelianObat = async () => {
    // Validation
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      setModalVisible(true);
      setModalMessage(validationError);
      return;
    }

    setIsSaving(true);
    setPaymentModalVisible(true);

    try {
      // Start payment process
      const paymentSuccess = await processPayment();
      
      if (paymentSuccess) {
        // Continue with the actual saving process
        const newRef = FIREBASE.database().ref("pembelian_obat").push();
        const pembelian_id = newRef.key;

        let fileResepURL = null;
        
        // Upload file if exists
        if (fileResep) {
          try {
            fileResepURL = await uploadFileResep(pembelian_id, fileResep);
          } catch (uploadError) {
            console.error("File upload failed:", uploadError);
            // Continue without file if upload fails
            showModal("Warning", "Pesanan berhasil dibuat, tetapi file resep gagal diupload. Silakan hubungi apoteker.");
          }
        }

        // Mapping obat items with batch tracking
        const obatItems = items.map((item) => {
          const selectedObat = obatOptions.find(
            (option) => option.kode_obat === item.kodeObat
          );
          const obat_id = FIREBASE.database().ref().push().key;
          
          // Get batch information for tracking
          let batchInfo = [];
          if (selectedObat && selectedObat.batches) {
            let remainingQty = parseInt(item.jumlahBeli);
            
            for (const batch of selectedObat.batches) {
              if (remainingQty <= 0) break;
              
              const takeFromBatch = Math.min(remainingQty, batch.jumlah_obat);
              if (takeFromBatch > 0) {
                batchInfo.push({
                  batch_obat: batch.batch_obat,
                  jumlah: takeFromBatch,
                  tanggal_kadaluarsa: batch.tanggal_kadaluarsa,
                  harga_satuan: batch.harga_satuan
                });
                remainingQty -= takeFromBatch;
              }
            }
          }
          
          return {
            id: obat_id,
            nama: item.namaObat || null,
            kode_obat: item.kodeObat || null,
            jenis: item.jenisObat || null,
            kategori: item.kategoriObat || null,
            jumlah: parseInt(item.jumlahBeli) || 0,
            harga: parseFloat(item.hargaSatuan) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            // Store batch information for traceability
            batch_info: batchInfo,
            // Use earliest expiry date from selected batches
            tanggal_kadaluarsa: batchInfo.length > 0 ? batchInfo[0].tanggal_kadaluarsa : null,
          };
        });

        const data = {
          id: pembelian_id,
          userId: user.uid,
          
          // Customer Information
          nama_customer: customerData.namaCustomer,
          nomor_telepon: customerData.nomorTelepon,
          alamat_pengiriman: customerData.alamat,
          email_customer: customerData.email,
          
          // Purchase Information
          tanggal_pembelian: customerData.tanggalPembelian,
          metode_pembayaran: customerData.metodePembayaran,
          catatan: customerData.catatanKhusus,
          
          // Items and Pricing
          obat_items: obatItems,
          total_item: totalItem,
          total_harga: totalHarga,
          
          // Status and Files
          status: "Pending",
          status_pembayaran: "Sudah Dibayar",
          file_resep: fileResepURL || "",
          resep_required: resepRequired,
          
          // Payment Information
          payment_id: `PAY_${pembelian_id}`,
          payment_method: customerData.metodePembayaran,
          payment_status: "completed",
          payment_date: moment().toISOString(),
          
          // Timestamps
          createdAt: moment().toISOString(),
          updatedAt: moment().toISOString(),
        };

        console.log("Data pembelian to be saved:", data);

        await newRef.set(data);

        // Update stok obat
        await updateStokObat(obatItems);

        // Show success message
        setPaymentStep(2); // Complete
        setPaymentMessage("Pembelian berhasil! Pesanan Anda sedang diproses.");
        
        setTimeout(() => {
          setPaymentModalVisible(false);
          navigation.goBack();
        }, 3000);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setPaymentModalVisible(false);
      showModal("Error", "Terjadi kesalahan saat memproses pembayaran: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Dummy Payment Process
  const processPayment = async () => {
    return new Promise((resolve) => {
      setPaymentStep(0);
      setPaymentProgress(0);
      setPaymentMessage(paymentSteps[0].message);

      let currentStep = 0;
      const totalSteps = paymentSteps.length;

      const processStep = () => {
        if (currentStep < totalSteps) {
          setPaymentMessage(paymentSteps[currentStep].message);
          setPaymentProgress(((currentStep + 1) / totalSteps) * 100);

          setTimeout(() => {
            currentStep++;
            if (currentStep < totalSteps) {
              processStep();
            } else {
              setPaymentStep(1); // Payment success
              setTimeout(() => {
                resolve(true);
              }, 2000);
            }
          }, paymentSteps[currentStep].duration);
        }
      };

      processStep();
    });
  };

  const validateForm = () => {
    // Validate customer data
    if (!customerData.namaCustomer || !customerData.nomorTelepon || !customerData.alamat || !customerData.metodePembayaran) {
      return "Data customer wajib diisi lengkap.";
    }

    // Validate items
    if (items.some(item => !item.namaObat || !item.jumlahBeli)) {
      return "Semua item obat wajib diisi.";
    }

    // Validate resep if required
    if (resepRequired && !fileResep) {
      return "Resep dokter wajib diunggah untuk obat keras/narkotika.";
    }

    if (totalHarga <= 0) {
      return "Total pembelian harus lebih dari 0.";
    }

    return null;
  };

  const handleTanggalPembelianChange = (event, selectedDate) => {
    setShowTanggalPembelian(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setCustomerData((prevState) => ({
        ...prevState,
        tanggalPembelian: formattedDate,
      }));
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: items.length + 1,
        namaObat: "",
        kodeObat: "",
        jenisObat: "",
        kategoriObat: "",
        jumlahBeli: "",
        hargaSatuan: 0,
        subtotal: 0,
        maxStok: 0,
      },
    ]);
  };

  const handleDeleteItem = (index) => {
    setItemToDelete(index);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = () => {
    if (itemToDelete !== null) {
      const newItems = items.filter((_, index) => index !== itemToDelete);
      setItems(newItems);
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
    }
  };

  const handleInputChange = (index, name, value) => {
    const newItems = [...items];

    if (index >= 0 && index < newItems.length) {
      if (name === "namaObat") {
        const selectedObat = obatOptions.find(
          (option) => option.kode_obat === value
        );
        if (selectedObat) {
          newItems[index].namaObat = selectedObat.nama_obat;
          newItems[index].kodeObat = selectedObat.kode_obat;
          newItems[index].jenisObat = selectedObat.jenis_obat;
          newItems[index].kategoriObat = selectedObat.kategori_obat;
          newItems[index].hargaSatuan = selectedObat.harga_satuan;
          newItems[index].maxStok = selectedObat.jumlah_obat;
          newItems[index].jumlahBeli = "";
          newItems[index].subtotal = 0;
        }
      } else if (name === "jumlahBeli") {
        const maxStok = newItems[index].maxStok;
        const hargaSatuan = newItems[index].hargaSatuan;
        
        if (Number(value) > maxStok) {
          showModal(
            "Error",
            `Jumlah pembelian melebihi stok yang tersedia. Stok maksimal: ${maxStok} unit.`
          );
          newItems[index].jumlahBeli = maxStok.toString();
          newItems[index].subtotal = maxStok * hargaSatuan;
        } else {
          newItems[index].jumlahBeli = value;
          newItems[index].subtotal = Number(value) * hargaSatuan;
        }
      } else {
        newItems[index][name] = value;
      }

      setItems(newItems);
    }
  };

  const handleCustomerDataChange = (name, value) => {
    setCustomerData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const showModal = (title, message) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  return (
    <>
      <Header title={"Pembelian Obat"} withBack={true} />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Box
          w="full"
          bgColor={"emerald.500"}
          p={6}
          borderRadius="2xl"
          shadow={4}
          mb={6}
        >
          <HStack alignItems="center" space={3}>
            <Icon as={MaterialIcons} name="shopping-cart" size={8} color="white" />
            <VStack>
              <Text color="white" fontSize="lg" fontWeight="bold">
                Pembelian Obat
              </Text>
              <Text color="white" opacity={0.8}>
                Silakan pilih obat yang akan dibeli
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Customer Information */}
        <Box bg="white" borderRadius="2xl" shadow={2} p={5} mb={6}>
          <Heading size="md" mb={4} color="emerald.600">
            <Icon as={MaterialIcons} name="person" size={5} mr={2} />
            Informasi Customer
          </Heading>
          
          <VStack space={4}>
            <HStack space={4}>
              <FormControl flex={1}>
                <FormControl.Label>
                  <Text>Nama Lengkap</Text>
                </FormControl.Label>
                <Input
                  value={customerData.namaCustomer}
                  onChangeText={(value) => handleCustomerDataChange("namaCustomer", value)}
                  placeholder="Masukkan nama lengkap"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  isReadOnly
                  isDisabled
                />
              </FormControl>

              <FormControl flex={1}>
                <FormControl.Label>
                  <Text>No Telepon</Text>
                </FormControl.Label>
                <Input
                  value={customerData.nomorTelepon}
                  onChangeText={(value) => handleCustomerDataChange("nomorTelepon", value)}
                  placeholder="08xxxxxxxxxx"
                  keyboardType="phone-pad"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  isReadOnly
                  isDisabled
                />
              </FormControl>
            </HStack>

            <FormControl>
              <FormControl.Label>
                <Text>Email</Text>
              </FormControl.Label>
              <Input
                value={customerData.email}
                onChangeText={(value) => handleCustomerDataChange("email", value)}
                placeholder="email@example.com"
                keyboardType="email-address"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                isReadOnly
                isDisabled={true}
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>
                  <Text>Alamat Lengkap</Text>
                <RequiredLabel required={true}></RequiredLabel>
              </FormControl.Label>
              <TextArea
                value={customerData.alamat}
                onChangeText={(value) => handleCustomerDataChange("alamat", value)}
                placeholder="Masukkan alamat lengkap"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                h={20}
              />
            </FormControl>

            <HStack space={4}>
              <FormControl flex={1}>
                <FormControl.Label>
                  <Text>Tanggal Pembelian</Text>
                  <RequiredLabel required={true}></RequiredLabel>
                </FormControl.Label>
                <Pressable onPress={() => setShowTanggalPembelian(true)}>
                  <Input
                    placeholder="Pilih Tanggal"
                    value={customerData.tanggalPembelian || ""}
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
                  />
                </Pressable>

                {showTanggalPembelian && (
                  <DateTimePicker
                    value={
                      customerData.tanggalPembelian
                        ? new Date(customerData.tanggalPembelian)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={handleTanggalPembelianChange}
                  />
                )}
              </FormControl>

              <FormControl flex={1}>
                <FormControl.Label>
                  <Text>Metode Pembayaran</Text>
                  <RequiredLabel required={true}></RequiredLabel>
                </FormControl.Label>
                <Select
                  selectedValue={customerData.metodePembayaran}
                  onValueChange={(value) => handleCustomerDataChange("metodePembayaran", value)}
                  placeholder="Pilih Metode"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  _selectedItem={{
                    bg: "emerald.100",
                    endIcon: <Icon as={MaterialIcons} name="check" size={5} />,
                  }}
                >
                  {metodePembayaranOptions.map((metode) => (
                    <Select.Item key={metode} label={metode} value={metode} />
                  ))}
                </Select>
              </FormControl>
            </HStack>

            <FormControl>
              <FormControl.Label>
                  <Text>Catatan Khusus</Text>
                <RequiredLabel required={false}></RequiredLabel>
              </FormControl.Label>
              <TextArea
                value={customerData.catatanKhusus}
                onChangeText={(value) => handleCustomerDataChange("catatanKhusus", value)}
                placeholder="Catatan khusus (opsional)"
                borderRadius="lg"
                borderWidth={1.5}
                py={3}
                h={16}
              />
            </FormControl>
          </VStack>
        </Box>

        {/* Resep Upload Section */}
        {resepRequired && (
          <Box bg="orange.50" borderRadius="2xl" shadow={2} p={5} mb={6} borderWidth={1} borderColor="orange.200">
            <Heading size="md" mb={4} color="orange.600">
              <Icon as={MaterialIcons} name="description" size={5} mr={2} />
              <HStack alignItems="center">
                <Text>Upload Resep Dokter</Text>
                <Text color="red.500" fontWeight="bold" ml={1}>*</Text>
              </HStack>
            </Heading>
            
            <VStack space={3}>
              <Box bg="orange.100" p={3} borderRadius="lg">
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="info" color="orange.600" />
                  <Text fontSize="sm" color="orange.700">
                    Resep dokter diperlukan untuk obat keras, atau narkotika                  </Text>
                </HStack>
              </Box>

              <Pressable
                onPress={pickDocument}
                bg="white"
                borderRadius="lg"
                borderWidth={2}
                borderStyle="dashed"
                borderColor="orange.300"
                p={6}
              >
                <Center>
                  <Icon
                    as={MaterialIcons}
                    name="cloud-upload"
                    size={12}
                    color="orange.400"
                    mb={2}
                  />
                  <Text color="orange.600" fontWeight="medium" textAlign="center">
                    {fileResep ? fileResep.name : "Upload Resep (PDF/Gambar)"}
                  </Text>
                  {fileResep && (
                    <Badge colorScheme="success" mt={2}>
                      File terpilih
                    </Badge>
                  )}
                </Center>
              </Pressable>
            </VStack>
          </Box>
        )}

        {/* Obat List Section */}
        {obatOptions.length > 0 ? (
          items.map((item, index) => (
            <Box
              key={index}
              bg="white"
              p={5}
              borderRadius="2xl"
              shadow={2}
              mb={4}
            >
              <HStack justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="sm">Obat {index + 1}</Heading>
                <HStack space={2} alignItems="center">
                  <Badge colorScheme="emerald" variant="subtle" rounded="lg">
                    {item.kategoriObat || "Belum dipilih"}
                  </Badge>
                  {index > 0 && (
                    <IconButton
                      icon={
                        <Icon
                          as={MaterialIcons}
                          name="delete"
                          color="red.500"
                        />
                      }
                      onPress={() => handleDeleteItem(index)}
                      variant="ghost"
                      _pressed={{ bg: "red.100" }}
                    />
                  )}
                </HStack>
              </HStack>

              {/* Nama Obat Select */}
              <FormControl mb={5}>
                <FormControl.Label>
                  <Text>Pilih Obat</Text>
                  <RequiredLabel required={true}></RequiredLabel>
                </FormControl.Label>
                <Select
                  selectedValue={item.kodeObat}
                  onValueChange={(value) =>
                    handleInputChange(index, "namaObat", value)
                  }
                  placeholder="Pilih Obat"
                  borderRadius="lg"
                  borderWidth={1.5}
                  py={3}
                  _selectedItem={{
                    bg: "emerald.100",
                    endIcon: <Icon as={MaterialIcons} name="check" size={5} />,
                  }}
                >
                  {obatOptions.map((option) => (
                    <Select.Item
                      key={option.kode_obat}
                      label={`${option.nama_obat} (${option.kategori_obat}), Stok: ${option.jumlah_obat} - Rp ${Number(option.harga_satuan).toLocaleString('id-ID')}`}
                      value={option.kode_obat}
                    />
                  ))}
                </Select>
              </FormControl>

              {/* Detail Obat yang dipilih */}
              {item.namaObat && (
                <Box bg="emerald.50" p={4} borderRadius="lg" mb={4}>
                  <VStack space={2}>
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">Kode:</Text>
                      <Text fontSize="sm" fontWeight="medium">{item.kodeObat}</Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">Jenis:</Text>
                      <Text fontSize="sm" fontWeight="medium">{item.jenisObat}</Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">Kategori:</Text>
                      <Text fontSize="sm" fontWeight="medium">{item.kategoriObat}</Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">Harga Satuan:</Text>
                      <Text fontSize="sm" fontWeight="bold" color="emerald.600">
                        Rp {Number(item.hargaSatuan).toLocaleString('id-ID')}
                      </Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" color="gray.600">Stok Tersedia:</Text>
                      <Text fontSize="sm" fontWeight="medium">{item.maxStok} unit</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Jumlah Beli */}
              <FormControl>
                <FormControl.Label>
                  <Text>Jumlah Beli</Text>
                  <RequiredLabel required={true}></RequiredLabel>
                </FormControl.Label>
                <HStack space={3} alignItems="center">
                  <Input
                    flex={1}
                    type="number"
                    value={item.jumlahBeli.toString()}
                    onChangeText={(value) =>
                      handleInputChange(index, "jumlahBeli", value)
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    borderRadius="lg"
                    borderWidth={1.5}
                    py={3}
                    InputRightElement={
                      <Text mr={3} color="gray.400">
                        unit
                      </Text>
                    }
                  />
                  <VStack alignItems="center">
                    <Text fontSize="xs" color="gray.500">Subtotal:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="emerald.600">
                      Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                    </Text>
                  </VStack>
                </HStack>
              </FormControl>
            </Box>
          ))
        ) : (
          <Center bg="white" p={8} borderRadius="2xl" shadow={2}>
            <Icon
              as={MaterialIcons}
              name="medical-services"
              size={12}
              color="gray.300"
              mb={4}
            />
            <Text color="gray.500" fontSize="md" textAlign="center">
              {loading ? "Memuat data obat..." : "Tidak ada obat tersedia"}
            </Text>
          </Center>
        )}

        {/* Summary Section */}
        <Box bg="white" borderRadius="2xl" shadow={2} p={5} mb={6}>
          <Heading size="md" mb={4} color="emerald.600">
            <Icon as={MaterialIcons} name="receipt" size={5} mr={2} />
            Ringkasan Pembelian
          </Heading>
          
          <VStack space={3}>
            <HStack justifyContent="space-between">
              <Text fontWeight="medium">Total Item:</Text>
              <Text fontWeight="bold">{totalItem} unit</Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontWeight="medium">Total Harga:</Text>
              <Text fontSize="lg" fontWeight="bold" color="emerald.600">
                Rp {totalHarga.toLocaleString('id-ID')}
              </Text>
            </HStack>
            <Divider />
            <HStack justifyContent="space-between">
              <Text fontWeight="medium">Metode Pembayaran:</Text>
              <Text fontWeight="bold">{customerData.metodePembayaran || "-"}</Text>
            </HStack>
            {resepRequired && (
              <HStack justifyContent="space-between">
                <Text fontWeight="medium">Status Resep:</Text>
                <Badge colorScheme={fileResep ? "success" : "warning"}>
                  {fileResep ? "Sudah upload" : "Belum upload"}
                </Badge>
              </HStack>
            )}
          </VStack>
        </Box>

        {/* Action Buttons */}
        <VStack space={3} mb={8}>
          <Button
            bgColor={"white"}
            onPress={handleAddItem}
            leftIcon={<Icon as={MaterialIcons} name="add" size="sm" />}
            colorScheme="emerald"
            variant="outline"
            _text={{ fontWeight: "bold" }}
            py={4}
            borderRadius="lg"
          >
            Tambah Obat
          </Button>

          <Button
            onPress={addPembelianObat}
            isDisabled={isSaving || totalHarga <= 0}
            colorScheme="emerald"
            _text={{ fontWeight: "bold" }}
            py={4}
            borderRadius="lg"
          >
            {isSaving ? (
              <HStack space={2} alignItems="center">
                <ActivityIndicator color="white" />
                <Text color="white" fontWeight="bold">
                  Memproses...
                </Text>
              </HStack>
            ) : (
              <HStack space={2} alignItems="center">
                <Icon as={MaterialIcons} name="payment" size="sm" />
                <Text color="white" fontWeight="bold">
                  Bayar & Beli Obat (Rp {totalHarga.toLocaleString('id-ID')})
                </Text>
              </HStack>
            )}
          </Button>
        </VStack>

        {/* Footer Note */}
        <Center mb={6}>
          <VStack space={2} alignItems="center">
            <HStack space={2} alignItems="center">
              <Icon
                as={Ionicons}
                name="information-circle"
                size={5}
                color="gray.500"
              />
              <Text color="gray.600" fontSize="sm" fontWeight="medium">
                Pembayaran akan diproses secara otomatis
              </Text>
            </HStack>
            <HStack space={1} alignItems="center">
              <Text color="red.500" fontSize="sm" fontWeight="bold">*</Text>
              <Text color="gray.500" fontSize="xs" textAlign="center">
                Field wajib diisi
              </Text>
            </HStack>
          </VStack>
        </Center>
      </ScrollView>

      {/* Payment Processing Modal */}
      <Modal isOpen={paymentModalVisible} onClose={() => {}} closeOnOverlayClick={false}>
        <Modal.Content borderRadius="2xl" bg="white" maxW="90%">
          <Modal.Body p={8}>
            <VStack space={6} alignItems="center">
              {paymentStep === 0 && (
                <>
                  {/* Processing Payment */}
                  <Icon 
                    as={MaterialIcons} 
                    name="payment" 
                    size={16} 
                    color="emerald.500"
                  />
                  <VStack space={3} alignItems="center" w="full">
                    <Text fontSize="lg" fontWeight="bold" color="gray.800" textAlign="center">
                      Memproses Pembayaran
                    </Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      {paymentMessage}
                    </Text>
                    <Progress 
                      value={paymentProgress} 
                      colorScheme="emerald" 
                      size="md" 
                      w="full"
                      bg="gray.200"
                      borderRadius="full"
                    />
                    <Text fontSize="xs" color="gray.500">
                      {Math.round(paymentProgress)}% selesai
                    </Text>
                  </VStack>
                </>
              )}

              {paymentStep === 1 && (
                <>
                  {/* Payment Success */}
                  <Icon 
                    as={MaterialIcons} 
                    name="check-circle" 
                    size={20} 
                    color="green.500"
                  />
                  <VStack space={3} alignItems="center">
                    <Text fontSize="xl" fontWeight="bold" color="green.600" textAlign="center">
                      Pembayaran Berhasil!
                    </Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      Transaksi Anda telah berhasil diproses
                    </Text>
                    <Box bg="green.50" p={4} borderRadius="lg" w="full">
                      <VStack space={2}>
                        <HStack justifyContent="space-between">
                          <Text fontSize="sm" color="green.700">Total Bayar:</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.800">
                            Rp {totalHarga.toLocaleString('id-ID')}
                          </Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                          <Text fontSize="sm" color="green.700">Metode:</Text>
                          <Text fontSize="sm" fontWeight="medium" color="green.800">
                            {customerData.metodePembayaran}
                          </Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                          <Text fontSize="sm" color="green.700">Status:</Text>
                          <Badge colorScheme="success" size="sm">
                            Lunas
                          </Badge>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>
                </>
              )}

              {paymentStep === 2 && (
                <>
                  {/* Complete */}
                  <Icon 
                    as={MaterialIcons} 
                    name="shopping-bag" 
                    size={16} 
                    color="emerald.500"
                  />
                  <VStack space={3} alignItems="center">
                    <Text fontSize="lg" fontWeight="bold" color="emerald.600" textAlign="center">
                      Pesanan Berhasil Dibuat!
                    </Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      {paymentMessage}
                    </Text>
                    <Box bg="emerald.50" p={4} borderRadius="lg" w="full">
                      <VStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="schedule" size={6} color="emerald.600" />
                        <Text fontSize="sm" color="emerald.700" fontWeight="medium" textAlign="center">
                          Pesanan akan segera diproses oleh tim farmasi
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>
                </>
              )}
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Regular Modal */}
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
              colorScheme="emerald"
              borderRadius="lg"
              _text={{ fontWeight: "bold" }}
            >
              Ok
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
      >
        <Modal.Content borderRadius="xl">
          <Modal.CloseButton />
          <Modal.Header borderBottomWidth={0}>Konfirmasi Hapus</Modal.Header>
          <Modal.Body>
            <Text>
              Yakin ingin menghapus obat{" "}
              {itemToDelete !== null ? itemToDelete + 1 : ""}?
            </Text>
          </Modal.Body>
          <Modal.Footer borderTopWidth={0}>
            <Button.Group space={2}>
              <Button
                variant="ghost"
                onPress={() => setDeleteConfirmVisible(false)}
                borderRadius="lg"
                _text={{ fontWeight: "bold" }}
              >
                Batal
              </Button>
              <Button
                colorScheme="red"
                onPress={confirmDelete}
                borderRadius="lg"
                _text={{ fontWeight: "bold" }}
              >
                Hapus
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default UserBeliObat;