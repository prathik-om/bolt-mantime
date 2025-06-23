import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate hours per term based on total hours and distribution method
 */
export function calculateTermHours(
  totalHours: number,
  distributionType: 'equal' | 'custom',
  termHours?: Record<string, number>,
  numberOfTerms: number = 3
): Record<string, number> {
  if (distributionType === 'equal') {
    const hoursPerTerm = Math.floor(totalHours / numberOfTerms);
    const remainder = totalHours % numberOfTerms;
    
    const result: Record<string, number> = {};
    for (let i = 1; i <= numberOfTerms; i++) {
      result[`term${i}`] = hoursPerTerm + (i <= remainder ? 1 : 0);
    }
    return result;
  }
  
  return termHours || {};
}

/**
 * Validate that custom term hours sum to total hours
 */
export function validateTermHours(
  totalHours: number,
  termHours: Record<string, number>
): { isValid: boolean; allocated: number; message: string } {
  const allocated = Object.values(termHours).reduce((sum, hours) => sum + (hours || 0), 0);
  
  if (allocated === totalHours) {
    return { isValid: true, allocated, message: 'Hours allocation is valid' };
  } else if (allocated > totalHours) {
    return { isValid: false, allocated, message: `Too many hours allocated: ${allocated} > ${totalHours}` };
  } else {
    return { isValid: false, allocated, message: `Insufficient hours allocated: ${allocated} < ${totalHours}` };
  }
}

/**
 * Get hours for a specific term
 */
export function getTermHours(
  totalHours: number,
  distributionType: 'equal' | 'custom',
  termHours: Record<string, number>,
  termNumber: number
): number {
  if (distributionType === 'custom' && termHours[`term${termNumber}`] !== undefined) {
    return termHours[`term${termNumber}`];
  }
  
  // For equal distribution or fallback
  const calculated = calculateTermHours(totalHours, 'equal');
  return calculated[`term${termNumber}`] || 0;
}
