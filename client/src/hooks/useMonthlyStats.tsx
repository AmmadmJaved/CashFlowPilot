// 📂 hooks/useMonthlyStats.ts
import { useQuery } from "@tanstack/react-query";

type StatsResponse = {
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
};

type StatsFilters = {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  groupId?: string;
};

async function fetchMonthlyStats(token: string, filters: StatsFilters = {}) {
  const params = new URLSearchParams();

  if (filters.startDate) params.append("startDate", filters.startDate.toISOString());
  if (filters.endDate) params.append("endDate", filters.endDate.toISOString());
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.groupId) params.append("groupId", filters.groupId);

  const res = await fetch(`/api/stats/monthly?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch monthly stats");
  return res.json();
}

// ✅ Custom hook for reuse in multiple components
export function useMonthlyStats(
  token: string | null,
  filters: StatsFilters = {}
) {
  return useQuery<StatsResponse>({
    queryKey: ["/api/stats/monthly", token, filters],
    queryFn: () => fetchMonthlyStats(token!, filters),
    enabled: !!token,
    retry: false,
  });
}
