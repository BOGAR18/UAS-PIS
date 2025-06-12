import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ScrollView,
  Icon,
  Divider,
  StatusBar,
  Center,
  Spinner,
  useToast,
  Modal,
  FlatList,
  Pressable,
  Badge,
  Alert as NativeBaseAlert,
  CloseIcon,
} from "native-base";
import {
  MaterialIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import moment from "moment";
import "moment/locale/id";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { Platform, PermissionsAndroid, Alert, Share, Linking } from "react-native";
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import Header from "../components/header";

const Invoice = ({ navigation, route }) => {
  const { pembelianId, invoiceNumber } = route.params;
  const [invoiceData, setInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const toast = useToast();

  // Colors
  const primaryColor = "#3f37c9";
  const bgColor = "white";

  moment.locale("id");

  // Format currency
  const formatCurrency = (amount) => {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return moment(dateString).format("DD MMMM YYYY");
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "-";
    return moment(dateString).format("HH:mm");
  };

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const database = getDatabase();
        const invoiceRef = ref(database, `pembelian_obat/${pembelianId}`);
        
        onValue(invoiceRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            let items = [];
            if (data.obat_items) {
              if (Array.isArray(data.obat_items)) {
                items = data.obat_items;
              } else {
                items = Object.values(data.obat_items);
              }
            }
            
            setInvoiceData({
              ...data,
              items: items,
              id: pembelianId,
            });
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.show({
          title: "Error",
          description: "Gagal memuat data invoice",
          status: "error",
        });
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [pembelianId]);

  // Generate HTML for PDF
  const generateInvoiceHTML = () => {
    if (!invoiceData) return '';

    const itemsHTML = invoiceData.items.map((item) => {
      const quantity = item.quantity || item.jumlah || 0;
      const price = item.harga || 0;
      const subtotal = quantity * price;
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            ${item.nama_obat || item.nama || "Unknown"}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${quantity}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${formatCurrency(price)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${formatCurrency(subtotal)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #3f37c9;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #3f37c9;
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 14px;
              color: #6b7280;
            }
            .invoice-badge {
              display: inline-block;
              background: #fbbf24;
              color: #000;
              padding: 5px 15px;
              border-radius: 4px;
              font-weight: bold;
              margin-top: 10px;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .customer-info {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-weight: bold;
              border-bottom: 2px solid #e5e7eb;
            }
            .total-row {
              background: #f9fafb;
              font-size: 18px;
              font-weight: bold;
              color: #3f37c9;
            }
            .payment-info {
              background: #f0fdf4;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
              border: 1px solid #86efac;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              body {
                margin: 0;
                padding: 10px;
              }
              .invoice-container {
                border: none;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-name">APOTEK SEHAT SEJAHTERA</div>
              <div class="company-info">
                Jl. Kesehatan No. 123, Jakarta<br>
                Telp: (021) 123-4567 | Email: info@apoteksehat.com
              </div>
              <div class="invoice-badge">INVOICE: ${invoiceNumber}</div>
            </div>

            <div class="invoice-details">
              <div>
                <strong>Tanggal:</strong> ${formatDate(invoiceData.tanggal_pembelian)}<br>
                <strong>Jam:</strong> ${formatTime(invoiceData.tanggal_pembelian)}
              </div>
              <div style="text-align: right;">
                <strong>Status:</strong> ${invoiceData.status_pembayaran || "Belum Dibayar"}
              </div>
            </div>

            <div class="customer-info">
              <h3 style="margin-top: 0;">Informasi Customer</h3>
              <table>
                <tr>
                  <td style="padding-right: 20px;"><strong>Nama:</strong></td>
                  <td>${invoiceData.nama_customer}</td>
                </tr>
                ${invoiceData.nomor_telepon ? `
                <tr>
                  <td style="padding-right: 20px;"><strong>Telepon:</strong></td>
                  <td>${invoiceData.nomor_telepon}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding-right: 20px;"><strong>Metode Pembayaran:</strong></td>
                  <td>${invoiceData.metode_pembayaran}</td>
                </tr>
              </table>
            </div>

            <h3>Detail Pembelian</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Nama Obat</th>
                  <th style="width: 15%; text-align: center;">Qty</th>
                  <th style="width: 20%; text-align: right;">Harga</th>
                  <th style="width: 25%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr class="total-row">
                  <td colspan="3" style="padding: 12px; text-align: right;">TOTAL</td>
                  <td style="padding: 12px; text-align: right;">${formatCurrency(invoiceData.total_harga)}</td>
                </tr>
              </tbody>
            </table>

            ${invoiceData.resep_required ? `
            <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #a5b4fc;">
              <strong>Note:</strong> Pembelian ini memerlukan resep dokter
            </div>
            ` : ''}

            ${invoiceData.tanggal_pembayaran ? `
            <div class="payment-info">
              <strong>✓ Pembayaran Diterima</strong><br>
              Tanggal: ${formatDate(invoiceData.tanggal_pembayaran)}
            </div>
            ` : ''}

            <div class="footer">
              <p><strong>Terima Kasih atas pembelian Anda</strong></p>
              <p>Semoga Lekas Sembuh</p>
              <p style="font-size: 12px; margin-top: 20px;">
                Invoice ini sah dan dikeluarkan oleh sistem<br>
                Apotek Sehat Sejahtera © ${new Date().getFullYear()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Print to PDF using expo-print
  const printToPDF = async () => {
    if (!invoiceData) {
      toast.show({
        title: "Error",
        description: "Data invoice tidak tersedia",
        status: "error",
      });
      return;
    }

    setIsPrinting(true);
    
    try {
      const html = generateInvoiceHTML();
      
      // Print to PDF
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      // Share the PDF
      await shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${invoiceNumber}`
      });
      
      toast.show({
        title: "Berhasil",
        description: "Invoice berhasil dibuat",
        status: "success",
      });
      
    } catch (error) {
      console.error('Print error:', error);
      toast.show({
        title: "Error",
        description: "Gagal membuat invoice",
        status: "error",
      });
    } finally {
      setIsPrinting(false);
      setShowPrintOptions(false);
    }
  };

  // Direct print using expo-print
  const directPrint = async () => {
    if (!invoiceData) {
      toast.show({
        title: "Error",
        description: "Data invoice tidak tersedia",
        status: "error",
      });
      return;
    }

    setIsPrinting(true);
    
    try {
      const html = generateInvoiceHTML();
      
      // Direct print
      await Print.printAsync({ 
        html,
        printerUrl: null, // Will use default printer
      });
      
      toast.show({
        title: "Berhasil",
        description: "Invoice dikirim ke printer",
        status: "success",
      });
      
    } catch (error) {
      console.error('Print error:', error);
      toast.show({
        title: "Error",
        description: "Gagal mencetak invoice",
        status: "error",
      });
    } finally {
      setIsPrinting(false);
      setShowPrintOptions(false);
    }
  };

  // Share invoice as text
  const shareInvoice = async () => {
    if (!invoiceData) return;

    const invoiceText = `
INVOICE: ${invoiceNumber}
========================
APOTEK SEHAT SEJAHTERA
Jl. Kesehatan No. 123, Jakarta
Telp: (021) 123-4567

Tanggal: ${formatDate(invoiceData.tanggal_pembelian)}
Customer: ${invoiceData.nama_customer}
${invoiceData.nomor_telepon ? `Telp: ${invoiceData.nomor_telepon}` : ''}

DETAIL PEMBELIAN:
${invoiceData.items.map(item => {
  const qty = item.quantity || item.jumlah || 0;
  const price = item.harga || 0;
  return `- ${item.nama_obat || item.nama} (${qty}x) = ${formatCurrency(qty * price)}`;
}).join('\n')}

TOTAL: ${formatCurrency(invoiceData.total_harga)}
Metode: ${invoiceData.metode_pembayaran}
Status: ${invoiceData.status_pembayaran || "Belum Dibayar"}

Terima kasih atas pembelian Anda
Semoga Lekas Sembuh
========================`;

    try {
      await Share.share({
        message: invoiceText,
        title: `Invoice ${invoiceNumber}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isLoading) {
    return (
      <Box flex={1} bg={bgColor}>
        <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
        <Header 
          title="Invoice" 
          bg={bgColor} 
          color={primaryColor}
          onBack={() => navigation.goBack()}
        />
        <Center flex={1}>
          <Spinner size="lg" color={primaryColor} />
          <Text mt={4} color="gray.600">Loading invoice...</Text>
        </Center>
      </Box>
    );
  }

  if (!invoiceData) {
    return (
      <Box flex={1} bg={bgColor}>
        <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
        <Header 
          title="Invoice" 
          bg={bgColor} 
          color={primaryColor}
          onBack={() => navigation.goBack()}
          
        />
        <Center flex={1}>
          <Icon as={MaterialIcons} name="error-outline" size="6xl" color="red.500" />
          <Text mt={4} fontSize="lg" color="gray.700">Invoice tidak ditemukan</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      <Header 
        title="Invoice" 
        bg={bgColor} 
        color={primaryColor}
        onBack={() => navigation.goBack()}
        withBack={true}
      />

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        {/* Invoice Container */}
        <Box bg={bgColor} mx={4} my={4} rounded="xl" shadow={3} overflow="hidden">
          {/* Invoice Header */}
          <Box bg={primaryColor} px={6} py={4}>
            <VStack space={2} alignItems="center">
              <Icon as={FontAwesome5} name="file-invoice" size="xl" color="white" />
              <Text color="white" fontSize="xl" fontWeight="bold">
                INVOICE
              </Text>
              <Badge colorScheme="yellow" variant="solid" rounded="md">
                {invoiceNumber}
              </Badge>
            </VStack>
          </Box>

          {/* Business Info */}
          <VStack space={4} p={6}>
            <VStack space={2} alignItems="center">
              <Text fontSize="lg" fontWeight="bold" color={primaryColor}>
                APOTEK SEHAT SEJAHTERA
              </Text>
              <Text fontSize="sm" color="gray.600">
                Jl. Kesehatan No. 123, Jakarta
              </Text>
              <Text fontSize="sm" color="gray.600">
                Telp: (021) 123-4567 | Email: info@apoteksehat.com
              </Text>
            </VStack>

            <Divider />

            {/* Invoice Details */}
            <HStack justifyContent="space-between">
              <VStack space={2}>
                <Text fontSize="xs" color="gray.500">Tanggal Invoice</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {formatDate(invoiceData.tanggal_pembelian)}
                </Text>
              </VStack>
              <VStack space={2} alignItems="flex-end">
                <Text fontSize="xs" color="gray.500">Status Pembayaran</Text>
                <Badge 
                  colorScheme={invoiceData.status_pembayaran === "Sudah Dibayar" ? "success" : "warning"}
                  variant="solid"
                >
                  {invoiceData.status_pembayaran || "Belum Dibayar"}
                </Badge>
              </VStack>
            </HStack>

            {/* Customer Info */}
            <Box bg="gray.50" p={4} rounded="lg">
              <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                Informasi Customer
              </Text>
              <VStack space={1}>
                <HStack>
                  <Text fontSize="sm" color="gray.600" flex={1}>Nama:</Text>
                  <Text fontSize="sm" fontWeight="medium" flex={2}>
                    {invoiceData.nama_customer}
                  </Text>
                </HStack>
                {invoiceData.nomor_telepon && (
                  <HStack>
                    <Text fontSize="sm" color="gray.600" flex={1}>Telepon:</Text>
                    <Text fontSize="sm" fontWeight="medium" flex={2}>
                      {invoiceData.nomor_telepon}
                    </Text>
                  </HStack>
                )}
                <HStack>
                  <Text fontSize="sm" color="gray.600" flex={1}>Metode:</Text>
                  <Text fontSize="sm" fontWeight="medium" flex={2}>
                      {invoiceData.metode_pembayaran}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Items Table */}
            <VStack space={2}>
              <Text fontSize="sm" fontWeight="bold" color="gray.700">
                Detail Pembelian
              </Text>
              
              {/* Table Header */}
              <HStack bg="gray.100" p={2} rounded="md">
                <Text flex={3} fontSize="xs" fontWeight="bold" color="gray.700">
                  Nama Obat
                </Text>
                <Text flex={1} fontSize="xs" fontWeight="bold" color="gray.700" textAlign="center">
                  Qty
                </Text>
                <Text flex={2} fontSize="xs" fontWeight="bold" color="gray.700" textAlign="right">
                  Harga
                </Text>
                <Text flex={2} fontSize="xs" fontWeight="bold" color="gray.700" textAlign="right">
                  Subtotal
                </Text>
              </HStack>

              {/* Items */}
              {invoiceData.items.map((item, index) => {
                const quantity = item.quantity || item.jumlah || 0;
                const price = item.harga || 0;
                const subtotal = quantity * price;
                
                return (
                  <HStack key={index} p={2} borderBottomWidth={1} borderBottomColor="gray.200">
                    <Text flex={3} fontSize="xs" numberOfLines={2}>
                      {item.nama_obat || item.nama || "Unknown"}
                    </Text>
                    <Text flex={1} fontSize="xs" textAlign="center">
                      {quantity}
                    </Text>
                    <Text flex={2} fontSize="xs" textAlign="right">
                      {formatCurrency(price)}
                    </Text>
                    <Text flex={2} fontSize="xs" textAlign="right" fontWeight="medium">
                      {formatCurrency(subtotal)}
                    </Text>
                  </HStack>
                );
              })}

              {/* Total */}
              <HStack bg="gray.50" p={3} rounded="md" mt={2}>
                <Text flex={1} fontSize="lg" fontWeight="bold" color={primaryColor}>
                  TOTAL
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={primaryColor}>
                  {formatCurrency(invoiceData.total_harga)}
                </Text>
              </HStack>
            </VStack>

            {/* Notes */}
            {invoiceData.resep_required && (
              <Box bg="blue.50" p={3} rounded="md">
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="medical-services" color="blue.600" size="sm" />
                  <Text fontSize="sm" color="blue.700">
                    Pembelian ini memerlukan resep dokter
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Payment Info */}
            {invoiceData.tanggal_pembayaran && (
              <Box bg="green.50" p={3} rounded="md">
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="check-circle" color="green.600" size="sm" />
                  <Text fontSize="sm" color="green.700">
                    Dibayar pada: {formatDate(invoiceData.tanggal_pembayaran)}
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Action Buttons */}
        <VStack space={3} px={4} pb={6}>
          <Button
            size="lg"
            colorScheme="purple"
            leftIcon={<Icon as={MaterialIcons} name="print" size="sm" />}
            onPress={() => setShowPrintOptions(true)}
            isLoading={isPrinting}
            isLoadingText="Processing..."
          >
            Cetak Invoice
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            colorScheme="blue"
            leftIcon={<Icon as={MaterialIcons} name="share" size="sm" />}
            onPress={shareInvoice}
          >
            Bagikan Invoice
          </Button>
        </VStack>
      </ScrollView>

      {/* Print Options Modal */}
      <Modal isOpen={showPrintOptions} onClose={() => setShowPrintOptions(false)} size="lg">
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>
            <HStack space={2} alignItems="center">
              <Icon as={MaterialIcons} name="print" color={primaryColor} size="md" />
              <Text fontSize="lg" fontWeight="bold">Pilih Metode Cetak</Text>
            </HStack>
          </Modal.Header>
          
          <Modal.Body>
            <VStack space={4}>
              <NativeBaseAlert status="info" variant="subtle">
                <VStack space={2} flexShrink={1} w="100%">
                  <HStack flexShrink={1} space={2} alignItems="center">
                    <NativeBaseAlert.Icon />
                    <Text fontSize="md" fontWeight="medium" color="coolGray.800">
                      Pilih cara mencetak invoice
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="coolGray.700">
                    Anda dapat mencetak langsung atau menyimpan sebagai PDF
                  </Text>
                </VStack>
              </NativeBaseAlert>

              <VStack space={3}>
                <Pressable
                  onPress={directPrint}
                  bg="white"
                  p={4}
                  rounded="lg"
                  borderWidth={1}
                  borderColor="gray.200"
                  _pressed={{ bg: "gray.50" }}
                >
                  <HStack space={3} alignItems="center">
                    <Box bg="purple.100" p={3} rounded="full">
                      <Icon as={MaterialIcons} name="print" color="purple.600" size="md" />
                    </Box>
                    <VStack flex={1}>
                      <Text fontSize="md" fontWeight="medium">Cetak Langsung</Text>
                      <Text fontSize="sm" color="gray.600">
                        Kirim ke printer yang terhubung
                      </Text>
                    </VStack>
                    <Icon as={MaterialIcons} name="chevron-right" color="gray.400" size="md" />
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={printToPDF}
                  bg="white"
                  p={4}
                  rounded="lg"
                  borderWidth={1}
                  borderColor="gray.200"
                  _pressed={{ bg: "gray.50" }}
                >
                  <HStack space={3} alignItems="center">
                    <Box bg="blue.100" p={3} rounded="full">
                      <Icon as={MaterialIcons} name="picture-as-pdf" color="blue.600" size="md" />
                    </Box>
                    <VStack flex={1}>
                      <Text fontSize="md" fontWeight="medium">Simpan sebagai PDF</Text>
                      <Text fontSize="sm" color="gray.600">
                        Download atau bagikan file PDF
                      </Text>
                    </VStack>
                    <Icon as={MaterialIcons} name="chevron-right" color="gray.400" size="md" />
                  </HStack>
                </Pressable>
              </VStack>

              <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                Pastikan printer Anda sudah terhubung dan siap digunakan
              </Text>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

export default Invoice;