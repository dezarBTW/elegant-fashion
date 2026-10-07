// Format price in Nigerian Naira
// Uses major units (1200.00 = ₦1,200.00)

export function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse Naira input to number (strips currency symbols, commas, spaces)
export function parseNGN(input: string): number {
  // Remove common currency patterns
  const cleaned = input
    .replace(/[₦$€£]/g, '') // Currency symbols
    .replace(/[,\s]/g, '') // Commas and spaces
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Format with compact notation for large numbers
export function formatNGNCompact(amount: number): string {
  if (amount >= 1000000) {
    return `₦${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `₦${(amount / 1000).toFixed(1)}K`;
  }
  return formatNGN(amount);
}

// Example usage:
// formatNGN(1200.00)    // "₦1,200.00"
// formatNGN(50000.00)    // "₦50,000.00"
// formatNGN(1500000.00)  // "₦1.5M"
// parseNGN("₦1,200")     // 1200