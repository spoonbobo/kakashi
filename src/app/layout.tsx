import { Provider } from "@/components/provider"
import { AuthProvider } from "@/auth/context"
import { cookies, headers } from 'next/headers';
import I18nProvider from '@/i18n/i18n-provider';

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  // Get the locale from cookies, headers, or default to 'en'
  const headersList = await headers();
  const cookieStore = await cookies();
  const preferredLocale = cookieStore.get('NEXT_LOCALE')?.value ||
    headersList.get('accept-language')?.split(',')[0].split('-')[0] ||
    'en';

  return (
    <html lang={preferredLocale} suppressHydrationWarning>
      <body>
        <AuthProvider>
          <I18nProvider locale={preferredLocale}>
            <Provider>{children}</Provider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
