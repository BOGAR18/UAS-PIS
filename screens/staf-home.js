import React from "react";
import { ScrollView } from "react-native";
import { Box, Text, VStack} from "native-base";
import Header from "../components/header";
const Dashboard = () => {

    return (
        <Box flex={1} bg="white">
            <ScrollView showsVerticalScrollIndicator={false}>
                <Header title={"Dashboard"} />
                
                {/* Welcome Section */}
                <Box 
                    bg={"blue.500"}
                    pt={6}
                    pb={20}
                    px={6}
                >
                    <VStack space={2}>
                        <Text fontSize="md" color="blue.100" bold>
                            Selamat Datang
                        </Text>
                        <Text fontSize="3xl" color="white" fontWeight="bold" numberOfLines={1}>
                           Staf Gudang
                        </Text>
                    </VStack>
                </Box>
            </ScrollView>
        </Box>
    );
};

export default Dashboard;