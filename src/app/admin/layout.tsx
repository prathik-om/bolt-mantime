import { AppShell, AppShellMain, AppShellNavbar } from '@mantine/core';
import AdminNavbar from './admin-navbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      navbar={{ width: 250, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShellNavbar p="md">
        <AdminNavbar />
      </AppShellNavbar>

      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
} 