import type { Metadata } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-select";
import { THEME_COOKIE, themeFromCookie } from "@/lib/theme";
import "./globals.css";

// Шрифти дизайн-системи (DESIGN.md, розділ 3): Poppins — інтерфейс, JetBrains Mono — моноширинний.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stepline",
  description: "Workflow templates, runs and tasks — step by step",
};

// Тема — з cookie на пристрої (ADR 0003): data-theme на <html> обирає токени в globals.css ще до першого показу.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = themeFromCookie((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${poppins.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
