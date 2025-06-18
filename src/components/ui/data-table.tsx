import React from "react";

interface DataTableProps<T = any> {
  columns: any;
  data: T[];
}

export function DataTable<T = any>({ columns, data }: DataTableProps<T>) {
  return (
    <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>DataTable Placeholder</div>
      <pre style={{ fontSize: 12, color: '#888' }}>{JSON.stringify({ columns, data }, null, 2)}</pre>
    </div>
  );
} 