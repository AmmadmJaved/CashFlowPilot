import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, InsertUserProfile } from "@shared/schema";
import { useAuth } from "react-oidc-context";

export function useProfile() {
  const queryClient = useQueryClient();
const auth = useAuth();
const token = auth.user?.id_token;

  // Read optimistic profile from localStorage as placeholder
  const getOptimisticProfile = () => {
    try {
      const raw = localStorage.getItem('cashpilot_optimistic_profile');
      if (raw) return JSON.parse(raw) as UserProfile;
    } catch {}
    return undefined;
  };

  // Get current profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['/api/profile'],
    enabled: !!token,
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/profile', undefined, token);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json() as UserProfile;
      // Clear optimistic once real data arrives
      localStorage.removeItem('cashpilot_optimistic_profile');
      return data;
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: getOptimisticProfile,
  });

  // Create profile mutation
  const createProfile = useMutation({
    mutationFn: async (data: InsertUserProfile) => {
      return await apiRequest('POST', '/api/profile', data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertUserProfile> }) => {
      return await apiRequest('PATCH', `/api/profile/${id}`, data, token);
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