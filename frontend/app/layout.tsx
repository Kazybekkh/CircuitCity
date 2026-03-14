import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circuits as a City",
  description: "An educational platform that translates electronic circuits into an animated city simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
