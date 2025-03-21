import React, { memo, useState } from 'react';
import { Portal, Button, Popover, Text, IconButton, Icon, Stack, Separator } from '@chakra-ui/react';
import { FaCog, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const SettingsPopover = memo(() => {
    const { i18n, t } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);

        // Store the language preference in a cookie for persistence
        document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`;
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
                    toast.success(data.message, {
                        className: 'professional-toast',
                        progressClassName: 'professional-progress',
                        icon: <FaTrash color="#F44336" size={24} />,
                    });
                    // Redirect to home page after successful deletion
                    window.location.href = '/';
                } else {
                    throw new Error(data.error || 'Failed to delete chat rooms');
                }
            } catch (error) {
                toast.error(`Error deleting chat rooms: ${error instanceof Error ? error.message : String(error)}`, {
                    className: 'professional-toast',
                    progressClassName: 'professional-progress',
                });
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <>
            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                transition={Slide}
                theme="light"
                limit={3}
                style={{
                    zIndex: 9999,
                    minWidth: '300px'
                }}
            />

            {/* Toast styling */}
            <style jsx global>{`
                .professional-toast {
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                    padding: 16px !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                }
                
                .professional-toast-body {
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    margin-left: 12px !important;
                }
                
                .professional-progress {
                    height: 4px !important;
                    background: linear-gradient(to right, #4CAF50, #8BC34A) !important;
                }
                
                .Toastify__toast--error .professional-progress {
                    background: linear-gradient(to right, #F44336, #FF9800) !important;
                }
                
                .Toastify__toast {
                    min-height: 64px !important;
                }
                
                .Toastify__close-button {
                    opacity: 0.7 !important;
                    padding: 4px !important;
                }
            `}</style>

            <Popover.Root>
                <Popover.Trigger asChild>
                    <IconButton
                        variant="ghost"
                        aria-label="Settings"
                        color="white"
                        bg="transparent"
                        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                        _active={{ bg: 'rgba(255, 255, 255, 0.3)' }}
                        _focus={{ boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.3)' }}
                    >
                        <Icon as={FaCog} />
                    </IconButton>
                </Popover.Trigger>
                <Portal>
                    <Popover.Positioner>
                        <Popover.Content>
                            <Popover.Arrow />
                            <Popover.Body>
                                <Popover.Title fontWeight="medium">{t('settings')}</Popover.Title>
                                <Stack mt={4}>
                                    <Text fontWeight="medium">{t('language')}</Text>
                                    <Stack maxH="200px" overflowY="auto">
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'en' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('en')}
                                        >
                                            English
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'zh' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('zh')}
                                        >
                                            中文(繁體)
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'zhCN' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('zhCN')}
                                        >
                                            中文(简体)
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'th' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('th')}
                                        >
                                            ไทย
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'ja' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('ja')}
                                        >
                                            日本語
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'ko' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('ko')}
                                        >
                                            한국어
                                        </Button>
                                        <Button
                                            size="sm"
                                            justifyContent="flex-start"
                                            colorScheme={i18n.language === 'vi' ? 'blue' : 'gray'}
                                            onClick={() => changeLanguage('vi')}
                                        >
                                            Tiếng Việt
                                        </Button>
                                    </Stack>

                                    <Separator my={3} />

                                    <Text fontWeight="medium" color="red.500">{t('danger_zone')}</Text>
                                    <Button
                                        size="sm"
                                        colorScheme="red"
                                        onClick={deleteAllRooms}
                                        loading={isDeleting}
                                        loadingText={t('deleting...')}
                                    >
                                        {t('delete_all_rooms')}
                                    </Button>
                                </Stack>
                            </Popover.Body>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover.Root>
        </>
    );
});

SettingsPopover.displayName = 'SettingsPopover';
