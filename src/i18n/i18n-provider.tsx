'use client';

import { I18nextProvider } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '@/i18n/client';

export default function I18nProvider({
    children,
    locale
}: {
    children: React.ReactNode;
    locale: string;
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Map Next.js locale to i18next locale if needed
        const i18nLocale = locale === 'zh-CN' ? 'zhCN' : locale;

        if (i18n.language !== i18nLocale) {
            i18n.changeLanguage(i18nLocale);
        }
        setMounted(true);

        // Force re-render when language changes
        const handleLanguageChanged = () => {
            // This will trigger a re-render
            setMounted(false);
            setTimeout(() => setMounted(true), 0);
        };

        i18n.on('languageChanged', handleLanguageChanged);

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [locale]);

    if (!mounted) return null;

    return (
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    );
}