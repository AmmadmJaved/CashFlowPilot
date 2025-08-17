import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function InvitePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [, setLocation] = useLocation();
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const { toast } = useToast();

  // Fetch invite information
  const { data: inviteInfo, isLoading, error } = useQuery({
    queryKey: ['/api/invites', inviteCode],
    enabled: !!inviteCode,
  }) as { data: any, isLoading: boolean, error: any };

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (data: { memberName: string; memberEmail?: string }) => {
      const response = await apiRequest('POST', `/api/invites/${inviteCode}/join`, data);
      return await response.json();
    },
    onSuccess: (result: any) => {
      setHasJoined(true);
      toast({
        title: "Successfully Joined!",
        description: `Welcome to ${result.group?.name || 'the group'}! You can now track expenses together.`,
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join Group",
        description: error.message || "The invite link may be invalid or expired.",
        variant: "destructive",
      });
    },
  });

  const handleJoinGroup = () => {
    if (!memberName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join the group.",
        variant: "destructive",
      });
      return;
    }

    joinGroupMutation.mutate({
      memberName: memberName.trim(),
      memberEmail: memberEmail.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading invite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-back-home"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Successfully Joined!</CardTitle>
            <CardDescription>
              Welcome to {inviteInfo.group?.name}! You're now part of the group.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in a few seconds...
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-go-dashboard"
            >
              Go to Dashboard Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="w-12 h-12 text-primary mx-auto mb-2" />
          <CardTitle>Join Expense Group</CardTitle>
          <CardDescription>
            You've been invited to join "{inviteInfo.group?.name}"
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {inviteInfo.group?.description && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {inviteInfo.group.description}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Your Name *</Label>
              <Input
                id="memberName"
                placeholder="Enter your full name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                data-testid="input-member-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email (Optional)</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="your.email@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                data-testid="input-member-email"
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleJoinGroup}
              disabled={joinGroupMutation.isPending}
              className="w-full"
              data-testid="button-join-group"
            >
              {joinGroupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Group
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            By joining, you'll be able to track and share expenses with other group members.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}