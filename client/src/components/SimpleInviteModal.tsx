import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Mail, Link, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Group {
  id: string;
  name: string;
}

interface SimpleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

export function SimpleInviteModal({ isOpen, onClose, group }: SimpleInviteModalProps) {
  const [email, setEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate simple invite link
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${group.id}/simple-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate invite link');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const inviteUrl = `${window.location.origin}/invite/${data.inviteCode}`;
      setGeneratedLink(inviteUrl);
      toast({
        title: "Invite Link Created!",
        description: "Share this link to invite others to your group.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invite link. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send email invitation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch(`/api/groups/${group.id}/invite-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailAddress }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email invitation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent!",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Join my expense group "${group.name}" using this link: ${generatedLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClose = () => {
    setGeneratedLink("");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite People to "{group.name}"</DialogTitle>
          <DialogDescription>
            Send invites via link or email to add members to your expense group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Generate Link Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Link className="w-4 h-4" />
              <h3 className="font-medium">Create Invite Link</h3>
            </div>
            
            {!generatedLink ? (
              <Button 
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                className="w-full"
              >
                {generateLinkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  "Generate Invite Link"
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaWhatsApp}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedLink)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <h3 className="font-medium">Send Email Invite</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => email && sendEmailMutation.mutate(email)}
                  disabled={!email || sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}