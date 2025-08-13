import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Share2, Bell, Plus, Minus, UserPlus, FileText, FileSpreadsheet, Users } from "lucide-react";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import ExportButtons from "@/components/ExportButtons";
import type { TransactionWithSplits, GroupWithMembers } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("personal");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    dateRange: "month",
    category: "all",
    startDate: "",
    endDate: "",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", filters],
    enabled: !!user,
    retry: false,
  });

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/groups"],
    enabled: !!user,
    retry: false,
  });

  // Fetch monthly stats
  const { data: monthlyStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/monthly"],
    enabled: !!user,
    retry: false,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-income rounded-lg flex items-center justify-center">
                <Share2 className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">ExpenseShare</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName || user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-expense hover:bg-red-600 text-white" 
                  onClick={() => setIsExpenseModalOpen(true)}
                  data-testid="button-add-expense"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
                <Button 
                  className="w-full bg-income hover:bg-green-600 text-white"
                  onClick={() => setIsIncomeModalOpen(true)}
                  data-testid="button-add-income"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Income
                </Button>
                <Button 
                  className="w-full bg-warning hover:bg-yellow-500 text-white"
                  data-testid="button-invite-roommate"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Roommate
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Summary */}
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Income</span>
                      <span className="text-lg font-semibold text-income" data-testid="text-total-income">
                        {formatCurrency(monthlyStats?.totalIncome || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Expenses</span>
                      <span className="text-lg font-semibold text-expense" data-testid="text-total-expenses">
                        {formatCurrency(monthlyStats?.totalExpenses || 0)}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Net Balance</span>
                        <span className="text-lg font-bold text-income" data-testid="text-net-balance">
                          {formatCurrency(monthlyStats?.netBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent>
                <ExportButtons filters={filters} />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <Card className="mb-6">
                <div className="border-b border-gray-200">
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                    <TabsTrigger 
                      value="personal" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-4"
                      data-testid="tab-personal"
                    >
                      <span className="mr-2">👤</span>
                      Personal
                    </TabsTrigger>
                    <TabsTrigger 
                      value="shared" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-4"
                      data-testid="tab-shared"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Shared with Roommates
                      <Badge className="ml-2 bg-warning text-white" data-testid="badge-active-groups">
                        {groups.length} Active Groups
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Filters */}
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search-filter">Filter by Name</Label>
                      <Input
                        id="search-filter"
                        placeholder="Search transactions..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        data-testid="input-search-filter"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="date-range-filter">Date Range</Label>
                      <Select 
                        value={filters.dateRange} 
                        onValueChange={(value) => handleFilterChange('dateRange', value)}
                      >
                        <SelectTrigger id="date-range-filter" data-testid="select-date-range">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="quarter">This Quarter</SelectItem>
                          <SelectItem value="year">This Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="category-filter">Category</Label>
                      <Select 
                        value={filters.category} 
                        onValueChange={(value) => handleFilterChange('category', value)}
                      >
                        <SelectTrigger id="category-filter" data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="food">Food & Dining</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {filters.dateRange === 'custom' && (
                    <div className="mt-4 flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="start-date">From Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                          data-testid="input-start-date"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="end-date">To Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Personal Tab */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Transactions</CardTitle>
                    <span className="text-sm text-gray-500" data-testid="text-transaction-count">
                      {transactions.length} transactions found
                    </span>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4">
                            <div className="flex items-center space-x-3">
                              <Skeleton className="w-10 h-10 rounded-lg" />
                              <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                            <div className="text-right">
                              <Skeleton className="h-4 w-20 mb-2" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500" data-testid="text-no-transactions">
                        No transactions found. Add your first expense or income!
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {transactions.map((transaction: TransactionWithSplits) => (
                          <div 
                            key={transaction.id} 
                            className="px-6 py-4 hover:bg-gray-50 transition-colors"
                            data-testid={`transaction-${transaction.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                  transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {getTransactionIcon(transaction.category || '', transaction.type)}
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900" data-testid={`text-description-${transaction.id}`}>
                                    {transaction.description}
                                  </h3>
                                  <p className="text-sm text-gray-500" data-testid={`text-date-${transaction.id}`}>
                                    {new Date(transaction.date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-semibold ${
                                  transaction.type === 'income' ? 'text-income' : 'text-expense'
                                }`} data-testid={`text-amount-${transaction.id}`}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </div>
                                <div className="text-xs text-gray-500" data-testid={`text-category-${transaction.id}`}>
                                  {transaction.category || 'Other'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Shared Tab */}
              <TabsContent value="shared">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <Skeleton className="h-6 w-32 mb-4" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                          <Skeleton className="h-8 w-full mt-4" />
                        </CardContent>
                      </Card>
                    ))
                  ) : groups.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500" data-testid="text-no-groups">
                      No shared groups yet. Create a group to start sharing expenses with roommates!
                    </div>
                  ) : (
                    groups.map((group: GroupWithMembers) => (
                      <Card key={group.id} data-testid={`group-card-${group.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900" data-testid={`text-group-name-${group.id}`}>
                              {group.name}
                            </h3>
                            <Badge className="bg-green-100 text-green-800" data-testid={`text-member-count-${group.id}`}>
                              {group.memberCount} members
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Shared</span>
                              <span className="font-medium" data-testid={`text-total-shared-${group.id}`}>
                                {formatCurrency(group.totalShared || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">You owe</span>
                              <span className="font-medium text-expense" data-testid={`text-you-owe-${group.id}`}>
                                {formatCurrency(group.youOwe || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Others owe you</span>
                              <span className="font-medium text-income" data-testid={`text-others-owe-${group.id}`}>
                                {formatCurrency(group.othersOwe || 0)}
                              </span>
                            </div>
                          </div>
                          <Button 
                            className="w-full mt-4 bg-primary hover:bg-blue-700 text-white"
                            data-testid={`button-view-details-${group.id}`}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 flex items-center space-x-2" data-testid="sync-status">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Synced</span>
      </div>

      {/* Modals */}
      <AddExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)}
        groups={groups}
      />
      
      <AddIncomeModal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)} 
      />
    </div>
  );
}
