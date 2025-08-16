import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Globe, Settings } from "lucide-react";
import type { InsertUserProfile } from "@shared/schema";

// Pakistan-friendly defaults
const PAKISTAN_DEFAULTS = {
  currency: "PKR",
  language: "en",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "en-PK",
  theme: "light",
  notifications: true,
  emailNotifications: false,
};

const CURRENCIES = [
  { value: "PKR", label: "₨ Pakistani Rupee", symbol: "₨" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "SAR", label: "Saudi Riyal (﷼)", symbol: "﷼" },
  { value: "AED", label: "UAE Dirham (د.إ)", symbol: "د.إ" },
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "hi", label: "हिंदी (Hindi)" },
];

interface ProfileInitializerProps {
  children: React.ReactNode;
}

export function ProfileInitializer({ children }: ProfileInitializerProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertUserProfile>>({
    publicName: "",
    ...PAKISTAN_DEFAULTS,
  });
  const { toast } = useToast();

  // Show dialog if authenticated but no profile exists
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.profile) {
      setIsOpen(true);
      // Pre-fill with user data
      const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'User';
      setFormData(prev => ({
        ...prev,
        publicName: displayName,
      }));
    }
  }, [isLoading, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.publicName?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create profile');
      
      setIsOpen(false);
      toast({
        title: "Welcome!",
        description: `Profile created successfully. Welcome to ExpenseShare, ${formData.publicName}!`,
      });
      
      // Refresh to get updated user data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (key: keyof InsertUserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Show children only when authenticated and profile exists
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Don't render profile setup for non-authenticated users
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Show profile setup if authenticated but no profile
  if (isAuthenticated && user && !user.profile) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Welcome to ExpenseShare
            </DialogTitle>
            <DialogDescription>
              Let's set up your profile with Pakistan-friendly defaults. You can change these settings anytime.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="publicName">Your Name *</Label>
                  <Input
                    id="publicName"
                    placeholder="Enter your full name"
                    value={formData.publicName || ""}
                    onChange={(e) => updateFormData("publicName", e.target.value)}
                    required
                    data-testid="input-setup-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                    data-testid="input-setup-email"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Regional Preferences
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Pre-configured with Pakistan-friendly defaults
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency || "PKR"}
                      onValueChange={(value) => updateFormData("currency", value)}
                    >
                      <SelectTrigger data-testid="select-setup-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.symbol} {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={formData.language || "en"}
                      onValueChange={(value) => updateFormData("language", value)}
                    >
                      <SelectTrigger data-testid="select-setup-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language.value} value={language.value}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Default Settings Applied:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Timezone: Pakistan Standard Time (Karachi)</li>
                    <li>• Date Format: DD/MM/YYYY (Pakistani format)</li>
                    <li>• Number Format: English (Pakistan)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={!formData.publicName?.trim()}
                data-testid="button-create-profile"
              >
                <Settings className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}