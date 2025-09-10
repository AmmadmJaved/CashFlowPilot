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

export default function Dashboard() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const auth = useAuth();
  const profile = (auth.user as any)?.profile;

  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();
   const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");
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

async function fetchMonthlyStats(token: string) {
  const res = await fetch('/api/stats/monthly', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch monthly stats');
  return res.json();
}

// Fetch groups with token
const { data: groups = [], isLoading: groupsLoading } = useQuery<GroupWithMembers[]>({
  queryKey: ['/api/groups', token],
  queryFn: () => fetchGroups(token!),
  enabled: !!token,
  retry: false,
});

// Fetch monthly stats with token
const { data: monthlyStats, isLoading: statsLoading } = useQuery<{
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
}>({
  queryKey: ['/api/stats/monthly', token],
  queryFn: () => fetchMonthlyStats(token!),
  enabled: !!token,
  retry: false,
});

  const handleFilterChange = (key: string, value: string | boolean | string[] | null) => {
    debugger;
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

  // Count filtered transactions for reporting
  const filteredTransactions = (transactions || []).filter(transaction => {
    if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }
    if (filters.category !== 'all' && transaction.category !== filters.category) {
      return false;
    }
    if (filters.paidBy !== 'all' && transaction.paidBy !== filters.paidBy) {
      return false;
    }
    if (filters.groupId && transaction.groupId !== filters.groupId) {
      return false;
    }
    if (filters.onlyUser && transaction.paidBy !== profile?.publicName) {
      return false;
    }
    if (filters.onlyGroupMembers && !groupMembers.includes(transaction.paidBy)) {
      return false;
    }

    return true;
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 animate-slide-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-custom hover:scale-110 transition-transform duration-300">
                  <Share2 className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight animate-fade-in">ExpenseShare</h1>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500 font-medium">
                      {isConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Quick Action Buttons */}
            <div className="hidden md:flex items-center space-x-3 animate-fade-in" style={{ animationDelay: '200ms' } as React.CSSProperties}>
              <div className="flex bg-gray-50 rounded-2xl p-1 shadow-inner card-hover">
                <AnimatedButton
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-2"
                  size="sm"
                  pulseOnHover={true}
                  data-testid="button-add-income"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Income
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-2 ml-2"
                  size="sm"
                  pulseOnHover={true}
                  data-testid="button-add-expense"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Expense
                </AnimatedButton>
              </div>
            </div>

            {/* Right side - Profile menu */}
            <div className="flex items-center space-x-3">
              {/* Mobile quick actions */}
              <div className="flex md:hidden space-x-2">
                <Button
                  onClick={() => setIsIncomeModalOpen(true)}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 rounded-full w-10 h-10 p-0"
                  data-testid="button-add-income-mobile"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setIsExpenseModalOpen(true)}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 rounded-full w-10 h-10 p-0"
                  data-testid="button-add-expense-mobile"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors" data-testid="button-profile-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold">
                        {profile?.publicName?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {profile?.publicName || 'User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {profile?.currency || 'PKR'} • {profile?.language?.toUpperCase() || 'EN'}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{profile?.publicName || 'User'}</p>
                    <p className="text-xs text-gray-500">{profile?.email || 'No email set'}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <SettingsModal>
                      <div className="flex items-center w-full cursor-pointer" data-testid="menu-settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings & Preferences
                      </div>
                    </SettingsModal>
                  </DropdownMenuItem>
                  {((auth?.user as any)?.role === 'admin' || (auth?.user as any)?.role === 'super_admin') && (
                    <DropdownMenuItem asChild>
                      <a href="/admin" className="flex items-center w-full cursor-pointer" data-testid="menu-admin-panel">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Panel
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button 
                      variant="destructive" 
                      onClick={() => auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin })}
                      className="w-full"
                    >
                      Sign Out
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-gray-500" disabled>
                    <User className="w-4 h-4 mr-2" />
                    Profile ID: {profile?.id?.slice(0, 8) || 'Loading...'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" style={{ animationDelay: '300ms' } as React.CSSProperties}>
        {/* Stats Cards */}
        {statsLoading ? (
          <StatsSkeleton />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600" data-testid="text-total-income">
                {formatCurrency(monthlyStats?.totalIncome || 0)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                {formatCurrency(monthlyStats?.totalExpenses || 0)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  parseFloat(monthlyStats?.netBalance || "0") >= 0 ? "text-green-600" : "text-red-600"
                }`}
                data-testid="text-net-balance"
              >
                {formatCurrency(monthlyStats?.netBalance || 0)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Export Navigation - Eye-catching position */}
        <ExportButtons filters={filters} />

        {/* Real-time Notifications */}
        <RealTimeNotifications isConnected={isConnected} />

        {/* Advanced Filters & Financial Reports */}
        <Card className="mb-6 card-hover animate-slide-in" style={{ animationDelay: '800ms' } as React.CSSProperties}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Advanced Filters & Financial Reports
              </div>
              <div className="flex items-center gap-2">
                {filteredTransactions.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {filteredTransactions.length} transactions found
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-sm"
                >
                  {showAdvancedFilters ? "Hide" : "Show"} Filters
                </Button>
                {(filters.search || filters.groupId || filters.type !== 'all' || filters.category !== 'all' ||
                  filters.paidBy !== 'all' || filters.onlyUser || filters.onlyGroupMembers) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showAdvancedFilters && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div>
                <Label htmlFor="group">Group</Label>
                <Select
                  value={filters.groupId || 'all'}
                  onValueChange={(value) => handleFilterChange("groupId", value)}
                >
                  <SelectTrigger data-testid="select-group">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.members?.length || 0} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>  

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">💰 Income</SelectItem>
                    <SelectItem value="expense">💳 Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {/* Expense Categories */}
                    <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                    <SelectItem value="utilities">⚡ Utilities</SelectItem>
                    <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                    <SelectItem value="transportation">🚗 Transportation</SelectItem>
                    <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
                    <SelectItem value="education">📚 Education</SelectItem>
                    {/* Income Categories */}
                    <SelectItem value="salary">💼 Salary/Wages</SelectItem>
                    <SelectItem value="freelance">💻 Freelance</SelectItem>
                    <SelectItem value="business">🏢 Business</SelectItem>
                    <SelectItem value="investment">📈 Investment</SelectItem>
                    <SelectItem value="rental">🏠 Rental</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
                  <SelectTrigger data-testid="select-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                </div>

                {/* User Selection Section */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-base font-semibold mb-3 block">Filter by Transaction Source</Label>
                  
                  {/* Quick Filter Checkboxes */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="only-user"
                        checked={filters.onlyUser}
                        onCheckedChange={(checked) => handleFilterChange("onlyUser", checked)}
                        data-testid="checkbox-only-user"
                      />
                      <Label htmlFor="only-user" className="text-sm font-medium">
                        👤 Only My Transactions ({profile?.publicName || 'User'})
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="only-group-members"
                        checked={filters.onlyGroupMembers}
                        onCheckedChange={(checked) => handleFilterChange("onlyGroupMembers", checked)}
                        data-testid="checkbox-only-group-members"
                      />
                      <Label htmlFor="only-group-members" className="text-sm font-medium">
                        👥 Only Group Members ({groupMembers.length} members)
                      </Label>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="mb-2 font-medium">📊 Filter by Transaction Source:</p>
                    <ul className="text-xs space-y-1">
                      <li>• <strong>Only My Transactions:</strong> Show transactions you paid for or received</li>
                      <li>• <strong>Only Group Members:</strong> Show transactions from people in your shared groups</li>
                      <li>• Use both filters together to see specific combinations</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* Financial Report Summary */}
            {filteredTransactions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mt-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Financial Report Ready</h4>
                    <p className="text-sm text-blue-700">
                      {filteredTransactions.length} transactions • 
                      Income: {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0))} • 
                      Expenses: {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Use export buttons above to generate reports</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

            {showAdvancedFilters && filters.dateRange === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-slide-in" style={{ animationDelay: '700ms' } as React.CSSProperties}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" data-testid="tab-personal">Personal Expenses</TabsTrigger>
            <TabsTrigger value="groups" data-testid="tab-groups">Shared Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl">
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      {/* Left section */}
                      <div className="flex items-start sm:items-center space-x-3 flex-1">
                        <div className="text-xl sm:text-2xl shrink-0">
                          {getTransactionIcon(transaction.category || "", transaction.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{transaction.description}</h3>
                          <div className="mt-1 text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-2">
                            <span className="whitespace-nowrap">
                              {new Date(transaction.date).toLocaleDateString()} • Paid by{" "}
                              {transaction.paidBy}
                            </span>
                            {transaction.category && (
                              <Badge variant="secondary">{transaction.category}</Badge>
                            )}
                            {transaction.groupId ? (
                              <Badge variant="outline">
                                Shared:{" "}
                                {groups.find((group) => group.id === transaction.groupId)?.name}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Personal</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right section (amount) */}
                      <div className="flex items-center space-x-4">
                      <div
                        className={`text-base sm:text-lg font-semibold text-right ${
                          transaction.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this transaction?")) {
                                deleteMutation.mutate(transaction.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                     </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Expense Groups
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
              <CardContent>
                {groupsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No groups yet. Create a group to share expenses with friends!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <div key={group.id} className="p-4 border rounded-lg" data-testid={`group-${group.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{group.name}</h3>
                            <p className="text-sm text-gray-500">
                              {group.memberCount} members
                              {group.description && ` • ${group.description}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Total Shared</p>
                              <p className="font-semibold">{formatCurrency(group.totalShared || 0)}</p>
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

      {/* Add EditTransactionModal */}
      {editingTransaction && (
        <EditTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          groups={groups}
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