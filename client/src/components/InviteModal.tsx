import { useState } from "react";
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
import { Copy, Share2, MessageCircle, Users, Clock, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

  // Fetch existing invites for the group
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['/api/groups', group.id, 'invites'],
    enabled: isOpen,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: { invitedBy: string; maxUses?: number }) => {
      console.log("Creating invite for group:", group.id, "data:", data);
      const response = await apiRequest('POST', `/api/groups/${group.id}/invites`, data);
      const result = await response.json();
      console.log("Invite creation result:", result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Invite Created",
        description: "Your invite link has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'invites'] });
      setInvitedBy("");
      setMaxUses("");
    },
    onError: (error: any) => {
      console.error("Error creating invite:", error);
      console.log("Error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      
      const errorMessage = error.message.includes("Unauthorized") 
        ? "You need to log in again to create invites." 
        : "Failed to create invite link. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Deactivate invite mutation
  const deactivateInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('PATCH', `/api/invites/${inviteId}/deactivate`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invite Deactivated",
        description: "The invite link has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'invites'] });
    },
    onError: (error) => {
      console.error("Error deactivating invite:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate invite. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvite = () => {
    if (!invitedBy.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create an invite.",
        variant: "destructive",
      });
      return;
    }

    console.log("Creating invite with data:", {
      invitedBy: invitedBy.trim(),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    });

    createInviteMutation.mutate({
      invitedBy: invitedBy.trim(),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    });
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link Copied",
      description: "Invite link copied to clipboard!",
    });
  };

  const shareViaWhatsApp = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    const message = `Join our expense group "${group.name}"! Click here: ${inviteUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    const subject = `Invitation to join "${group.name}" expense group`;
    const body = `Hi!\n\nYou've been invited to join our expense group "${group.name}". Click the link below to join:\n\n${inviteUrl}\n\nBest regards!`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite Members to {group.name}
          </DialogTitle>
          <DialogDescription>
            Create and share invite links to add new members to your group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Invite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Invite</CardTitle>
              <CardDescription>
                Generate a new invite link to share with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitedBy">Your Name</Label>
                <Input
                  id="invitedBy"
                  placeholder="Enter your name"
                  value={invitedBy}
                  onChange={(e) => setInvitedBy(e.target.value)}
                  data-testid="input-invited-by"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  data-testid="input-max-uses"
                />
              </div>
              <Button 
                onClick={handleCreateInvite}
                disabled={createInviteMutation.isPending}
                className="w-full"
                data-testid="button-create-invite"
              >
                {createInviteMutation.isPending ? "Creating..." : "Create Invite Link"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Invites */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Invites</CardTitle>
              <CardDescription>
                Manage your existing invite links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading invites...
                </div>
              ) : (invites as GroupInvite[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No active invites yet</p>
                  <p className="text-sm">Create your first invite above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(invites as GroupInvite[]).filter((invite: GroupInvite) => invite.isActive).map((invite: GroupInvite) => (
                    <div key={invite.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Created by {invite.invitedBy}</span>
                            {invite.maxUses && (
                              <>
                                <Hash className="w-3 h-3" />
                                <span>{invite.currentUses}/{invite.maxUses} uses</span>
                              </>
                            )}
                            {invite.expiresAt && (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {window.location.origin}/invite/{invite.inviteCode}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateInviteMutation.mutate(invite.id)}
                          disabled={deactivateInviteMutation.isPending}
                          data-testid={`button-deactivate-${invite.id}`}
                        >
                          Deactivate
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.inviteCode)}
                          className="flex-1"
                          data-testid={`button-copy-${invite.inviteCode}`}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareViaWhatsApp(invite.inviteCode)}
                          className="flex-1"
                          data-testid={`button-whatsapp-${invite.inviteCode}`}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareViaEmail(invite.inviteCode)}
                          className="flex-1"
                          data-testid={`button-email-${invite.inviteCode}`}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Email
                        </Button>
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