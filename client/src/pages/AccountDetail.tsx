// src/components/AccountDetail.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Calendar, Share2 } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter } from "@/hooks/useProfile";
import { GroupWithMembers, TransactionWithSplits } from "@shared/schema";
import Filters from "@/components/Filters";

import RealTimeNotifications from "@/components/RealTimeNotifications";
import { TransactionSkeleton, StatsSkeleton } from "@/components/AnimatedSkeleton";
import ExportButtons from "@/components/ExportButtons";
import Header from "@/components/Header";
import { useWebSocket } from "@/hooks/useWebSocket";

type AccountDetailProps = {
  accountId: string;
};

export default function AccountDetail({ accountId }: AccountDetailProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const auth = useAuth();
  const profile = (auth.user as any)?.profile;
  const queryClient = useQueryClient();
 const { isConnected } = useWebSocket();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const token = auth.user?.id_token;

  const [filters, setFilters] = useState({
    search: "",
    dateRange: "",
    category: "all",
    type: "all",
    paidBy: "",
    startDate: "",
    endDate: "",
    onlyUser: false,
    onlyGroupMembers: false,
  });

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  async function fetchTransactions(filters: any, token: string) {
    const params = new URLSearchParams();
    params.append("groupId", accountId);
    if (filters.search) params.append("search", filters.search);
    if (filters.category && filters.category !== "all") params.append("category", filters.category);
    if (filters.type && filters.type !== "all") params.append("type", filters.type);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const res = await fetch(`/api/accounts/${accountId}/transactions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch account transactions");
    return res.json();
  }

  async function fetchAccountStats(token: string) {

     const params = new URLSearchParams();
    params.append("groupId", accountId);
    if (filters.search) params.append("search", filters.search);
    if (filters.category && filters.category !== "all") params.append("category", filters.category);
    if (filters.type && filters.type !== "all") params.append("type", filters.type);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const res = await fetch(`/api/stats/monthly?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch account stats");
    return res.json();
  }

  const { data: transactions = [], isLoading: transactionsLoading } =
    useQuery<TransactionWithSplits[]>({
      queryKey: ["/api/accounts/transactions", accountId, filters, token],
      queryFn: () => fetchTransactions(filters, token!),
      enabled: !!token,
    });

  const { data: accountStats, isLoading: statsLoading } = useQuery<{
    totalIncome: string;
    totalExpenses: string;
    netBalance: string;
  }>({
    queryKey: ["/api/accounts/stats", accountId, token],
    queryFn: () => fetchAccountStats(token!),
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        isConnected={isConnected}
        profile={profile}
        auth={auth}
        setIsIncomeModalOpen={setIsIncomeModalOpen}
        setIsExpenseModalOpen={setIsExpenseModalOpen}
      />
     <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-4 py-4">
     {/* Filters + Export */}
      <ExportButtons filters={filters} />
      <Filters filters={filters} handleFilterChange={handleFilterChange} />

      {/* Stats */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(accountStats?.totalIncome || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(accountStats?.totalExpenses || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl font-bold ${
                  parseFloat(accountStats?.netBalance || "0") >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(accountStats?.netBalance || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Updates */}
      <RealTimeNotifications isConnected={true} />

      {/* Transactions */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Transactions</h2>
        {transactionsLoading ? (
          <TransactionSkeleton />
        ) : transactions.length > 0 ? (
          <ul className="space-y-3">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex justify-between items-center border-b pb-2"
              >
                <span>{tx.description}</span>
                <span
                  className={
                    tx.type === "income" ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatCurrency(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No transactions found.</p>
        )}
      </div>
     </div>      
    </div>
  );
}
