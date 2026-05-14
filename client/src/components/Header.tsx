import React from "react";
import { Share2, Plus, Minus, ChevronDown, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AnimatedButton from "./AnimatedButton";
import { SettingsModal } from "./SettingsModal";

interface HeaderProps {
  isConnected: boolean;
  profile?: {
    publicName?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    currency?: string;
    language?: string;
    id?: string;
  };
  auth: any; // you can replace with your auth type
  setIsIncomeModalOpen: (v: boolean) => void;
  setIsExpenseModalOpen: (v: boolean) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  profile,
  auth,
  setIsIncomeModalOpen,
  setIsExpenseModalOpen,
  activeTab,
  setActiveTab,
}) => {
  const emailPrefix = profile?.email?.split("@")[0] || "";
  const resolvedName =
    profile?.publicName?.trim() ||
    profile?.name?.trim() ||
    [profile?.given_name, profile?.family_name].filter(Boolean).join(" ").trim() ||
    emailPrefix ||
    "User";
  const avatarInitial = resolvedName.charAt(0).toUpperCase() || "U";

  return (
    <header className="animate-slide-in border-b border-border/70 bg-background/80 shadow-sm backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/25 animate-pulse-custom hover:scale-110 transition-transform duration-300">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight animate-fade-in">
                  CashPilot
                </h1>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? "bg-green-500 shadow-lg shadow-green-500/50"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {isConnected ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Tab Navigation */}
          {activeTab && setActiveTab && (
            <nav className="hidden sm:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("groups")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "groups"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group Accounts
              </button>
              <button
                onClick={() => setActiveTab("personal")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "personal"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Personal Account
              </button>
            </nav>
          )}

          {/* Right side - Profile menu */}
          <div className="flex items-center space-x-3">

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors"
                  data-testid="button-profile-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold">
                      {avatarInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-foreground">
                      {resolvedName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.currency || "PKR"} •{" "}
                      {profile?.language?.toUpperCase() || "EN"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">
                    {resolvedName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email || "No email set"}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <SettingsModal>
                    <div
                      className="flex items-center w-full cursor-pointer"
                      data-testid="menu-settings"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings & Preferences
                    </div>
                  </SettingsModal>
                </DropdownMenuItem>
                {(auth?.user?.role === "admin" ||
                  auth?.user?.role === "super_admin") && (
                  <DropdownMenuItem asChild>
                    <a
                      href="/admin"
                      className="flex items-center w-full cursor-pointer"
                      data-testid="menu-admin-panel"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      auth.signoutRedirect({
                        post_logout_redirect_uri: window.location.origin,
                      })
                    }
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  <User className="w-4 h-4 mr-2" />
                  Profile ID: {profile?.id?.slice(0, 8) || "Loading..."}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
