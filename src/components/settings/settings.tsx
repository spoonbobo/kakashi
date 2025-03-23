import React, { useState } from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Flex,
    Button,
    Icon,
    Separator,
    Badge,
    Input,

} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { FaCog, FaGlobe, FaTrash, FaUserCircle } from 'react-icons/fa';
import { FiInfo } from 'react-icons/fi';
import Toast, { showSuccessToast, showErrorToast } from '@/components/toast/toast';
import { motion } from 'framer-motion';

// Create motion components
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionVStack = motion(VStack);

export const Settings = () => {
    const { i18n, t } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Define custom colors instead of using useColorModeValue
    const bgColor = 'white';
    const borderColor = 'gray.200';
    const hoverBg = 'gray.50';
    const accentColor = 'blue.500';
    const textColor = 'gray.800';

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        // Store the language preference in a cookie for persistence
        document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`;
        showSuccessToast(`Language changed to ${getLanguageName(lang)}`);
    };

    const getLanguageName = (code: string): string => {
        const languages: Record<string, string> = {
            'en': 'English',
            'zh': '中文(繁體)',
            'zhCN': '中文(简体)',
            'th': 'ไทย',
            'ja': '日本語',
            'ko': '한국어',
            'vi': 'Tiếng Việt'
        };
        return languages[code] || code;
    };

    const deleteAllRooms = async () => {
        if (confirm(t('confirmDeleteAllRooms', 'Are you sure you want to delete all chat rooms? This action cannot be undone.'))) {
            setIsDeleting(true);
            try {
                const response = await fetch('/api/chat/delete_rooms', {
                    method: 'DELETE',
                });

                const data = await response.json();

                if (response.ok) {
                    showSuccessToast(data.message);
                    // Redirect to home page after successful deletion
                    window.location.href = '/';
                } else {
                    throw new Error(data.error || 'Failed to delete chat rooms');
                }
            } catch (error) {
                showErrorToast(`Error deleting chat rooms: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.4,
                when: "beforeChildren",
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    const tabVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
    };

    return (
        <MotionBox
            maxW="1200px"
            mx="auto"
            p={4}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <Toast />

            <MotionBox variants={itemVariants}>
                <Heading size="lg" mb={6} display="flex" alignItems="center">
                    <Icon as={FaCog} mr={3} color={accentColor} />
                    {t('settings')}
                </Heading>
            </MotionBox>

            <MotionFlex
                direction={{ base: "column", md: "row" }}
                gap={6}
                variants={itemVariants}
            >
                {/* Left sidebar */}
                <MotionVStack
                    width={{ base: "100%", md: "250px" }}
                    align="stretch"
                    position="sticky"
                    top="20px"
                    height="fit-content"
                    variants={itemVariants}
                >
                    {[
                        { icon: FaUserCircle, label: t('profile'), id: 0 },
                        { icon: FaGlobe, label: t('language'), id: 1 },
                        { icon: FaTrash, label: t('danger_zone'), id: 2, color: "red.500" }
                    ].map((item) => (
                        <motion.div key={item.id} variants={tabVariants}>
                            <Button
                                variant="ghost"
                                justifyContent="flex-start"
                                onClick={() => setActiveTab(item.id)}
                                bg={activeTab === item.id ? hoverBg : "transparent"}
                                color={item.color || textColor}
                                borderRadius="md"
                                width="100%"
                                py={3}
                                _hover={{ bg: hoverBg }}
                            >
                                <Icon as={item.icon} color={item.color || textColor} mr={2} />
                                {item.label}
                            </Button>
                        </motion.div>
                    ))}
                </MotionVStack>

                {/* Main content */}
                <MotionBox
                    flex={1}
                    bg={bgColor}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                    p={6}
                    boxShadow="sm"
                    variants={itemVariants}
                >
                    {/* Add persistent save button at the top */}
                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                        <Heading size="md" color={textColor}>
                            {activeTab === 0 && t('profile')}
                            {activeTab === 1 && t('language')}
                            {activeTab === 2 && <Text color="red.500">{t('danger_zone')}</Text>}
                        </Heading>

                        {activeTab !== 2 && (
                            <Button colorScheme="blue" size="md">
                                {t('save_changes')}
                            </Button>
                        )}
                    </Flex>
                    <Separator mb={6} />

                    <Box>
                        {/* Profile Settings */}
                        {activeTab === 0 && (
                            <Box>
                                <VStack align="stretch">
                                    <Box mb={4}>
                                        <Text fontWeight="medium" mb={1} color={textColor}>{t('display_name')}</Text>
                                        <Input placeholder={t('your_display_name')} maxW="400px" />
                                    </Box>

                                    <Box mb={4}>
                                        <Text fontWeight="medium" mb={1} color={textColor}>{t('email')}</Text>
                                        <Input placeholder={t('your_email')} maxW="400px" />
                                    </Box>

                                    <Box mb={4}>
                                        <Text fontWeight="medium" mb={1} color={textColor}>{t('bio')}</Text>
                                        <Input placeholder={t('tell_us_about_yourself')} maxW="400px" />
                                    </Box>
                                </VStack>
                            </Box>
                        )}

                        {/* Language Settings */}
                        {activeTab === 1 && (
                            <Box>
                                <Text mb={4} color={textColor}>{t('select_language')}</Text>
                                <VStack align="stretch" maxW="400px">
                                    {[
                                        { code: 'en', name: 'English' },
                                        { code: 'zh', name: '中文(繁體)' },
                                        { code: 'zhCN', name: '中文(简体)' },
                                        { code: 'th', name: 'ไทย' },
                                        { code: 'ja', name: '日本語' },
                                        { code: 'ko', name: '한국어' },
                                        { code: 'vi', name: 'Tiếng Việt' }
                                    ].map(lang => (
                                        <Button
                                            key={lang.code}
                                            size="md"
                                            justifyContent="space-between"
                                            variant="outline"
                                            colorScheme={i18n.language === lang.code ? "blue" : "gray"}
                                            onClick={() => changeLanguage(lang.code)}
                                        >
                                            <Flex align="center">
                                                <Icon as={FaGlobe} mr={2} />
                                                {lang.name}
                                            </Flex>
                                            {i18n.language === lang.code && (
                                                <Badge colorScheme="blue" variant="solid" fontSize="xs">
                                                    {t('active')}
                                                </Badge>
                                            )}
                                        </Button>
                                    ))}
                                </VStack>
                            </Box>
                        )}

                        {/* Danger Zone */}
                        {activeTab === 2 && (
                            <Box>
                                <Box
                                    p={4}
                                    borderWidth="1px"
                                    borderColor="red.200"
                                    borderRadius="md"
                                    bg="red.50"
                                    mb={6}
                                >
                                    <HStack align="flex-start">
                                        <Icon as={FiInfo} color="red.500" boxSize={5} mt={0.5} />
                                        <Box>
                                            <Heading size="sm" color="red.600" mb={1}>
                                                {t('delete_all_rooms')}
                                            </Heading>
                                            <Text color="red.700" fontSize="sm">
                                                {t('delete_all_rooms_warning')}
                                            </Text>
                                            <Button
                                                mt={3}
                                                colorScheme="red"
                                                size="sm"
                                                onClick={deleteAllRooms}
                                                loading={isDeleting}
                                                loadingText={t('deleting...')}
                                            >
                                                {t('delete_all_rooms')}
                                            </Button>
                                        </Box>
                                    </HStack>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </MotionBox>
            </MotionFlex>
        </MotionBox>
    );
};

export default Settings;
