import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter, useProfile } from "@/hooks/useProfile";
import { Share2, Plus, Minus, Users, Calendar, DollarSign, TrendingUp, Download, Settings, User, ChevronDown, Filter, FileText, X, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import AddGroupModal from "@/components/AddGroupModal";
import { SimpleInviteModal } from "@/components/SimpleInviteModal";
import { SettingsModal } from "@/components/SettingsModal";
import ExportButtons from "@/components/ExportButtons";
import RealTimeNotifications from "@/components/RealTimeNotifications";
import { useWebSocket } from "@/hooks/useWebSocket";
import AnimatedTransactionItem from "@/components/AnimatedTransactionItem";
import { TransactionSkeleton, StatsSkeleton } from "@/components/AnimatedSkeleton";
import AnimatedButton from "@/components/AnimatedButton";
import PWAInstallBanner, { PWAInstallButton } from "@/components/PWAInstallBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TransactionWithSplits, GroupWithMembers } from "@shared/schema";
import { useAuth } from "react-oidc-context";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import Filters from "@/components/Filters";
import { Link } from "wouter";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { applyThemeMode, getStoredThemeMode, type ThemeMode } from "@/lib/themeMode";

export default function Dashboard() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const { profile: storedProfile } = useProfile();
  const auth = useAuth();
  const authProfile = (auth.user as any)?.profile || {};
  const resolvedPublicName =
    storedProfile?.publicName?.trim() ||
    authProfile?.name?.trim() ||
    [authProfile?.given_name, authProfile?.family_name].filter(Boolean).join(" ").trim() ||
    (storedProfile?.email || authProfile?.email || "").split("@")[0] ||
    "User";
  const profile = {
    ...authProfile,
    ...(storedProfile || {}),
    publicName: resolvedPublicName,
    email: storedProfile?.email || authProfile?.email || "",
    id: storedProfile?.id || authProfile?.sub,
  };

  useEffect(() => {
    const mode = (storedProfile?.theme as ThemeMode | undefined) || getStoredThemeMode();
    applyThemeMode(mode);
  }, [storedProfile?.theme]);

  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("groups");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>("");
  // Add state for edit modal
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<any | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    groupId: "all",
    dateRange: "month",
    category: "all",
    type: "all", // all, income, expense
    paidBy: "all", // filter by person name
    startDate: "",
    endDate: "",
    onlyUser: false, // checkbox for "Only User"
    onlyGroupMembers: false, // checkbox for "Only Group Members"
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filteredTransactionCount, setFilteredTransactionCount] = useState(0);
async function fetchTransactions(filters: any, token: string) {
  const params = new URLSearchParams();
  if (filters.search) params.append("search", filters.search);
  if (filters.groupId && filters.groupId !== "all") params.append("groupId", filters.groupId);
  if (filters.category && filters.category !== "all") params.append("category", filters.category);
  if (filters.type && filters.type !== "all") params.append("type", filters.type);
  if (filters.paidBy && filters.paidBy !== "all") params.append("paidBy", filters.paidBy);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const res = await fetch(`/api/transactions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

// In your component
const token = auth.user?.id_token; // or access_token depending on your config

const {
  data: transactions = [],
  isLoading: transactionsLoading,
} = useQuery<TransactionWithSplits[]>({
  queryKey: [
    "/api/transactions",
    filters.search,
    filters.groupId,
    filters.dateRange,
    filters.category,
    filters.type,
    filters.paidBy,
    filters.startDate,
    filters.endDate,
    token, // include token so query refetches if it changes
  ],
  queryFn: () => fetchTransactions(filters, token!),
  enabled: !!token, // only run if token is available
  retry: false,
});

  // First define the fetch functions
async function fetchGroups(token: string) {
  const res = await fetch('/api/groups', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

// Fetch groups with token
const { data: groups = [], isLoading: groupsLoading } = useQuery<GroupWithMembers[]>({
  queryKey: ['/api/groups', token],
  queryFn: () => fetchGroups(token!),
  enabled: !!token,
  retry: false,
});


// Define variables for stats filters
const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
const userId = profile?.id;
const groupId = filters.groupId !== "all" ? filters.groupId : undefined;

// Fetch monthly stats with token
const { data: monthlyStats, isLoading: statsLoading } = useMonthlyStats(token ?? null, {
    startDate,
    endDate,
    userId,
    groupId,
  });

  const handleFilterChange = (key: string, value: string | boolean | string[] | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // update group name mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update group');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Group updated', description: 'Group name updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setEditingGroupId(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to update group', variant: 'destructive' });
    }
  });

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


  const clearAllFilters = () => {
    setFilters({
      search: "",
      groupId: "all",
      dateRange: "month",
      category: "all",
      type: "all",
      paidBy: "all",
      startDate: "",
      endDate: "",
      onlyUser: false,
      onlyGroupMembers: false,
    });
  };
  // Populate filter dropdowns when transactions or groups change
  // (If you need to run side effects, use useEffect instead of useState)
  // Example:
  useEffect(() => {
    if (transactions && groups) {
      console.log("Transactions or groups updated:", transactions, groups);
      // Do something here
    }
  }, [transactionsLoading, groupsLoading]);

  // Get all unique users from transactions and group members
  const allUsers = Array.from(new Set([
    ...(transactions || []).map(t => t.paidBy),
    ...(groups || []).flatMap(g => g.members?.map(m => m.name) || [])
  ])).filter(Boolean);

  const groupMembers = Array.from(new Set(
    (groups || []).flatMap(g => g.members?.map(m => m.name) || [])
  )).filter(Boolean);


  // Currency formatting is now handled by the useProfile hook

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
  // delete group function
  const deleteGroup = async (groupId: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete group');
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      // If the deleted group was selected in filters, reset to 'all'
      if (filters.groupId === groupId) {
        setFilters(prev => ({ ...prev, groupId: 'all' }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="internal-theme-bg flex flex-col min-h-screen text-foreground">
      {/* Header */}
       <Header
              isConnected={isConnected}
              profile={profile}
              auth={auth}
              setIsIncomeModalOpen={setIsIncomeModalOpen}
              setIsExpenseModalOpen={setIsExpenseModalOpen}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
      {/* Main Content */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:px-5">
        {/* Export / Title Row */}
        <ExportButtons filters={filters} />

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile-only tabs (desktop tabs in header) */}
          <TabsList className="sm:hidden grid w-full grid-cols-2 p-1 rounded-xl bg-muted">
            <TabsTrigger value="groups" data-testid="tab-groups" className="rounded-lg data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Group Accounts</TabsTrigger>
            <TabsTrigger value="personal" data-testid="tab-personal" className="rounded-lg data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Personal Account</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
              {/* Stats Row - Clean inline stats like reference */}
              {statsLoading ? (
                <StatsSkeleton />
              ) : (
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
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

              {/* Filters Row */}
              <Filters filters={filters} handleFilterChange={handleFilterChange} members={[]}/>

              {/* Transaction Table */}
              <div className="rounded-xl border border-border bg-card">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-sm font-medium text-muted-foreground">
                  <div className="col-span-5">Transaction</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2 text-right">Expenses</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {/* Transaction Rows */}
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
                              {transaction.category || transaction.type}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View Transaction Modal */}
              {viewingTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="rounded-xl border border-border bg-card p-6 w-96 text-card-foreground shadow-xl">
                    <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
                    <p><strong>ID:</strong> {viewingTransaction.id}</p>
                    <p><strong>Amount:</strong> {viewingTransaction.amount}</p>
                    <p><strong>Type:</strong> {viewingTransaction.type}</p>
                    <p><strong>Date:</strong> {new Date(viewingTransaction.date).toLocaleString()}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setViewingTransaction(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
        </TabsContent>

        {/* Group Accounts */}
          <TabsContent value="groups" className="space-y-4">
            <div className="rounded-xl border border-border bg-card">
              {/* Group Table Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                  <h3 className="font-semibold">Group Accounts</h3>
                </div>
                <Button
                  onClick={() => setIsGroupModalOpen(true)}
                  size="sm"
                  className="rounded-lg bg-cyan-500 px-4 text-slate-950 hover:bg-cyan-400"
                  data-testid="button-create-group"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Group
                </Button>
              </div>

              {/* Column Headers */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Group</div>
                <div className="col-span-2">Members</div>
                <div className="col-span-2">Description</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {/* Group Rows */}
              {groupsLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p>No groups yet. Create an Account to share expenses with friends!</p>
                </div>
              ) : (
                <div>
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                      data-testid={`group-${group.id}`}
                    >
                      {/* Group Name */}
                      <div className="sm:col-span-5">
                        {editingGroupId === group.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              className="w-48"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!editingGroupName.trim()) {
                                  toast({ title: 'Name required', description: 'Group name cannot be empty', variant: 'destructive' });
                                  return;
                                }
                                updateGroupMutation.mutate({ id: group.id, name: editingGroupName.trim() });
                              }}
                              disabled={updateGroupMutation.isPending}
                            >
                              {updateGroupMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGroupId(null);
                              }}
                              disabled={updateGroupMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Link href={`/account/${group.id}`}>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <h3 className="font-medium hover:text-primary transition-colors">{group.name}</h3>
                                <span className="text-xs text-muted-foreground sm:hidden">{group.memberCount} members</span>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>

                      {/* Members count */}
                      <div className="hidden sm:block sm:col-span-2 text-sm text-muted-foreground">
                        {group.memberCount} members
                      </div>

                      {/* Description */}
                      <div className="hidden sm:block sm:col-span-2 text-sm text-muted-foreground truncate">
                        {group.description || "-"}
                      </div>

                      {/* Actions */}
                      <div className="sm:col-span-3 flex justify-end items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingGroupId(group.id);
                            setEditingGroupName(group.name || '');
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGroup(group);
                            setInviteModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          data-testid={`button-invite-${group.id}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGroup(group.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
       
        </Tabs>
      </div>
      {/* Sticky Footer */}
     <Footer />
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
        groups={groups}
      />
      <AddIncomeModal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)} 
        groups={groups}
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
    </div>
  );
}