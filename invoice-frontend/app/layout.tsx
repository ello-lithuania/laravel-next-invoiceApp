import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Inter } from 'next/font/google'

// Self-hosted at build time (served from /_next/static) instead of a render-
// blocking @import from fonts.googleapis.com — faster, private, and it satisfies
// the CSP (font-src 'self') that was otherwise blocking the external font.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  title: 'InvoiceApp',
  description: 'Simple invoice management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var el = document.documentElement;
                try {
                  var color = localStorage.getItem('app-color-theme') || localStorage.getItem('app-theme') || 'midnight';
                  if (color === 'frost') color = 'midnight';
                  var modeStr = localStorage.getItem('app-theme-mode');
                  var isDark = modeStr ? modeStr === 'dark' : true;
                  el.setAttribute('data-theme', color);
                  el.setAttribute('data-mode', isDark ? 'dark' : 'light');
                  if (isDark) el.classList.add('dark');
                } catch (e) {
                  el.classList.add('dark');
                  el.setAttribute('data-theme', 'midnight');
                  el.setAttribute('data-mode', 'dark');
                }
                // Apply the saved sidebar state before first paint so the
                // collapsed rail never flickers open then narrow on load.
                try {
                  el.classList.add('pre-hydration');
                  if (localStorage.getItem('sidebar-expanded') === 'false') {
                    el.classList.add('sidebar-collapsed');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-inter antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          stacked
        />
      </body>
    </html>
  )
}
