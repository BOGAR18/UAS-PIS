import React, { useState } from "react";
import {
  Modal,
  Box,
  Text,
  HStack,
  IconButton,
  Icon,
  Spinner,
  Center,
  VStack,
  Button,
} from "native-base";
import { WebView } from "react-native-webview";
import { Platform, Dimensions, Linking } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const PDFViewerModal = ({ isOpen, onClose, pdfUrl, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const windowHeight = Dimensions.get("window").height;

  // Handle WebView errors
  const handleError = (error) => {
    console.error("PDF WebView error:", error);
    setHasError(true);
    setIsLoading(false);
  };

  // Reset state when modal opens
  const handleOnOpen = () => {
    setIsLoading(true);
    setHasError(false);
  };

  // Create a proper URI for WebView to display PDF
  const getPdfViewerUri = () => {
    if (pdfUrl) {
      // For local files on Android, use Google Docs viewer
      if (pdfUrl.startsWith('file://') && Platform.OS === 'android') {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
      }
      return pdfUrl; // Direct URL for remote PDFs
    }
    return null;
  };

  // Handle successful loading
  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // Try opening in external viewer
  const openExternalViewer = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl).catch(err => {
        console.error("Failed to open PDF in external viewer:", err);
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" onOpen={handleOnOpen}>
      <Modal.Content maxH={windowHeight * 0.9} h={windowHeight * 0.9}>
        <Modal.Header bg="blue.600">
          <HStack alignItems="center" justifyContent="space-between" w="full">
            <Text color="white" fontWeight="medium" fontSize="md">
              {title || "PDF Viewer"}
            </Text>
            <IconButton
              icon={<Icon as={MaterialIcons} name="close" color="white" />}
              variant="unstyled"
              onPress={onClose}
            />
          </HStack>
        </Modal.Header>

        <Modal.Body p={0}>
          {pdfUrl ? (
            <>
              {isLoading && (
                <Center position="absolute" top={0} left={0} right={0} bottom={0} zIndex={10}>
                  <VStack space={3} alignItems="center">
                    <Spinner size="lg" color="blue.500" />
                    <Text>Loading PDF...</Text>
                  </VStack>
                </Center>
              )}

              {hasError ? (
                <Center flex={1} p={6}>
                  <VStack space={4} alignItems="center">
                    <Icon as={Feather} name="alert-circle" size="5xl" color="red.500" />
                    <Text fontSize="md" textAlign="center">
                      Unable to display PDF. The file may be corrupted or inaccessible.
                    </Text>
                    <Button
                      onPress={openExternalViewer}
                      leftIcon={<Icon as={MaterialIcons} name="open-in-new" />}
                    >
                      Open in Another App
                    </Button>
                  </VStack>
                </Center>
              ) : (
                <WebView
                  source={{ uri: getPdfViewerUri() }}
                  style={{ flex: 1 }}
                  onError={handleError}
                  onHttpError={handleError}
                  onLoadEnd={handleLoadEnd}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  key="webViewKey"
                />
              )}
            </>
          ) : (
            <Center flex={1}>
              <Text>No PDF URL provided</Text>
            </Center>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default PDFViewerModal;