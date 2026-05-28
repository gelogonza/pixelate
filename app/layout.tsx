import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixelate",
  description: "An interactive image-to-style renderer.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icon.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-white text-[#0a0a0a] antialiased select-none">
        {children}
      </body>
    </html>
  );
}
