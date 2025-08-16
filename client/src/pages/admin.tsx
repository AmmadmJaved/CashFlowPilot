import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Activity, AlertTriangle, Plus, Search, Filter } from "lucide-react";
import { formatDistance } from "date-fns";

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [suspendReason, setSuspendReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Check if user is admin
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const isAdmin = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'super_admin';
  const isSuperAdmin = (currentUser as any)?.role === 'super_admin';

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", { search: searchQuery, status: statusFilter !== 'all' ? statusFilter : undefined, role: roleFilter !== 'all' ? roleFilter : undefined }],
    enabled: isAdmin,
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/admin/analytics"],
    enabled: isAdmin,
  });

  // Fetch admin logs
  const { data: logsData } = useQuery({
    queryKey: ["/api/admin/logs"],
    enabled: isAdmin,
  });

  // Mutations
  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User suspended successfully" });
      setSelectedUser(null);
      setSuspendReason("");
    },
    onError: () => {
      toast({ title: "Failed to suspend user", variant: "destructive" });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User activated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to activate user", variant: "destructive" });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/make-admin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User promoted to admin successfully" });
    },
    onError: () => {
      toast({ title: "Failed to promote user", variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Please log in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-4">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Access Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">You don't have permission to access this admin panel.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'deleted':
        return <Badge variant="secondary">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="bg-purple-100 text-purple-800">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Admin</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage users, view analytics, and monitor system activity
            </p>
          </div>
        </div>

        {/* Analytics Overview */}
        {(analytics as any)?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics as any)?.[0]?.totalUsers || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics as any)?.[0]?.activeUsers || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics as any)?.[0]?.newUsers || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics as any)?.[0]?.totalTransactions || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, permissions, and access control
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-users"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32" data-testid="select-role-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="super_admin">Super Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : (usersData as any)?.users?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        (usersData as any)?.users?.map((user: any) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.profileImageUrl || '/default-avatar.png'}
                                  alt={user.firstName || 'User'}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>{getStatusBadge(user.status)}</TableCell>
                            <TableCell>
                              {user.lastLoginAt 
                                ? formatDistance(new Date(user.lastLoginAt), new Date(), { addSuffix: true })
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {user.status === 'active' ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setSelectedUser(user)}
                                        data-testid={`button-suspend-${user.id}`}
                                      >
                                        Suspend
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Suspend User</DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to suspend {user.firstName} {user.lastName}?
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Reason for suspension</Label>
                                          <Textarea
                                            value={suspendReason}
                                            onChange={(e) => setSuspendReason(e.target.value)}
                                            placeholder="Enter reason for suspension..."
                                            data-testid="textarea-suspend-reason"
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="destructive"
                                          onClick={() => suspendUserMutation.mutate({ userId: user.id, reason: suspendReason })}
                                          disabled={suspendUserMutation.isPending}
                                          data-testid="button-confirm-suspend"
                                        >
                                          {suspendUserMutation.isPending ? "Suspending..." : "Suspend User"}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                ) : user.status === 'suspended' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => activateUserMutation.mutate(user.id)}
                                    disabled={activateUserMutation.isPending}
                                    data-testid={`button-activate-${user.id}`}
                                  >
                                    {activateUserMutation.isPending ? "Activating..." : "Activate"}
                                  </Button>
                                ) : null}
                                
                                {isSuperAdmin && user.role === 'user' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => makeAdminMutation.mutate(user.id)}
                                    disabled={makeAdminMutation.isPending}
                                    data-testid={`button-make-admin-${user.id}`}
                                  >
                                    {makeAdminMutation.isPending ? "Promoting..." : "Make Admin"}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>
                  Overview of system usage and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(analytics as any)?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(analytics as any)?.slice(0, 10).map((stat: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {stat.date}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Users:</span>
                            <span className="font-medium">{stat.totalUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Active Users:</span>
                            <span className="font-medium">{stat.activeUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">New Users:</span>
                            <span className="font-medium">{stat.newUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
                            <span className="font-medium">{stat.totalTransactions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Recent administrative actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(logsData as any)?.logs?.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(logsData as any)?.logs?.map((log: any) => (
                          <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.action.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.adminEmail}</TableCell>
                            <TableCell>{log.targetUserId || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                            <TableCell>
                              {formatDistance(new Date(log.createdAt), new Date(), { addSuffix: true })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No activity logs available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}