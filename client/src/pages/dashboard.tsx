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
import { useCurrencyFormatter } from "@/hooks/useProfile";
import { Share2, Plus, Minus, Users, Calendar, DollarSign, TrendingUp, Download, Settings, User, ChevronDown, Filter, FileText, X, MoreVertical, Edit2, Trash2 } from "lucide-react";
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
import { get } from "http";
import { group } from "console";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import Filters from "@/components/Filters";
import { Link } from "wouter";
import { useMonthlyStats } from "@/hooks/useMonthlyStats";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function Dashboard() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const auth = useAuth();
  const profile = (auth.user as any)?.profile;

  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("groups");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  // Add state for edit modal
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithSplits | null>(null);
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
       <Header
              isConnected={isConnected}
              profile={profile}
              auth={auth}
              setIsIncomeModalOpen={setIsIncomeModalOpen}
              setIsExpenseModalOpen={setIsExpenseModalOpen}
            />
      {/* Main Content */}
      <div className="mflex-1 max-w-7xl mx-auto px-2 sm:px-6 lg:px-4 py-4 w-full">
        {/* Export Navigation - Eye-catching position */}
        <ExportButtons filters={filters} />
       

        {/* Real-time Notifications */}
        {/* <RealTimeNotifications isConnected={isConnected} /> */}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2"> 
            <TabsTrigger value="groups" data-testid="tab-groups">Group Accounts</TabsTrigger>
            <TabsTrigger value="personal" data-testid="tab-personal">Personal Account</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
          <Card className="p-2">
             {/* Date Range Filters */}
              <Filters filters={filters} handleFilterChange={handleFilterChange} members={[]}/>
              {/* Stats Cards */}
              {statsLoading ? (
                <StatsSkeleton />
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <Card className="card-hover pb-2">
                  <CardHeader className="flex flex-row items-center justify-between p-2 pl-6 pr-6">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent className="p-0 pl-6 pr-6">
                    <div className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-total-income">
                      {formatCurrency(monthlyStats?.totalIncome || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover pb-2">
                  <CardHeader className="flex flex-row items-center justify-between p-2 pl-6 pr-6 ">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent className="p-0 pl-6 pr-6">
                    <div className="text-xl sm:text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                      {formatCurrency(monthlyStats?.totalExpenses || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover pb-2">
                  <CardHeader className="flex flex-row items-center justify-between p-2 pl-6 pr-6">
                    <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                    <Calendar className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent className="p-0 pl-6 pr-6">
                    <div
                      className={`text-xl sm:text-2xl font-bold ${
                        parseFloat(monthlyStats?.netBalance || "0") >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                      data-testid="text-net-balance"
                    >
                      {formatCurrency(monthlyStats?.netBalance || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}

            {/* Recent Transactions */}
             <div className="bg-white shadow rounded-lg p-2">
              <CardHeader className="p-2">
              <CardTitle className="text-base sm:text-lg md:text-xl">
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {transactionsLoading ? (
                <div className="space-y-4">
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
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No transactions found. Add your first expense or income!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-start justify-between p-2 border rounded-lg gap-3"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      {/* Left section */}
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="text-xl shrink-0">
                          {getTransactionIcon(transaction.category || "", transaction.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{transaction.description}</h3>
                          <div className="mt-1 text-xs sm:text-sm text-gray-500 flex flex-wrap items-center ">
                            {transaction.category && (
                              <Badge variant="secondary">{transaction.category}</Badge>
                            )} 
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-gray-500 flex flex-wrap items-center">
                        </div>
                          <span className="whitespace-nowrap mt-1 text-xs sm:text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()} • Paid by{" "}
                              {transaction.paidBy}
                          </span> 
                        </div>
                      </div>

                      {/* Right section (amount) */}
                      <div className="flex flex-col items-end shrink-0 text-right space-y-1">
                        <div
                          className={`text-base sm:text-lg font-semibold text-right ${
                            transaction.type === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </div> 
                        <div className="flex space-x-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTransaction(transaction)}
                              className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this transaction?")) {
                                  deleteMutation.mutate(transaction.id);
                                }
                              }}
                              className="flex items-center space-x-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
             </div>
            
          </Card>
        </TabsContent>

        {/* Group Accounts */}
          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Group Accounts
                  </div>
                  <Button
                    onClick={() => setIsGroupModalOpen(true)}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                    data-testid="button-create-group"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Group
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {groupsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No groups yet. Create an Accounts to share expenses with friends!</p>
                  </div>
                ) : (
                  <div className="space-y-4 ">
                    {groups.map((group) => (
                      <div key={group.id} className="p-4 border rounded-lg bg-gray-50 gradient-to-br from-gray-50 to-gray-100" data-testid={`group-${group.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Link href={`/account/${group.id}`}>
                              <h3 className="font-medium">{group.name}</h3>
                              <p className="text-sm text-gray-500">
                                {group.memberCount} members
                                {group.description && ` • ${group.description}`}
                              </p>
                            </Link>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Button size="sm" variant="outline" onClick={() => deleteGroup(group.id)}>Delete</Button>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedGroup(group);
                                setInviteModalOpen(true);
                              }}
                              data-testid={`button-invite-${group.id}`}
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Invite
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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