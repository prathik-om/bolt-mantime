// Export client functions
export { createClient } from './client'
export { createMiddlewareClient } from './middleware'

// Export helper functions
export { handleSupabaseError } from './helpers'

// Re-export types for convenience
export type { Database } from '@/lib/database.types' 