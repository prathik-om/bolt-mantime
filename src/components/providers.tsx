'use client'

import { ReactNode, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SchoolProvider } from './providers/school-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <SchoolProvider>{children}</SchoolProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}