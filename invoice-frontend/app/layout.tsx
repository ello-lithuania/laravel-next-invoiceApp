import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { ThemeProvider } from '@/contexts/ThemeContext'

export const metadata = {
  title: 'InvoiceApp',
  description: 'Simple invoice management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var color = localStorage.getItem('app-color-theme') || localStorage.getItem('app-theme') || 'midnight';
                  if (color === 'frost') color = 'midnight';
                  var modeStr = localStorage.getItem('app-theme-mode');
                  var isDark = modeStr ? modeStr === 'dark' : true;
                  document.documentElement.setAttribute('data-theme', color);
                  document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
                  if (isDark) document.documentElement.classList.add('dark');
                } catch (e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'midnight');
                  document.documentElement.setAttribute('data-mode', 'dark');
                }
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
