'use client';

import { Button, HStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const switchLanguage = (locale: string) => {
        // Update i18n instance
        i18n.changeLanguage(locale);

        // Store the language preference in a cookie for persistence
        document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;

        // Dispatch a custom event for language change
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: locale }));
    };

    // Define languages with their codes and display names
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'zh', name: '中文(繁體)' },
        { code: 'zhCN', name: '中文(简体)' },
        { code: 'th', name: 'ไทย' },
        { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' },
        { code: 'vi', name: 'Tiếng Việt' },
    ];

    return (
        <HStack>
            {languages.map((lang) => (
                <Button
                    key={lang.code}
                    size="sm"
                    colorScheme={i18n.language === lang.code ? 'blue' : 'gray'}
                    onClick={() => switchLanguage(lang.code)}
                >
                    {lang.name}
                </Button>
            ))}
        </HStack>
    );
}
