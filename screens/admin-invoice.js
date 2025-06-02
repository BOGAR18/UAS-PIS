import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  FormControl,
  Input,
  TextArea,
  Button,
  ScrollView,
  StatusBar,
  Heading,
  useToast,
  Center,
  Spinner,
  IconButton,
  Icon,
  KeyboardAvoidingView,
  Divider,
  Badge,
  Pressable,
} from "native-base";
import { Platform } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import moment from "moment";
import "moment/locale/id";
import FIREBASE from "../actions/config/FIREBASE";
import * as Print from "expo-print";
import Header from "../components/header";

// Set locale to Indonesian
moment.locale("id");

const AdminInvoice = ({ route, navigation }) => {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pembelianObat, setPembelianObat] = useState(null);
  const [nextNumber, setNextNumber] = useState("001");
  const [formData, setFormData] = useState({
    tanggal_pembelian: moment().format("YYYY-MM-DD"),
    catatan: "",
    nama_pembeli: "",
    metode_pembayaran: "Tunai",
  });

  const toast = useToast();

  // Color scheme
  const primaryColor = "#10b981"; // emerald.500
  const accentColor = "#059669"; // emerald.600

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get specific pembelian obat
      const pembelianObatRef = FIREBASE.database().ref(`pembelian_obat/${id}`);
      const snapshot = await pembelianObatRef.once("value");
      const data = snapshot.val();

      if (data) {
        setPembelianObat(data);

        // Set form data
        setFormData({
          ...formData,
          nama_pembeli: data.nama_pembeli || "",
          tanggal_pembelian: data.tanggal_pembelian || moment().format("YYYY-MM-DD"),
          metode_pembayaran: data.metode_pembayaran || "Tunai",
        });

        // Get all invoices to determine next number
        const allInvoicesRef = FIREBASE.database().ref("invoices");
        const invoiceSnapshot = await allInvoicesRef.once("value");
        const allInvoices = invoiceSnapshot.val();
        
        let maxNumber = "000";
        if (allInvoices) {
          Object.values(allInvoices).forEach((item) => {
            if (item.nomor_invoice && parseInt(item.nomor_invoice) > parseInt(maxNumber)) {
              maxNumber = item.nomor_invoice;
            }
          });
        }

        // Increment to next number
        const nextNum = String(parseInt(maxNumber) + 1).padStart(3, "0");
        setNextNumber(nextNum);
        setLoading(false);
      } else {
        toast.show({
          title: "Error",
          description: "Data pembelian tidak ditemukan",
          status: "error",
          duration: 3000,
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.show({
        title: "Error",
        description: "Gagal memuat data",
        status: "error",
        duration: 3000,
      });
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const calculateTotal = () => {
    if (!pembelianObat || !pembelianObat.items || !Array.isArray(pembelianObat.items)) {
      return 0;
    }

    return pembelianObat.items.reduce((total, item) => {
      const harga = parseFloat(item.harga_satuan) || 0;
      const jumlah = parseInt(item.jumlah) || 0;
      return total + (harga * jumlah);
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generatePDF = async () => {
    try {
      // Format items data
      const itemsList = [];
      let totalAmount = 0;
      
      if (pembelianObat.items && Array.isArray(pembelianObat.items)) {
        pembelianObat.items.forEach((item) => {
          const harga = parseFloat(item.harga_satuan) || 0;
          const jumlah = parseInt(item.jumlah) || 0;
          const subtotal = harga * jumlah;
          totalAmount += subtotal;
          
          itemsList.push({
            kode_obat: item.kode_obat || "N/A",
            nama_obat: item.nama_obat || "N/A",
            jumlah: jumlah,
            harga_satuan: harga,
            subtotal: subtotal
          });
        });
      }

      // Create the nomor_invoice
      const noInvoice = nextNumber;
      const pembuat = "APOTEK";
      const tahun = moment().format("YYYY");
      const bulan = moment().format("MM");

      const nomorInvoice = `${noInvoice}/${pembuat}/${tahun}/${bulan}`;

      // Create items HTML list
      let itemsListHtml = "";
      itemsList.forEach((item, index) => {
        itemsListHtml += `
          <tr>
            <td style="text-align: center">${index + 1}</td>
            <td style="text-align: center">${item.kode_obat}</td>
            <td style="text-align: left">${item.nama_obat}</td>
            <td style="text-align: center">${item.jumlah}</td>
            <td style="text-align: right">${formatCurrency(item.harga_satuan)}</td>
            <td style="text-align: right">${formatCurrency(item.subtotal)}</td>
          </tr>
        `;
      });

      const tanggalInvoice = moment().format("DD MMMM YYYY");
      const tanggalPembelian = moment(formData.tanggal_pembelian).format("DD MMMM YYYY");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice Pembelian Obat</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px; border: 1px solid #000; }
            h2 { text-align: center; padding-top: 20px; }
            .center { text-align: center; }
            .header { margin-top: -15px; text-align: center; }
            .signature-table { width: 100%; margin-top: 50px; border: none; }
            .signature-table th, .signature-table td { border: none; text-align: center; }
            .totals-table { width: 40%; margin-left: auto; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div style="text-align: center;">
            <h2>INVOICE PEMBELIAN OBAT</h2>
            <p>Nomor: ${nomorInvoice}</p>
          </div>
          
          <table style="width: 100%; border: none; margin-bottom: 20px;">
            <tr>
              <td style="border: none; width: 50%; vertical-align: top;">
                <strong>Apotek Medika</strong><br/>
                Jl. Kesehatan No. 123<br/>
                Telp: (031) 1234567<br/>
                Email: apotek@medika.com
              </td>
              <td style="border: none; width: 50%; vertical-align: top; text-align: right;">
                <strong>Kepada:</strong><br/>
                ${formData.nama_pembeli}<br/>
                Tanggal: ${tanggalInvoice}<br/>
                Metode Pembayaran: ${formData.metode_pembayaran}
              </td>
            </tr>
          </table>
          
          <table>
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th>No</th>
                <th>Kode</th>
                <th>Nama Obat</th>
                <th>Jumlah</th>
                <th>Harga Satuan</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>
          
          <table class="totals-table">
            <tr>
              <td style="text-align: right; font-weight: bold; border: none;">Total:</td>
              <td style="text-align: right; border: 1px solid #000;">${formatCurrency(totalAmount)}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">
            <strong>Catatan:</strong><br/>
            ${formData.catatan || "-"}
          </p>
          
          <table class="signature-table">
            <tr>
              <th>Dibuat Oleh</th>
              <th>Diterima Oleh</th>
            </tr>
            <tr>
              <td style="height: 70px;"></td>
              <td></td>
            </tr>
            <tr>
              <td>Petugas Apotek</td>
              <td>${formData.nama_pembeli}</td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      return { uri, nomorInvoice };
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.show({
        title: "Error",
        description: "Gagal membuat invoice",
        status: "error",
        duration: 3000,
      });
      return null;
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);

      // Validate required fields
      if (!formData.tanggal_pembelian) {
        toast.show({
          title: "Error",
          description: "Tanggal pembelian wajib diisi",
          status: "error",
          duration: 3000,
        });
        setSubmitting(false);
        return;
      }

      // Generate PDF
      const result = await generatePDF();

      if (!result) {
        setSubmitting(false);
        return;
      }

      const { uri, nomorInvoice } = result;

      // Upload the PDF to Firebase Storage
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const pdfFileName = `invoices/Invoice_${id}.pdf`;
      const storageRef = FIREBASE.storage().ref().child(pdfFileName);
      await storageRef.put(blob);
      
      // Get the download URL
      const pdfUrl = await storageRef.getDownloadURL();

      // Update Pembelian Obat data in Firebase
      const pembelianObatRef = FIREBASE.database().ref(`pembelian_obat/${id}`);
      
      const updateData = {
        nomor_invoice: nomorInvoice,
        invoice_number: nextNumber,
        tanggal_invoice: moment().format("YYYY-MM-DD"),
        file_invoice: pdfUrl,
        status: "Selesai", // Update status to Selesai
        catatan: formData.catatan || "",
        metode_pembayaran: formData.metode_pembayaran
      };

      // Update Firebase
      await pembelianObatRef.update(updateData);

      // Create a record in invoices collection
      const invoicesRef = FIREBASE.database().ref("invoices");
      const newInvoiceRef = invoicesRef.push();
      
      await newInvoiceRef.set({
        id: newInvoiceRef.key,
        pembelian_id: id,
        nomor_invoice: nomorInvoice,
        invoice_number: nextNumber,
        nama_pembeli: formData.nama_pembeli,
        tanggal_invoice: moment().format("YYYY-MM-DD"),
        tanggal_pembelian: formData.tanggal_pembelian,
        total_amount: calculateTotal(),
        file_invoice: pdfUrl,
        metode_pembayaran: formData.metode_pembayaran,
        catatan: formData.catatan || "",
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss")
      });

      // Update stock in Obat
      await updateStockObat();

      toast.show({
        title: "Sukses",
        description: "Invoice berhasil dibuat",
        status: "success",
        duration: 3000,
      });

      // Navigate back to list
      navigation.navigate("AdminObat");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.show({
        title: "Error",
        description: `Gagal menyimpan: ${error.message}`,
        status: "error",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStockObat = async () => {
    if (!pembelianObat || !pembelianObat.items || !Array.isArray(pembelianObat.items)) {
      console.log("No items to update stock for");
      return;
    }

    try {
      for (const item of pembelianObat.items) {
        const obatId = item.id;
        const jumlahDibeli = parseInt(item.jumlah) || 0;

        if (!obatId || jumlahDibeli <= 0) continue;

        // Get the current obat data
        const obatRef = FIREBASE.database().ref(`obat/${obatId}`);
        const snapshot = await obatRef.once("value");
        const obatData = snapshot.val();

        if (obatData) {
          const currentStock = parseInt(obatData.jumlah_obat) || 0;
          const newStock = Math.max(0, currentStock - jumlahDibeli);

          // Update stock
          await obatRef.update({
            jumlah_obat: newStock
          });
        }
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      throw new Error("Gagal memperbarui stok obat");
    }
  };

  if (loading) {
    return (
      <>
        <Header title={"Generate Invoice"} />
        <Center flex={1} bg="white">
          <Spinner size="lg" color={primaryColor} />
          <Text mt={4} color="gray.500">
            Memuat data...
          </Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Header title={"Generate Invoice"} />
      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          bg="gray.50"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <VStack space={4} width="100%" p={4}>
            {/* Nomor Invoice Card */}
            <Box bg="white" p={4} rounded="lg" shadow={1}>
              <HStack alignItems="center" space={2} mb={3}>
                <Icon
                  as={MaterialIcons}
                  name="receipt"
                  color={primaryColor}
                  size="sm"
                />
                <Heading size="sm" color={primaryColor}>
                  Nomor Invoice
                </Heading>
              </HStack>
              <Divider mb={3} />

              <HStack space={2} flexWrap="wrap">
                <FormControl flex={1} minW="100px" mb={2}>
                  <FormControl.Label
                    _text={{ fontSize: "xs", fontWeight: "bold" }}
                  >
                    Nomor
                  </FormControl.Label>
                  <Input
                    value={nextNumber}
                    isReadOnly
                    bg="gray.100"
                    textAlign="center"
                    borderColor="gray.300"
                    fontSize="md"
                    height={10}
                  />
                </FormControl>

                <FormControl flex={1} minW="100px" mb={2}>
                  <FormControl.Label
                    _text={{ fontSize: "xs", fontWeight: "bold" }}
                  >
                    Pembuat
                  </FormControl.Label>
                  <Input
                    value="APOTEK"
                    isReadOnly
                    bg="gray.100"
                    textAlign="center"
                    borderColor="gray.300"
                    fontSize="md"
                    height={10}
                  />
                </FormControl>

                <FormControl flex={1} minW="50px" mb={2}>
                  <FormControl.Label
                    _text={{ fontSize: "xs", fontWeight: "bold" }}
                  >
                    Bulan
                  </FormControl.Label>
                  <Input
                    value={moment().format("MM")}
                    isReadOnly
                    bg="gray.100"
                    textAlign="center"
                    borderColor="gray.300"
                    fontSize="md"
                    height={10}
                  />
                </FormControl>

                <FormControl flex={1} minW="80px" mb={2}>
                  <FormControl.Label
                    _text={{ fontSize: "xs", fontWeight: "bold" }}
                  >
                    Tahun
                  </FormControl.Label>
                  <Input
                    value={moment().format("YYYY")}
                    isReadOnly
                    bg="gray.100"
                    textAlign="center"
                    borderColor="gray.300"
                    fontSize="md"
                    height={10}
                  />
                </FormControl>
              </HStack>
            </Box>

            {/* Informasi Pembelian Card */}
            <Box bg="white" p={4} rounded="lg" shadow={1}>
              <HStack alignItems="center" space={2} mb={3}>
                <Icon
                  as={MaterialIcons}
                  name="info-outline"
                  color={primaryColor}
                  size="sm"
                />
                <Heading size="sm" color={primaryColor}>
                  Informasi Pembelian
                </Heading>
              </HStack>
              <Divider mb={3} />

              <FormControl mb={4}>
                <FormControl.Label _text={{ fontSize: "xs", fontWeight: "bold" }}>
                  Nama Pembeli
                </FormControl.Label>
                <Input
                  value={formData.nama_pembeli}
                  onChangeText={(text) => handleInputChange("nama_pembeli", text)}
                  borderColor="gray.300"
                  fontSize="md"
                  height={10}
                  _focus={{ borderColor: primaryColor, bg: "white" }}
                />
              </FormControl>

              <FormControl mb={4}>
                <FormControl.Label _text={{ fontSize: "xs", fontWeight: "bold" }}>
                  Tanggal Pembelian
                </FormControl.Label>
                <Input
                  type="date"
                  value={formData.tanggal_pembelian}
                  onChange={(e) =>
                    handleInputChange("tanggal_pembelian", e.target.value)
                  }
                  borderColor="gray.300"
                  fontSize="md"
                  height={10}
                  _focus={{ borderColor: primaryColor, bg: "white" }}
                />
              </FormControl>

              <FormControl mb={4}>
                <FormControl.Label _text={{ fontSize: "xs", fontWeight: "bold" }}>
                  Metode Pembayaran
                </FormControl.Label>
                <HStack space={2}>
                  <Pressable 
                    flex={1} 
                    onPress={() => handleInputChange("metode_pembayaran", "Tunai")}
                    bg={formData.metode_pembayaran === "Tunai" ? "emerald.100" : "white"}
                    borderWidth={1}
                    borderColor={formData.metode_pembayaran === "Tunai" ? "emerald.500" : "gray.300"}
                    rounded="md"
                    p={2}
                  >
                    <Center>
                      <Icon as={MaterialIcons} name="attach-money" color={formData.metode_pembayaran === "Tunai" ? "emerald.500" : "gray.500"} size="sm" />
                      <Text color={formData.metode_pembayaran === "Tunai" ? "emerald.500" : "gray.500"} fontWeight={formData.metode_pembayaran === "Tunai" ? "bold" : "normal"}>
                        Tunai
                      </Text>
                    </Center>
                  </Pressable>
                  
                  <Pressable 
                    flex={1}
                    onPress={() => handleInputChange("metode_pembayaran", "Transfer")}
                    bg={formData.metode_pembayaran === "Transfer" ? "emerald.100" : "white"}
                    borderWidth={1}
                    borderColor={formData.metode_pembayaran === "Transfer" ? "emerald.500" : "gray.300"}
                    rounded="md"
                    p={2}
                  >
                    <Center>
                      <Icon as={MaterialIcons} name="account-balance" color={formData.metode_pembayaran === "Transfer" ? "emerald.500" : "gray.500"} size="sm" />
                      <Text color={formData.metode_pembayaran === "Transfer" ? "emerald.500" : "gray.500"} fontWeight={formData.metode_pembayaran === "Transfer" ? "bold" : "normal"}>
                        Transfer
                      </Text>
                    </Center>
                  </Pressable>
                </HStack>
              </FormControl>

              <FormControl>
                <FormControl.Label _text={{ fontSize: "xs", fontWeight: "bold" }}>
                  Catatan
                </FormControl.Label>
                <TextArea
                  value={formData.catatan}
                  onChangeText={(text) => handleInputChange("catatan", text)}
                  borderColor="gray.300"
                  h={20}
                  placeholder="Masukkan catatan jika ada"
                  _focus={{ borderColor: primaryColor, bg: "white" }}
                />
              </FormControl>
            </Box>

            {/* Daftar Obat Card */}
            <Box bg="white" p={4} rounded="lg" shadow={1}>
              <HStack alignItems="center" space={2} mb={3}>
                <Icon
                  as={MaterialIcons}
                  name="medical-services"
                  color={primaryColor}
                  size="sm"
                />
                <Heading size="sm" color={primaryColor}>
                  Daftar Obat
                </Heading>
                <Badge colorScheme="green" rounded="full" variant="subtle">
                  {pembelianObat?.items?.length || 0}
                </Badge>
              </HStack>
              <Divider mb={3} />

              {pembelianObat?.items && pembelianObat.items.length > 0 ? (
                <VStack space={2} divider={<Divider />}>
                  {pembelianObat.items.map((item, index) => (
                    <Pressable key={index} _pressed={{ opacity: 0.8 }}>
                      <HStack
                        justifyContent="space-between"
                        alignItems="center"
                        p={2}
                      >
                        <HStack space={2} alignItems="center" flex={3}>
                          <Center
                            bg="emerald.100"
                            p={2}
                            rounded="full"
                            width={8}
                            height={8}
                          >
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              color="emerald.700"
                            >
                              {index + 1}
                            </Text>
                          </Center>
                          <VStack space={0}>
                            <Text
                              fontWeight="bold"
                              isTruncated
                              maxW="200"
                              fontSize="md"
                            >
                              {item.nama_obat}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              Kode: {item.kode_obat || "-"}
                            </Text>
                          </VStack>
                        </HStack>
                        <VStack alignItems="flex-end">
                          <Text fontWeight="bold">
                            {formatCurrency(parseFloat(item.harga_satuan) || 0)}
                          </Text>
                          <Badge colorScheme="green" rounded="full">
                            {item.jumlah} pcs
                          </Badge>
                        </VStack>
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>
              ) : (
                <Center p={4}>
                  <Icon
                    as={MaterialIcons}
                    name="medical-services"
                    size="lg"
                    color="gray.300"
                  />
                  <Text color="gray.400" mt={2}>
                    Tidak ada obat
                  </Text>
                </Center>
              )}

              {/* Total */}
              {pembelianObat?.items && pembelianObat.items.length > 0 && (
                <HStack justifyContent="flex-end" mt={4} bg="gray.50" p={3} rounded="md">
                  <Text fontWeight="bold" color="gray.600">Total:</Text>
                  <Text fontWeight="bold" ml={2} color="emerald.600">
                    {formatCurrency(calculateTotal())}
                  </Text>
                </HStack>
              )}
            </Box>

            {/* Action Button */}
            <Box mt={2} mb={6}>
              <Button
                bg={primaryColor}
                leftIcon={<Icon as={Feather} name="save" size="sm" />}
                onPress={handleSave}
                isLoading={submitting}
                isLoadingText="Menyimpan..."
                shadow={2}
                height={12}
                _text={{ fontWeight: "bold" }}
              >
                Simpan & Generate Invoice
              </Button>
            </Box>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default AdminInvoice;