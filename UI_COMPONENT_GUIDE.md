# UI Component Usage Guide

## Overview
This guide outlines when and how to use components from our two main UI libraries: Mantine and Shadcn/UI. Following these guidelines ensures consistency across our application and optimizes maintenance.

## Quick Reference

| Component Type | Library to Use | Component Import |
|---------------|----------------|------------------|
| Forms | Mantine | `@mantine/form` |
| Notifications | Mantine | `@mantine/notifications` |
| Layout | Mantine | `@mantine/core` |
| Basic UI | Shadcn/UI | `@/components/ui/*` |
| Tables | Shadcn/UI | `@/components/ui/table` |
| Modals/Dialogs | Mantine | `@mantine/core` |

## Mantine Components

### When to Use Mantine

1. **Form Management**
   ```typescript
   import { useForm } from '@mantine/form';
   import { TextInput, NumberInput, Select } from '@mantine/core';
   ```
   - All form handling and validation
   - Complex form inputs
   - Form state management

2. **Layout Components**
   ```typescript
   import { Container, Grid, Stack, Group } from '@mantine/core';
   ```
   - Page layouts
   - Grid systems
   - Flex containers
   - Responsive layouts

3. **Notifications & Feedback**
   ```typescript
   import { notifications } from '@mantine/notifications';
   import { Alert, LoadingOverlay } from '@mantine/core';
   ```
   - Toast notifications
   - Alert messages
   - Loading states
   - Progress indicators

4. **Date & Time**
   ```typescript
   import { DateInput, TimeInput } from '@mantine/dates';
   ```
   - Date pickers
   - Time pickers
   - Calendar components

5. **Complex Interactive Components**
   ```typescript
   import { Modal, Drawer, Tabs, Accordion } from '@mantine/core';
   ```
   - Modals/Dialogs
   - Navigation components
   - Complex interactive UI

## Shadcn/UI Components

### When to Use Shadcn/UI

1. **Basic UI Elements**
   ```typescript
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   ```
   - Buttons
   - Basic inputs
   - Labels
   - Icons

2. **Data Display**
   ```typescript
   import { 
     Table, 
     TableHeader, 
     TableBody, 
     TableRow, 
     TableCell 
   } from '@/components/ui/table';
   ```
   - Tables
   - Data grids
   - Lists

3. **Cards & Containers**
   ```typescript
   import { 
     Card, 
     CardHeader, 
     CardContent, 
     CardFooter 
   } from '@/components/ui/card';
   ```
   - Content cards
   - Info containers
   - Section wrappers

4. **Selection & Input**
   ```typescript
   import {
     Select,
     SelectTrigger,
     SelectValue,
     SelectContent,
     SelectItem
   } from '@/components/ui/select';
   ```
   - Dropdown selects
   - Checkboxes
   - Radio buttons

## Best Practices

### 1. Form Implementation
```typescript
// ✅ DO: Use Mantine for forms
import { useForm } from '@mantine/form';
import { TextInput, NumberInput } from '@mantine/core';
import { Button } from '@/components/ui/button'; // Shadcn button is fine here

// ❌ DON'T: Mix form handling libraries
import { useForm } from 'react-hook-form'; // Don't use other form libraries
```

### 2. Layout Structure
```typescript
// ✅ DO: Use Mantine for layouts
import { Container, Grid, Group } from '@mantine/core';

// ❌ DON'T: Create custom layout components when Mantine provides them
// Avoid creating: CustomContainer, CustomGrid, etc.
```

### 3. Notifications
```typescript
// ✅ DO: Use Mantine notifications
import { notifications } from '@mantine/notifications';

notifications.show({
  title: 'Success',
  message: 'Operation completed',
  color: 'green'
});

// ❌ DON'T: Use custom toast/notification systems
```

### 4. Component Composition
```typescript
// ✅ DO: Compose components logically
import { Container } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// This is fine - using each library for its strengths
function MyComponent() {
  return (
    <Container>
      <Card>
        <Button>Click Me</Button>
      </Card>
    </Container>
  );
}
```

## Theming and Styling

1. **Mantine Theme**
   - Use Mantine's theme for global styles
   - Configure colors, spacing, and breakpoints
   - Located in `src/components/providers.tsx`

2. **Shadcn/UI Customization**
   - Customize through Tailwind classes
   - Modify component styles in `src/components/ui/`
   - Follow Tailwind configuration in `tailwind.config.ts`

## Adding New Components

When adding new components to the application:

1. **Evaluate Requirements**
   - Consider the component's complexity
   - Check if it needs form integration
   - Assess styling requirements

2. **Choose Library**
   - Use Mantine for complex, interactive components
   - Use Shadcn/UI for basic UI elements
   - When in doubt, prefer Mantine for new features

3. **Document Usage**
   - Add examples to this guide
   - Include any special considerations
   - Document any customizations

## Maintenance

1. **Updates**
   - Keep both libraries updated
   - Test thoroughly after updates
   - Review breaking changes

2. **Performance**
   - Monitor bundle size
   - Use code splitting where appropriate
   - Lazy load complex components

3. **Accessibility**
   - Ensure ARIA attributes are properly set
   - Test with screen readers
   - Maintain keyboard navigation

## Common Patterns

### 1. Form with Validation
```typescript
import { useForm } from '@mantine/form';
import { TextInput } from '@mantine/core';
import { Button } from '@/components/ui/button';

export function MyForm() {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  return (
    <form onSubmit={form.onSubmit(console.log)}>
      <TextInput {...form.getInputProps('name')} label="Name" />
      <TextInput {...form.getInputProps('email')} label="Email" />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### 2. Data Display
```typescript
import { Container } from '@mantine/core';
import { Table, TableHeader, TableRow, TableCell } from '@/components/ui/table';

export function DataTable() {
  return (
    <Container>
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHeader>
        {/* ... table content ... */}
      </Table>
    </Container>
  );
}
```

### 3. Modal Dialog
```typescript
import { Modal } from '@mantine/core';
import { Button } from '@/components/ui/button';

export function ConfirmDialog() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)}>
        {/* Modal content */}
      </Modal>
      <Button onClick={() => setOpened(true)}>
        Open Modal
      </Button>
    </>
  );
}
```

## Questions & Support

For questions about component usage:
1. Refer to this guide first
2. Check the component's documentation:
   - [Mantine Documentation](https://mantine.dev/)
   - [Shadcn/UI Documentation](https://ui.shadcn.com/)
3. Consult with the team lead for specific use cases

## Contributing

When contributing new components or patterns:
1. Follow the guidelines in this document
2. Update this guide with new patterns
3. Document any deviations or special cases
4. Get team review for new patterns 