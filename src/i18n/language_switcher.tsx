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

    return (
        <HStack>
            <Button
                size="sm"
                colorScheme={i18n.language === 'en' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('en')}
            >
                English
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'zh' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('zh')}
            >
                中文(繁體)
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'zhCN' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('zhCN')}
            >
                中文(简体)
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'th' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('th')}
            >
                ไทย
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'ja' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('ja')}
            >
                日本語
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'ko' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('ko')}
            >
                한국어
            </Button>
            <Button
                size="sm"
                colorScheme={i18n.language === 'vi' ? 'blue' : 'gray'}
                onClick={() => switchLanguage('vi')}
            >
                Tiếng Việt
            </Button>
        </HStack>
    );
}
