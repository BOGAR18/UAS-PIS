import React, { useState, useEffect } from "react";
import {
  Box,
  Input,
  FormControl,
  Button,
  VStack,
  Text,
  Select,
  Heading,
  Icon,
  ScrollView,
  Modal,
  Divider,
  useToast,
  IconButton,
  HStack,
  Spinner,
  Stack,
} from "native-base";
import { useNavigation, useRoute } from "@react-navigation/native";
import FIREBASE from "../actions/config/FIREBASE";
import { MaterialIcons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../components/header";
import { updateUserData } from "../actions/AuthAction";

const FormInput = ({ label, icon, isPassword, helperText, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormControl mb={2}>
      <FormControl.Label 
        _text={{ 
          fontSize: "sm", 
          fontWeight: "medium",
          color: "gray.700" 
        }}
      >
        {label}
      </FormControl.Label>
      <Input
        {...props}
        InputLeftElement={
          <Icon as={Feather} name={icon} size={5} ml={4} color="blue.500" />
        }
        InputRightElement={
          isPassword ? (
            <IconButton
              icon={
                <Icon
                  as={MaterialIcons}
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={5}
                  mr={2}
                  color="gray.500"
                />
              }
              onPress={() => setShowPassword(!showPassword)}
            />
          ) : null
        }
        secureTextEntry={isPassword && !showPassword}
        fontSize="sm"
        bg="white"
        borderRadius="xl"
        py={3.5}
        px={4}
        borderWidth={1}
        borderColor="gray.300"
        _focus={{
          bg: "white",
          borderColor: "blue.500",
          borderWidth: 1.5,
        }}
        shadow={1}
      />
      {helperText && (
        <FormControl.HelperText
          _text={{ fontSize: "xs", color: "gray.500" }}
        >
          {helperText}
        </FormControl.HelperText>
      )}
    </FormControl>
  );
};

const AdminEditAkun = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [instansi, setInstansi] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userStatus, setUserStatus] = useState("");
  const [processingUpdate, setProcessingUpdate] = useState(false);
  const [updateResults, setUpdateResults] = useState({
    dataUpdated: false,
    passwordUpdated: false,
  });

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (userId) {
          // Fetch user data directly from Firebase
          const userRef = FIREBASE.database().ref(`users/${userId}`);
          const snapshot = await userRef.once("value");
          const userData = snapshot.val();

          if (userData) {
            setNama(userData.name || "");
            setJenisKelamin(userData.jenis_kelamin || "");
            setNoTelepon(userData.nomorhp || "");
            setAlamat(userData.alamat || "");
            setInstansi(userData.instansi || "");
            setUserStatus(userData.status || "");
            setEmail(userData.email || "");
          } else {
            toast.show({
              description: "Data pengguna tidak ditemukan",
              placement: "top",
              bg: "red.500",
            });
            navigation.goBack();
          }
        }
      } catch (error) {
        toast.show({
          description: "Gagal memuat data pengguna: " + error.message,
          placement: "top",
          bg: "red.500",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSubmit = async () => {
    // Basic validation
    if (!nama || !noTelepon) {
      toast.show({
        description: "Nama dan nomor telepon harus diisi",
        placement: "top",
        bg: "red.500",
      });
      return;
    }

    // Validate password if provided
    if (password) {
      if (password.length < 6) {
        toast.show({
          description: "Password harus minimal 6 karakter",
          placement: "top",
          bg: "red.500",
        });
        return;
      }
      if (password !== confirmPassword) {
        toast.show({
          description: "Password tidak cocok",
          placement: "top",
          bg: "red.500",
        });
        return;
      }
    }

    // Proceed with update
    processUpdate();
  };

  const processUpdate = async () => {
    setProcessingUpdate(true);
    setUpdateResults({
      dataUpdated: false,
      passwordUpdated: false,
    });
  
    try {
      // Prepare update data
      let updateData = {
        name: nama,
        nomorhp: noTelepon,
      };
  
      if (userStatus === "Pegawai") {
        updateData.jenis_kelamin = jenisKelamin;
        updateData.alamat = alamat;
        updateData.instansi = instansi;
      } else if (userStatus === "UP3") {
        updateData.alamat = alamat;
      }
  
      // Update basic user data
      await updateUserData(userId, updateData);
      setUpdateResults(prev => ({ ...prev, dataUpdated: true }));
  
      // Only update password if provided
      if (password) {
        // Update password in database
        const userRef = FIREBASE.database().ref(`users/${userId}`);
        await userRef.update({
          password: password,
          passwordUpdated: true,
          passwordUpdateTime: new Date().toISOString()
        });
        
        setUpdateResults(prev => ({ ...prev, passwordUpdated: true }));
      }
  
      // Show success message
      setShowModal(true);
    } catch (error) {
      console.error("Update error:", error);
      
      toast.show({
        description: error.message || "Gagal memperbarui akun",
        placement: "top",
        bg: "red.500",
      });
    } finally {
      setProcessingUpdate(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="gray.500">
          Memuat data pengguna...
        </Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="gray.50">
      <Header title={"UID Jatim"} withBack={true} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box safeArea p={4} pb={8}>
          <Box mb={4} alignItems="center">
            <HStack 
              space={2} 
              bg="blue.500" 
              p={3} 
              borderRadius="full" 
              mb={3}
              shadow={2}
            >
              <Icon
                as={MaterialIcons}
                name={userStatus === "UP3" ? "business" : "person"}
                size={6}
                color="white"
              />
            </HStack>
            
            <Heading size="lg" color="gray.800" mb={1}>
              Edit Akun {userStatus}
            </Heading>
          </Box>

          <Box
            w="100%"
            p={6}
            bg="white"
            shadow={3}
            rounded="2xl"
            borderWidth={1}
            borderColor="gray.100"
            mb={6}
          >
            <VStack space={2}>
              <Heading size="sm" color="blue.600" mb={2}>
                <Icon as={Feather} name="user" mr={1} />
                Informasi Pribadi
              </Heading>
              <Divider mb={4} />
              
              <FormInput
                label="Nama Lengkap"
                icon="user"
                value={nama}
                onChangeText={setNama}
                placeholder="Masukkan nama lengkap"
              />

              {userStatus === "Pegawai" && (
                <FormControl mb={4}>
                  <FormControl.Label
                    _text={{ fontSize: "sm", fontWeight: "medium", color: "gray.700" }}
                  >
                    Jenis Kelamin
                  </FormControl.Label>
                  <Select
                    selectedValue={jenisKelamin}
                    onValueChange={setJenisKelamin}
                    placeholder="Pilih Jenis Kelamin"
                    fontSize="sm"
                    bg="white"
                    borderRadius="xl"
                    py={3.5}
                    px={4}
                    borderWidth={1}
                    borderColor="gray.300"
                    _selectedItem={{
                      bg: "blue.100",
                      endIcon: (
                        <Icon as={MaterialIcons} name="check" size={5} />
                      ),
                    }}
                    shadow={1}
                    leftIcon={
                      <Icon
                        as={Feather}
                        name="users"
                        size={5}
                        ml={2}
                        color="blue.500"
                      />
                    }
                  >
                    <Select.Item label="Laki-laki" value="Laki-laki" />
                    <Select.Item label="Perempuan" value="Perempuan" />
                  </Select>
                </FormControl>
              )}

              <FormInput
                label="Nomor Telepon"
                icon="phone"
                value={noTelepon}
                onChangeText={setNoTelepon}
                placeholder="Masukkan nomor telepon"
                keyboardType="phone-pad"
              />

              {userStatus === "UP3" ? (
                <FormControl mb={4}>
                  <FormControl.Label
                    _text={{ fontSize: "sm", fontWeight: "medium", color: "gray.700" }}
                  >
                    Alamat
                  </FormControl.Label>
                  <Select
                    selectedValue={alamat}
                    minWidth="200"
                    accessibilityLabel="Pilih Jarak Alamat"
                    placeholder="Pilih Jarak Alamat"
                    onValueChange={(itemValue) => setAlamat(itemValue)}
                    fontSize="sm"
                    bg="white"
                    borderRadius="xl"
                    py={3.5}
                    px={4}
                    borderWidth={1}
                    borderColor="gray.300"
                    shadow={1}
                    _selectedItem={{
                      bg: "blue.100",
                      endIcon: (
                        <Icon as={MaterialIcons} name="check" size={5} />
                      ),
                    }}
                    leftIcon={
                      <Icon
                        as={Feather}
                        name="map-pin"
                        size={5}
                        ml={2}
                        color="blue.500"
                      />
                    }
                  >
                    <Select.Item
                      label="Kurang dari 100km"
                      value="kurang_100km"
                    />
                    <Select.Item label="Lebih dari 100km" value="lebih_100km" />
                  </Select>
                </FormControl>
              ) : (
                <FormInput
                  label="Alamat"
                  icon="map-pin"
                  value={alamat}
                  onChangeText={setAlamat}
                  placeholder="Masukkan alamat lengkap"
                />
              )}

              {userStatus === "Pegawai" && (
                <FormInput
                  label="Instansi"
                  icon="briefcase"
                  value={instansi}
                  onChangeText={setInstansi}
                  placeholder="Masukkan nama instansi"
                />
              )}
            </VStack>
          </Box>

          <Box
            w="100%"
            p={6}
            bg="white"
            shadow={3}
            rounded="2xl"
            borderWidth={1}
            borderColor="gray.100"
            mb={6}
          >
            <VStack space={2}>
              <Heading size="sm" color="blue.600" mb={2}>
                <Icon as={MaterialIcons} name="security" mr={1} />
                Informasi Akun & Keamanan
              </Heading>
              <Divider mb={4} />
              <Box
                bg="blue.50"
                p={3}
                borderRadius="md"
                borderWidth={1}
                borderColor="blue.100"
                mb={2}
              >
                <HStack space={3} alignItems="center">
                  <Icon as={MaterialIcons} name="info" color="blue.500" size={5} />
                  <Text fontSize="sm" color="blue.700" flex={1}>
                    Tidak wajib merubah password 
                  </Text>
                </HStack>
              </Box>

              <FormInput
                label="Email"
                icon="mail"
                value={email}
                placeholder="Email pengguna"
                isDisabled={true}
                isReadOnly={true}
              />

              <FormInput
                label="Password Baru"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password baru"
                isPassword
                helperText="Biarkan kosong jika tidak ingin mengubah password"
              />
              
              {password && (
                <FormInput
                  label="Konfirmasi Password"
                  icon="lock"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Masukkan kembali password baru"
                  isPassword
                />
              )}
            </VStack>
          </Box>

          <HStack space={4} justifyContent="space-between" mt={2} mb={8}>
            <Button
              flex={1}
              onPress={() => navigation.goBack()}
              bg="gray.200"
              _pressed={{ bg: "gray.300" }}
              py={3.5}
              _text={{ fontSize: "sm", color: "gray.700" }}
              borderRadius="xl"
              leftIcon={<Icon as={MaterialIcons} name="arrow-back" size="sm" color="gray.700" />}
              isDisabled={processingUpdate}
              shadow={2}
            >
              Kembali
            </Button>

            <Button
              flex={1}
              onPress={handleSubmit}
              bg="blue.600"
              _pressed={{ bg: "blue.700" }}
              py={3.5}
              _text={{ fontSize: "sm", fontWeight: "bold" }}
              borderRadius="xl"
              shadow={3}
              leftIcon={<Icon as={MaterialIcons} name="save" size="sm" />}
              isLoading={processingUpdate}
              isLoadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </HStack>
        </Box>
      </ScrollView>

      {/* Success Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Modal.Content maxWidth="400px" borderRadius="2xl" overflow="hidden">
          <Box bg="green.500" p={4}>
            <HStack alignItems="center" space={2}>
              <Icon
                as={MaterialIcons}
                name="check-circle"
                size={6}
                color="white"
              />
              <Text color="white" fontSize="lg" fontWeight="bold">
                Sukses
              </Text>
            </HStack>
          </Box>
          <Modal.Body py={5} px={5}>
            <VStack space={4} alignItems="center">
              <Icon
                as={MaterialCommunityIcons}
                name="account-check"
                size={16}
                color="green.500"
              />
            
              <Text fontSize="lg" fontWeight="bold" textAlign="center">
                Akun {userStatus.toLowerCase()} berhasil diperbarui!
              </Text>

              {updateResults.dataUpdated && (
                <HStack space={2} bg="blue.50" p={3} borderRadius="lg" w="full" alignItems="center">
                  <Icon as={MaterialIcons} name="person" size={5} color="blue.500" />
                  <Text fontSize="sm" color="blue.700" flex={1}>
                    Data pengguna berhasil diperbarui
                  </Text>
                </HStack>
              )}

              {updateResults.passwordUpdated && (
                <HStack space={2} bg="blue.50" p={3} borderRadius="lg" w="full" alignItems="center">
                  <Icon as={MaterialIcons} name="lock" size={5} color="blue.500" />
                  <Text fontSize="sm" color="blue.700" flex={1}>
                    Password berhasil diperbarui
                  </Text>
                </HStack>
              )}

              {updateResults.passwordUpdated && (
                <Box bg="gray.100" p={3} borderRadius="lg" w="full">
                  <Text fontSize="xs" color="gray.600" textAlign="center">
                    Pengguna perlu login ulang menggunakan password baru yang telah diupdate.
                  </Text>
                </Box>
              )}

              <Button
                w="full"
                bg="blue.600"
                _pressed={{ bg: "blue.700" }}
                onPress={() => {
                  setShowModal(false);
                  navigation.navigate("Akun");
                }}
                borderRadius="xl"
                py={3}
                shadow={2}
                leftIcon={<Icon as={MaterialIcons} name="list" size="sm" />}
              >
                Kembali ke Daftar Akun
              </Button>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

export default AdminEditAkun;