import '@mantine/core/styles.css'; // Mantine's core styles
import type { Metadata } from "next";
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: "Timetable Pro",
  description: "AI-Powered School Scheduling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}