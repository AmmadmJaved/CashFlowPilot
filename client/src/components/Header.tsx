import React from "react";
import { ChevronDown, Settings, User } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-background/95 backdrop-blur-xl shadow-lg shadow-cyan-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
                CashPilot
              </h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-red-400"}`}></div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Center - Tab Navigation */}
          {activeTab && setActiveTab && (
            <nav className="hidden sm:flex items-center bg-muted/50 border border-border/60 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveTab("groups")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === "groups"
                    ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Group Accounts
              </button>
              <button
                onClick={() => setActiveTab("personal")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === "personal"
                    ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                  aria-label="Open profile menu"
                  title="Open profile menu"
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
