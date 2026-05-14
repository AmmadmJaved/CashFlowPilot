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
import { applyThemeMode, type ThemeMode } from "@/lib/themeMode";
import type { InsertUserProfile } from "@shared/schema";
import { useAuth } from "react-oidc-context";

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

  const auth = useAuth();
  const token = auth.user?.id_token;
  const authUserId = auth.user?.profile?.sub || "anonymous";
  const profileQueryKey = ['/api/profile', authUserId];

  // Fetch current profile
  // const { data: currentProfile, isLoading } = useQuery({
  //   queryKey: ['/api/profile', token],
  //   enabled: isOpen,
  // });

const { data: currentProfile, isLoading } = useQuery({
  queryKey: profileQueryKey,
  enabled: isOpen && !!token,
  queryFn: async () => {
    const response = await apiRequest('GET', '/api/profile', undefined, token);
    if (response && typeof response.json === "function") {
      return await response.json();
    }
    return response;
  },
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
        return await apiRequest('PATCH', `/api/profile/${(currentProfile as any).id}`, data, token);
      } else {
        return await apiRequest('POST', '/api/profile', data, token);
      }
    },
    onSuccess: () => {
      applyThemeMode((profile.theme as ThemeMode) || "light");
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
      <DialogContent className="flex w-[95vw] max-w-3xl max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-card text-card-foreground p-0 shadow-2xl">
        <DialogHeader className="border-b border-cyan-500/15 bg-gradient-to-br from-cyan-50/85 via-white to-sky-50/70 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 p-1.5">
              <Settings className="w-4 h-4 text-cyan-700" />
            </span>
            Settings & Preferences
          </DialogTitle>
          <DialogDescription className="text-sm leading-snug text-slate-600">
            Customize your experience with currency, language, and notification preferences
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pr-4 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/45 [&::-webkit-scrollbar-track]:bg-transparent">
        <Tabs defaultValue="profile" className="space-y-4">
          <div className="sm:hidden text-[11px] font-medium text-slate-500 -mb-2">Swipe tabs to see more</div>
          <TabsList className="flex h-auto w-full items-center justify-start gap-1 overflow-x-auto rounded-xl border border-cyan-500/15 bg-slate-50/80 p-1">
            <TabsTrigger value="profile" className="flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm min-w-[108px]">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="regional" className="flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm min-w-[112px]">
              <Globe className="w-4 h-4" />
              Regional
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm min-w-[132px]">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm min-w-[124px]">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card className="border-cyan-500/15 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Profile Information</CardTitle>
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
                    disabled={profile.publicName ? true : false}
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
              <Card className="border-cyan-500/15 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Currency & Format</CardTitle>
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

              <Card className="border-cyan-500/15 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Language & Region</CardTitle>
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
            <Card className="border-cyan-500/15 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Notification Preferences</CardTitle>
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
            <Card className="border-cyan-500/15 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Theme & Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={profile.theme || "light"}
                    onValueChange={(value) => {
                      updateProfile("theme", value);
                      applyThemeMode(value as ThemeMode);
                    }}
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
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-cyan-500/15 bg-card px-5 py-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-5">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveProfileMutation.isPending}
            data-testid="button-save-settings"
            className="rounded-full bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400"
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