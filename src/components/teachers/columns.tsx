import { ColumnDef } from "@tanstack/react-table";
import { Teacher } from "@/types/teacher";
import { Badge, Group, Text, ActionIcon } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";

interface ColumnProps {
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
}

export const columns = ({ onEdit, onDelete }: ColumnProps): ColumnDef<Teacher>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Text>
        {row.original.first_name} {row.original.last_name}
      </Text>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => row.original.department?.name || "—",
  },
  {
    accessorKey: "max_periods_per_week",
    header: "Max Periods/Week",
    cell: ({ row }) => row.original.max_periods_per_week || "—",
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <Badge color={row.original.is_active ? "green" : "red"}>
        {row.original.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          color="blue"
          onClick={() => onEdit(row.original)}
        >
          <IconEdit size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => onDelete(row.original)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    ),
  },
]; 