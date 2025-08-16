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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Globe, Bell, Palette, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, InsertUserProfile } from "@shared/schema";

interface SettingsModalProps {
  children: React.ReactNode;
}

// Pakistan-friendly currency options
const CURRENCIES = [
  { value: "PKR", label: "Pakistani Rupee (₨)", symbol: "₨" },
  { value: "USD", label: "US Dollar (USD)", symbol: "$" },
  { value: "EUR", label: "Euro (EUR)", symbol: "€" },
  { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { value: "SAR", label: "Saudi Riyal (SAR)", symbol: "﷼" },
  { value: "AED", label: "UAE Dirham (AED)", symbol: "د.إ" },
  { value: "INR", label: "Indian Rupee (INR)", symbol: "₹" },
];

// Language options with Pakistan-friendly defaults
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "hi", label: "हिंदी (Hindi)" },
];

// Date format options
const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (Pakistani)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

// Timezone options for Pakistan region
const TIMEZONES = [
  { value: "Asia/Karachi", label: "Pakistan Standard Time (Karachi)" },
  { value: "Asia/Lahore", label: "Pakistan Standard Time (Lahore)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time (Riyadh)" },
  { value: "UTC", label: "UTC" },
];

export function SettingsModal({ children }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<Partial<InsertUserProfile>>({
    publicName: "",
    email: "",
    currency: "PKR",
    language: "en",
    timezone: "Asia/Karachi",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-PK",
    theme: "light",
    notifications: true,
    emailNotifications: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current profile
  const { data: currentProfile, isLoading } = useQuery({
    queryKey: ['/api/profile'],
    enabled: isOpen,
  });

  // Update profile when data is loaded
  useEffect(() => {
    if (currentProfile) {
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertUserProfile>) => {
      if ((currentProfile as any)?.id) {
        return await apiRequest('PATCH', `/api/profile/${(currentProfile as any).id}`, data);
      } else {
        return await apiRequest('POST', '/api/profile', data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!profile.publicName?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your public name.",
        variant: "destructive",
      });
      return;
    }

    saveProfileMutation.mutate(profile);
  };

  const updateProfile = (key: keyof InsertUserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings & Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your experience with currency, language, and notification preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="regional" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Regional
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your public information used in groups and transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="publicName">Public Name *</Label>
                  <Input
                    id="publicName"
                    placeholder="Enter your display name"
                    value={profile.publicName || ""}
                    onChange={(e) => updateProfile("publicName", e.target.value)}
                    data-testid="input-public-name"
                  />
                  <p className="text-sm text-muted-foreground">
                    This name will be visible to other group members
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={profile.email || ""}
                    onChange={(e) => updateProfile("email", e.target.value)}
                    data-testid="input-email"
                  />
                  <p className="text-sm text-muted-foreground">
                    Used for notifications and account recovery
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regional Settings */}
          <TabsContent value="regional">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Currency & Format</CardTitle>
                  <CardDescription>
                    Set your preferred currency and number formatting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Primary Currency</Label>
                    <Select
                      value={profile.currency || "PKR"}
                      onValueChange={(value) => updateProfile("currency", value)}
                    >
                      <SelectTrigger data-testid="select-currency">
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
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={profile.dateFormat || "DD/MM/YYYY"}
                      onValueChange={(value) => updateProfile("dateFormat", value)}
                    >
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                  <CardDescription>
                    Choose your language and timezone preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={profile.language || "en"}
                      onValueChange={(value) => updateProfile("language", value)}
                    >
                      <SelectTrigger data-testid="select-language">
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
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={profile.timezone || "Asia/Karachi"}
                      onValueChange={(value) => updateProfile("timezone", value)}
                    >
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Real-time Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get instant notifications for group activity
                    </p>
                  </div>
                  <Switch
                    checked={profile.notifications ?? true}
                    onCheckedChange={(checked) => updateProfile("notifications", checked)}
                    data-testid="switch-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive expense summaries and important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={profile.emailNotifications ?? false}
                    onCheckedChange={(checked) => updateProfile("emailNotifications", checked)}
                    data-testid="switch-email-notifications"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Theme & Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={profile.theme || "light"}
                    onValueChange={(value) => updateProfile("theme", value)}
                  >
                    <SelectTrigger data-testid="select-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveProfileMutation.isPending}
            data-testid="button-save-settings"
          >
            {saveProfileMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}