# Supabase Helpers

This directory contains helper files for working with Supabase in different environments within your Next.js application.

## Files Overview

### `server.ts`
Server-side Supabase client for use in Server Components and API routes.

```typescript
import { createServerClient } from '@/utils/supabase'

// In a Server Component
export default async function MyServerComponent() {
  const supabase = createServerClient()
  const { data } = await supabase.from('table').select('*')
  // ...
}
```

### `client.ts`
Client-side Supabase client for use in Client Components and browser environments.

```typescript
import { createBrowserClient } from '@/utils/supabase'

// In a Client Component
export default function MyClientComponent() {
  const supabase = createBrowserClient()
  // ...
}
```

### `middleware.ts`
Middleware client for use in Next.js middleware for authentication and route protection.

```typescript
import { createMiddlewareClient } from '@/utils/supabase'

// In middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  // ...
}
```

### `helpers.ts`
Common utility functions and helper methods for Supabase operations.

```typescript
import { 
  getCurrentUser, 
  getProfile, 
  getSubjects, 
  handleSupabaseError 
} from '@/utils/supabase'

// Usage examples
const user = await getCurrentUser()
const profile = await getProfile(user.id)
const subjects = await getSubjects(schoolId)
```

## Available Helpers

### Authentication
- `getCurrentUser()` - Get the current authenticated user
- `getCurrentSession()` - Get the current session
- `signOut()` - Sign out the current user

### Profile Management
- `getProfile(userId)` - Get user profile
- `updateProfile(userId, updates)` - Update user profile

### School Management
- `getSchool(schoolId)` - Get school details
- `getUserSchool(userId)` - Get school for a specific user

### Data Fetching
- `getSubjects(schoolId)` - Get subjects with grade mappings and courses
- `getTeachers(schoolId)` - Get teachers with qualifications
- `getAcademicYears(schoolId)` - Get academic years with terms

### Utilities
- `handleSupabaseError(error)` - Standardized error handling
- `formatDate(date)` - Format date for display
- `formatDateTime(date)` - Format date and time for display
- `isValidEmail(email)` - Email validation
- `generateId()` - Generate unique ID

## TypeScript Types

The helpers include TypeScript types for better development experience:

```typescript
import type { Tables, Inserts, Updates } from '@/utils/supabase'

// Use with specific tables
type Subject = Tables<'subjects'>
type NewSubject = Inserts<'subjects'>
type SubjectUpdate = Updates<'subjects'>
```

## Error Handling

All helpers include standardized error handling:

```typescript
try {
  const user = await getCurrentUser()
} catch (error) {
  const errorMessage = handleSupabaseError(error)
  // Handle error appropriately
}
```

## Middleware Configuration

The middleware automatically handles:
- Session refresh for expired sessions
- Redirect to login for protected routes
- Redirect to dashboard for authenticated users on auth pages

## Environment Variables

Make sure these environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 