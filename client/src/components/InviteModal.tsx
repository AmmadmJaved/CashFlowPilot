import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, MessageCircle, Users, Clock, Hash, X, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import type { GroupInvite, GroupWithMembers } from "@shared/schema";

interface InviteModalProps {
  group: GroupWithMembers;
  children: React.ReactNode;
}

export function InviteModal({ group, children }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [invitedBy, setInvitedBy] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set default invited by name when opening
  useEffect(() => {
    if (isOpen && !invitedBy) {
      setInvitedBy("Admin"); // Default name
    }
  }, [isOpen, invitedBy]);

  // Fetch existing invites for the group
  const { data: invites = [], isLoading, error: invitesError } = useQuery({
    queryKey: ['/api/groups', group.id, 'invites'],
    enabled: isOpen,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
  }) as { data: GroupInvite[], isLoading: boolean, error: any };

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: { invitedBy: string; maxUses?: number }) => {
      try {
        console.log("🚀 Starting invite creation for group:", group.id, "with data:", data);
        
        // Add credentials to ensure proper session handling
        const response = await fetch(`/api/groups/${group.id}/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent
          body: JSON.stringify(data),
        });
        
        console.log("📡 Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Invite creation failed:", response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("✅ Invite created successfully:", result);
        return result;
      } catch (error) {
        console.error("🔥 Error in invite creation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Created Successfully! 🎉",
        description: `Invite link created with code: ${data.inviteCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'invites'] });
      setMaxUses(""); // Keep invitedBy for next invite
    },
    onError: (error: any) => {
      console.error("Invite creation error:", error);
      
      let errorMessage = "Failed to create invite link. Please try again.";
      
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        errorMessage = "Please refresh the page and try again - your session may have expired.";
      } else if (error.message.includes("403")) {
        errorMessage = "You don't have permission to create invites for this group.";
      } else if (error.message.includes("400")) {
        errorMessage = "Invalid request. Please check your input and try again.";
      }
      
      toast({
        title: "Invite Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Deactivate invite mutation
  const deactivateInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('PATCH', `/api/invites/${inviteId}/deactivate`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invite Deactivated",
        description: "The invite link has been deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'invites'] });
    },
    onError: (error: any) => {
      console.error("Error deactivating invite:", error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate the invite. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvite = () => {
    console.log("🎯 handleCreateInvite called");
    console.log("📋 Form validation - invitedBy:", invitedBy.trim());
    
    if (!invitedBy.trim()) {
      console.log("❌ Validation failed: No name provided");
      toast({
        title: "Name Required",
        description: "Please enter your name to create an invite.",
        variant: "destructive",
      });
      return;
    }

    const mutationData = {
      invitedBy: invitedBy.trim(),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    };
    
    console.log("🚀 Starting mutation with data:", mutationData);
    createInviteMutation.mutate(mutationData);
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({
        title: "Link Copied! 📋",
        description: "Invite link copied to clipboard successfully!",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy link. Please copy it manually.",
        variant: "destructive",
      });
    });
  };

  const shareViaWhatsApp = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    const message = `Join our expense group "${group.name}"! 💰\n\nClick here to join: ${inviteUrl}\n\nLet's track our expenses together! 🎯`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    const subject = `Join "${group.name}" expense group`;
    const body = `Hi there!\n\nYou've been invited to join our expense group "${group.name}" on ExpenseShare.\n\nClick the link below to join:\n${inviteUrl}\n\nThis will help us track shared expenses and split costs easily!\n\nBest regards!`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Invite Members to "{group.name}"
          </DialogTitle>
          <DialogDescription>
            Create invite links to add new members to this expense group. Members can join without creating an account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Create New Invite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Invite</CardTitle>
              <CardDescription>Generate a new invite link for this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="invitedBy">Your Name</Label>
                <Input
                  id="invitedBy"
                  value={invitedBy}
                  onChange={(e) => setInvitedBy(e.target.value)}
                  placeholder="Enter your name"
                  data-testid="input-invited-by"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  max="100"
                  data-testid="input-max-uses"
                />
              </div>

              <Button 
                onClick={() => {
                  console.log("🔘 Create Invite button clicked!");
                  console.log("📝 Current form values:", { invitedBy, maxUses });
                  handleCreateInvite();
                }}
                disabled={createInviteMutation.isPending || !invitedBy.trim()}
                className="w-full"
                data-testid="button-create-invite"
              >
                {createInviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invite Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Invites */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Active Invites
                <Badge variant="secondary">{invites.length}</Badge>
              </CardTitle>
              <CardDescription>Manage your existing invite links</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading invites...</span>
                </div>
              ) : invitesError ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-red-600">Failed to load invites</p>
                  <p className="text-sm">Please refresh the page and try again</p>
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>No active invites yet</p>
                  <p className="text-sm">Create your first invite above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invites.map((invite: GroupInvite) => (
                    <div key={invite.id} className="p-4 border rounded-lg" data-testid={`invite-${invite.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {invite.inviteCode}
                            </code>
                            <Badge variant={invite.isActive ? "default" : "secondary"}>
                              {invite.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>By: {invite.invitedBy}</span>
                            {invite.maxUses && (
                              <span>Limit: {invite.currentUses || 0}/{invite.maxUses}</span>
                            )}
                            <span>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(invite.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {invite.isActive && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyInviteLink(invite.inviteCode)}
                              data-testid={`button-copy-${invite.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => shareViaWhatsApp(invite.inviteCode)}
                              data-testid={`button-whatsapp-${invite.id}`}
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => shareViaEmail(invite.inviteCode)}
                              data-testid={`button-email-${invite.id}`}
                            >
                              <Share2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateInviteMutation.mutate(invite.id)}
                              disabled={deactivateInviteMutation.isPending}
                              data-testid={`button-deactivate-${invite.id}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}