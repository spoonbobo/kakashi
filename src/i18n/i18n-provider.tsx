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
        if (i18n.language !== locale) {
            i18n.changeLanguage(locale);
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