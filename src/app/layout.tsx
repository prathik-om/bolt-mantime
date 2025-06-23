import '@mantine/core/styles.css'; // Mantine's core styles
import '@mantine/notifications/styles.css'; // Mantine's notifications styles
import type { Metadata } from "next";
import { ColorSchemeScript } from '@mantine/core';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Toaster } from 'sonner';
import QueryProvider from '@/components/providers/query-provider';
import { SchoolProvider } from '@/components/providers/school-provider';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <QueryProvider>
          <MantineProvider defaultColorScheme="light">
            <SchoolProvider>
              <Notifications />
              <Toaster />
              {children}
            </SchoolProvider>
          </MantineProvider>
        </QueryProvider>
      </body>
    </html>
  );
}