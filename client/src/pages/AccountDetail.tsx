// src/components/AccountDetail.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Calendar, Share2, Edit2, Trash2, ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter, useProfile } from "@/hooks/useProfile";
import { GroupWithMembers, TransactionWithSplits,GroupMember } from "@shared/schema";
import Filters from "@/components/Filters";

import RealTimeNotifications from "@/components/RealTimeNotifications";
import { TransactionSkeleton, StatsSkeleton } from "@/components/AnimatedSkeleton";
import ExportButtons from "@/components/ExportButtons";
import Header from "@/components/Header";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Skeleton } from "@/components/ui/skeleton";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import AddGroupModal from "@/components/AddGroupModal";
import { SimpleInviteModal } from "@/components/SimpleInviteModal";
import { useLocation  } from "wouter";
import Footer from "@/components/Footer";
import MembersBalanceModal from "@/components/MembersBalanceModal";
import ViewTransactionModal from "@/components/ViewTransactionModal";
import { applyThemeMode, getStoredThemeMode, type ThemeMode } from "@/lib/themeMode";


interface MemberWithBalance  {
  id: string;
  name: string;
  openingBalance: number;
} 
type AccountDetailProps = {
  accountId: string;
};
export default function AccountDetail({ accountId }: AccountDetailProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const { profile: storedProfile } = useProfile();
  const auth = useAuth();
  const authProfile = (auth.user as any)?.profile || {};
  const profile = {
    ...authProfile,
    ...(storedProfile || {}),
  };
  const queryClient = useQueryClient();
 const { isConnected } = useWebSocket();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [ismembersBalanceModalOpen, setMemberBalanceModalOpen] = useState(false);
  // Add state for edit modal
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<any | null>(null);
  const token = auth.user?.id_token;
   const [filters, setFilters] = useState({
    search: "",
    groupId: "all",
    dateRange: "month",
    category: "all",
    type: "all", // all, income, expense
    paidBy: "all", // filter by person name
    startDate: "",
    endDate: "",
  });
  const [, navigate] = useLocation();

  useEffect(() => {
    const mode = (storedProfile?.theme as ThemeMode | undefined) || getStoredThemeMode();
    applyThemeMode(mode);
  }, [storedProfile?.theme]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back(); // browser-native back
    } else {
      navigate("/"); // fallback route
    }
  };

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
    if(filters.paidBy && filters.paidBy !== "all") params.append("filterUser", filters.paidBy);

    const res = await fetch(`/api/accounts/${accountId}/transactions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch account transactions");
    return res.json();
  }

  // Define variables for stats filters
  const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
  const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
  const userId = profile?.id;
  // const groupId = filters.groupId !== "all" ? filters.groupId : undefined;

// Fetch monthly stats with token
  const { data: monthlyStats, isLoading: statsLoading } = useMonthlyStats(token ?? null, {
    startDate,
    endDate,
    userId,
    groupId: accountId, // must be groupId to get stats for this account
  });

  const { data: transactions = [], isLoading: transactionsLoading } =
    useQuery<TransactionWithSplits[]>({
      queryKey: ["/api/accounts/transactions", accountId, filters, token],
      queryFn: () => fetchTransactions(filters, token!),
      enabled: !!token,
    });

      // First define the fetch functions
    async function fetchGroups(token: string) {
      const res = await fetch(`/api/groups/${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch groups');
      return res.json();
    }
    
    // Fetch groups with token
    const { data: group , isLoading: groupLoading } = useQuery<GroupWithMembers>({
      queryKey: [`/api/groups/${accountId}`, token],
      queryFn: () => fetchGroups(token!),
      enabled: !!token
    });


  // group members map and set with usestate 

  const [members, setMembers] = useState<MemberWithBalance[]>([]);
 useEffect(() => {
  if (group?.members) {
    setMembers(
      group.members.map((m) => ({
        id: m.id,
        name: m.name,
        openingBalance: Number(m.openingBalance),
      }))
    );
  }
}, [group]);



    const getTransactionIcon = (category: string, type: string) => {
    if (type === 'income') return '💰';
    
    switch (category) {
      case 'food': return '🍽️';
      case 'utilities': return '⚡';
      case 'entertainment': return '🎬';
      case 'transportation': return '🚗';
      default: return '💳';
    }
  };
const handleSaveBalances = (updatedMembers: MemberWithBalance[]) => {
  setMembers(updatedMembers);
  console.log("Updated Balances:", updatedMembers);
  // TODO: call API to persist changes
};

    // Add delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${accountId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-members/${accountId}`] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="internal-theme-bg min-h-screen text-foreground">
      {/* Header */}
      <Header
        isConnected={isConnected}
        profile={profile}
        auth={auth}
        setIsIncomeModalOpen={setIsIncomeModalOpen}
        setIsExpenseModalOpen={setIsExpenseModalOpen}
      />
     <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-4 py-4">
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>    
        <h1 className="text-xl font-bold text-foreground">{group?.name}</h1>
        <div className="flex items-center">
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => {
              setSelectedGroup(group?group:null);
              setMemberBalanceModalOpen(true);
            }}
          >
            Members
          </Button>
        </div>
      </div>

      {/* Filters + Export */}
      <ExportButtons filters={filters} />
      <Filters filters={filters} handleFilterChange={handleFilterChange} members={members} />

      {/* Stats */}
      {statsLoading ? (
                <StatsSkeleton />
              ) : (
              <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6">
                <div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-500" data-testid="text-total-income">
                    {formatCurrency(monthlyStats?.totalIncome || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Total Income</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyan-500">
                    {formatCurrency(monthlyStats?.netBalance || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Net Balance</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-500" data-testid="text-total-expenses">
                    {formatCurrency(monthlyStats?.totalExpenses || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Total Expenses</p>
                </div>
              </div>
              )}

      {/* Real-time Updates */}
      {/* <RealTimeNotifications isConnected={true} /> */}

      {/* Transactions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Transactions</h2>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border text-sm font-medium text-muted-foreground">
          <div className="col-span-5">Transaction</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Expenses</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

              {transactionsLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[180px] sm:w-[200px]" />
                        <Skeleton className="h-4 w-[80px] sm:w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p>No transactions found. Add your first expense or income!</p>
                </div>
              ) : (
                <div>
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      {/* Transaction info */}
                      <div className="sm:col-span-5 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                          {getTransactionIcon(transaction.category || "", transaction.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{transaction.description}</h3>
                          <span className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                            {transaction.type === "income" ? " • Received by " : " • Paid by "}
                            {transaction.paidBy}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="sm:col-span-2 text-right">
                        <span className="font-semibold">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      {/* Expense display */}
                      <div className="sm:col-span-2 text-right">
                        <span className={`font-semibold ${
                          transaction.type === "income" ? "text-green-500" : "text-red-500"
                        }`}>
                          {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="sm:col-span-3 flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingTransaction(transaction)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {transaction.paidBy === auth.user?.profile?.name && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTransaction(transaction)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this transaction?")) {
                                  deleteMutation.mutate(transaction.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Transaction Modal */}
              {viewingTransaction && (
                <ViewTransactionModal
                  transaction={viewingTransaction}
                  onClose={() => setViewingTransaction(null)}
                />
              )}
            {/* Footer */}
            <Footer groups={group ? [group] : []}/>
            {/* Add EditTransactionModal */}
                  {editingTransaction && (
                    <EditTransactionModal
                      isOpen={!!editingTransaction}
                      onClose={() => setEditingTransaction(null)}
                      transaction={editingTransaction}
                    />
                  )}

                  {/* Modals */}
                        <AddExpenseModal 
                          isOpen={isExpenseModalOpen} 
                          onClose={() => setIsExpenseModalOpen(false)} 
                          groups={group ? [group] : []}
                        />
                        <AddIncomeModal 
                          isOpen={isIncomeModalOpen} 
                          onClose={() => setIsIncomeModalOpen(false)} 
                          groups={group ? [group] : []}
                        />
                        <AddGroupModal 
                          isOpen={isGroupModalOpen} 
                          onClose={() => setIsGroupModalOpen(false)} 
                        />
                        {inviteModalOpen && selectedGroup && (
                          <SimpleInviteModal
                            isOpen={inviteModalOpen}
                            onClose={() => setInviteModalOpen(false)}
                            group={selectedGroup}
                          />
                        )}
                        <MembersBalanceModal
                          groupId={accountId}
                        isOpen={ismembersBalanceModalOpen}
                        onClose={() => setMemberBalanceModalOpen(false)}
                        groupName={group?.name || "" }
                        members={members}
                        onSave={handleSaveBalances}
                      />
      </div>
     </div>      
    </div>
    
  );
}
