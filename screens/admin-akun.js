import React, { useEffect, useState } from "react";
import { Dimensions, SafeAreaView } from "react-native";
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Divider,
  Icon,
  FlatList,
  Input,
  Image,
  Modal,
  Pressable,
  ScrollView,
  useToast,
  AlertDialog,
  IconButton,
} from "native-base";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import FIREBASE from "../actions/config/FIREBASE";

const fetchUsers = () => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const usersRef = FIREBASE.database().ref('users');
    usersRef.on('value', (snapshot) => {
      const data = snapshot.val();
      const userList = [];
      for (let id in data) {
        userList.push({ id, ...data[id] });
      }
      setUsers(userList);
    });

    return () => usersRef.off();
  }, []);

  return users;
};

const UserCard = ({ user, onEdit, onDelete }) => (
  <Box
    bg="white"
    p={4}
    mb={4}
    borderRadius="xl"
    shadow={2}
    borderWidth={1}
    borderColor="gray.100"
  >
    <HStack justifyContent="space-between" alignItems="center">
      <VStack space={2} flex={1}>
        <HStack space={2} alignItems="center">
          <Icon
            as={MaterialIcons}
            name="account-circle"
            size={6}
            color="blue.500"
          />
          <Text fontWeight="bold" fontSize="lg" color="gray.800">
            {user.name}
          </Text>
        </HStack>
        <HStack space={2} alignItems="center">
          <Icon as={MaterialIcons} name="email" size={4} color="gray.500" />
          <Text color="gray.600" fontSize="sm">
            {user.email}
          </Text>
        </HStack>
        <HStack space={2} alignItems="center">
          <Icon as={MaterialIcons} name="phone" size={4} color="gray.500" />
          <Text color="gray.600" fontSize="sm">
            {user.nomorhp}
          </Text>
        </HStack>
        <HStack space={2} alignItems="center" mt={1}>
          <Icon as={MaterialIcons} name="badge" size={4} color="gray.500" />
          <Text color="gray.600" fontSize="sm" textTransform="capitalize">
            {user.status || "User"}
          </Text>
        </HStack>
      </VStack>
      <HStack space={2}>
        <IconButton
          onPress={onEdit}
          borderRadius="full"
          bg="blue.50"
          _pressed={{ bg: "blue.100" }}
          icon={
            <Icon
              as={MaterialIcons}
              name="edit"
              size={5}
              color="blue.500"
            />
          }
        />
        <IconButton
          onPress={onDelete}
          borderRadius="full"
          bg="red.50"
          _pressed={{ bg: "red.100" }}
          icon={
            <Icon
              as={MaterialIcons}
              name="delete"
              size={5}
              color="red.500"
            />
          }
        />
      </HStack>
    </HStack>
  </Box>
);

