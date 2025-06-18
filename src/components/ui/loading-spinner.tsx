import { Loader } from '@mantine/core';
import React from 'react';

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Loader size="lg" />
    </div>
  );
} 