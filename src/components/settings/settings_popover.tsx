import React, { memo } from 'react';
import { Portal, Button, Popover, Text, IconButton, Icon, Stack } from '@chakra-ui/react';
import { FaCog } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

export const SettingsPopover = memo(() => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);

        // Store the language preference in a cookie for persistence
        document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`;
    };

    return (
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
                            </Stack>
                        </Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Portal>
        </Popover.Root>
    );
});

SettingsPopover.displayName = 'SettingsPopover';
