import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "JyutCollab - 粤语多音节词众包平台",
  description: "概念驱动的粤语多音节词众包平台，让粤语文化传承更有活力",
  authors: [{ name: "JyutCollab Team" }],
  keywords: "粤语,广东话,香港话,台山话,海外粤语,众包,语言学习,文化传承",
  openGraph: {
    title: "JyutCollab - 粤语多音节词众包平台",
    description: "概念驱动的粤语多音节词众包平台，让粤语文化传承更有活力",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JyutCollab - 粤语多音节词众包平台",
    description: "概念驱动的粤语多音节词众包平台，让粤语文化传承更有活力",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const applyTheme = theme === 'system' || !theme ? systemTheme : theme;
                  if (applyTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased h-full`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Header />
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
