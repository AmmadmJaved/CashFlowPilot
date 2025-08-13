import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, InsertUserProfile } from "@shared/schema";

export function useProfile() {
  const queryClient = useQueryClient();

  // Get current profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['/api/profile'],
    retry: false,
  });

  // Create profile mutation
  const createProfile = useMutation({
    mutationFn: async (data: InsertUserProfile) => {
      return await apiRequest('/api/profile', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertUserProfile> }) => {
      return await apiRequest(`/api/profile/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
  });

  return {
    profile: profile as UserProfile | undefined,
    isLoading,
    error,
    createProfile,
    updateProfile,
    hasProfile: !!profile,
  };
}

// Hook for currency formatting based on user profile
export function useCurrencyFormatter() {
  const { profile } = useProfile();
  
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currency = profile?.currency || 'PKR';
    const locale = profile?.numberFormat || 'en-PK';
    
    // Currency symbols mapping
    const currencySymbols: { [key: string]: string } = {
      'PKR': '₨',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'SAR': '﷼',
      'AED': 'د.إ',
      'INR': '₹',
    };

    try {
      if (currency === 'PKR') {
        // Custom formatting for Pakistani Rupee
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num);
        return `${currencySymbols[currency] || currency} ${formatted}`;
      } else {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
        }).format(num);
      }
    } catch (error) {
      // Fallback formatting
      return `${currencySymbols[currency] || currency} ${num.toLocaleString()}`;
    }
  };

  return { formatCurrency };
}