const AdminAkun = () => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();
  const users = fetchUsers();

  // Delete confirmation modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const cancelRef = React.useRef();

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditUser = (userId) => {
    navigation.navigate("AdminEditAkun", { userId });
  };

  const openDeleteConfirmation = (user) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await FIREBASE.database().ref(`users/${userToDelete.id}`).remove();
      
      toast.show({
        title: "Berhasil",
        description: `Akun ${userToDelete.name} telah dihapus`,
        status: "success",
        placement: "top",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.show({
        title: "Error",
        description: "Gagal menghapus akun",
        status: "error",
        placement: "top",
      });
    } finally {
      setIsDeleteOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F9" }}>
      {/* Header Section */}
      <Box h={Dimensions.get("window").height / 4} w="100%" position="relative">
        <Image
          source={{
            uri: "https://i.ytimg.com/vi/BoI0_fTLhxA/maxresdefault.jpg",
          }}
          alt="Banner"
          resizeMode="cover"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          p={5}
          bg={{
            linearGradient: {
              colors: ["transparent", "rgba(0,0,0,0.7)"],
              start: [0, 0],
              end: [0, 1],
            },
          }}
          borderBottomLeftRadius={30}
          borderBottomRightRadius={30}
        >
          <Text fontSize="2xl" color="white" fontWeight="bold">
            Manajemen Akun
          </Text>
        </Box>
      </Box>

      {/* Search and Add Section */}
      <Box px={5} mt={-5} mb={4}>
        <HStack space={4}>
          <Input
            flex={1}
            placeholder="Cari akun..."
            bg="white"
            borderRadius="full"
            h={45}
            borderColor="gray.200"
            borderWidth={1}
            shadow={2}
            value={searchQuery}
            onChangeText={setSearchQuery}
            InputLeftElement={
              <Icon
                as={Feather}
                name="search"
                size={5}
                ml={4}
                color="gray.400"
              />
            }
          />
          <Button
            onPress={() => setShowModal(true)}
            bg="blue.600"
            borderRadius="full"
            h={45}
            shadow={2}
            leftIcon={<Icon as={MaterialIcons} name="add" size="sm" color="white" />}
            _pressed={{ bg: "blue.700" }}
          >
            Tambah
          </Button>
        </HStack>
      </Box>

      {/* User List */}
      <ScrollView px={5}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={() => handleEditUser(user.id)}
              onDelete={() => openDeleteConfirmation(user)}
            />
          ))
        ) : (
          <Box
            bg="white"
            p={8}
            borderRadius="xl"
            shadow={2}
            alignItems="center"
          >
            <Icon
              as={MaterialIcons}
              name="search-off"
              size={12}
              color="gray.400"
              mb={4}
            />
            <Text color="gray.500" fontSize="md" textAlign="center">
              {users.length === 0 ? "Memuat akun..." : "Tidak ada akun yang ditemukan"}
            </Text>
          </Box>
        )}
      </ScrollView>

      {/* Add Account Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Modal.Content maxWidth="400px" borderRadius="2xl">
          <Modal.CloseButton />
          <Modal.Header borderBottomWidth={0}>
            <Text fontSize="xl" fontWeight="bold" color="gray.800">
              Pilih Jenis Akun
            </Text>
          </Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              <Button
                colorScheme="blue"
                size="lg"
                borderRadius="lg"
                leftIcon={<Icon as={MaterialIcons} name="person-add" size="sm" />}
                onPress={() => {
                  setShowModal(false);
                  navigation.navigate("AdminPegawai");
                }}
              >
                Buat Akun Pegawai
              </Button>
              <Button
                colorScheme="blue"
                size="lg"
                borderRadius="lg"
                variant="outline"
                leftIcon={<Icon as={MaterialIcons} name="business" size="sm" />}
                onPress={() => {
                  setShowModal(false);
                  navigation.navigate("AdminUp3");
                }}
              >
                Buat Akun UP3
              </Button>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
      >
        <AlertDialog.Content borderRadius="xl">
          <AlertDialog.CloseButton />
          <AlertDialog.Header borderBottomWidth={0} pb={0}>
            <Text fontSize="xl" fontWeight="bold" color="gray.800">
              Konfirmasi Hapus
            </Text>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <VStack space={4}>
              <HStack space={3} alignItems="center">
                <Icon as={MaterialIcons} name="warning" size={8} color="red.500" />
                <Text fontSize="md" color="gray.700">
                  Hapus akun{" "}
                  <Text fontWeight="bold">{userToDelete?.name}</Text>?
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                Tindakan ini tidak dapat dibatalkan dan semua data terkait akun ini akan dihapus secara permanen.
              </Text>
            </VStack>
          </AlertDialog.Body>
          <AlertDialog.Footer borderTopWidth={0}>
            <Button.Group space={2}>
              <Button
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                ref={cancelRef}
              >
                Batal
              </Button>
              <Button
                colorScheme="danger"
                leftIcon={<Icon as={MaterialIcons} name="delete" size="sm" />}
                onPress={handleDeleteUser}
              >
                Hapus
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </SafeAreaView>
  );
};

export default AdminAkun;