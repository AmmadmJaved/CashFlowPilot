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
    email?: string;
    currency?: string;
    language?: string;
    id?: string;
  };
  auth: any; // you can replace with your auth type
  setIsIncomeModalOpen: (v: boolean) => void;
  setIsExpenseModalOpen: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  profile,
  auth,
  setIsIncomeModalOpen,
  setIsExpenseModalOpen,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 animate-slide-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-custom hover:scale-110 transition-transform duration-300">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight animate-fade-in">
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
                  <span className="text-xs text-gray-500 font-medium">
                    {isConnected ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Quick Action Buttons */}
          <div
            className="hidden md:flex items-center space-x-3 animate-fade-in"
            style={{ animationDelay: "200ms" } as React.CSSProperties}
          >
            <div className="flex bg-gray-50 rounded-2xl p-1 shadow-inner card-hover">
              <AnimatedButton
                onClick={() => setIsIncomeModalOpen(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-2"
                size="sm"
                pulseOnHover={true}
                data-testid="button-add-income"
              >
                <Plus className="w-4 h-4 mr-2" />
                Income
              </AnimatedButton>
              <AnimatedButton
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-2 ml-2"
                size="sm"
                pulseOnHover={true}
                data-testid="button-add-expense"
              >
                <Minus className="w-4 h-4 mr-2" />
                Expense
              </AnimatedButton>
            </div>
          </div>

          {/* Right side - Profile menu */}
          <div className="flex items-center space-x-3">
            {/* Mobile quick actions */}
            <div className="flex md:hidden space-x-2">
              <Button
                onClick={() => setIsIncomeModalOpen(true)}
                size="sm"
                className="bg-green-500 hover:bg-green-600 rounded-full w-10 h-10 p-0"
                data-testid="button-add-income-mobile"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsExpenseModalOpen(true)}
                size="sm"
                className="bg-red-500 hover:bg-red-600 rounded-full w-10 h-10 p-0"
                data-testid="button-add-expense-mobile"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  data-testid="button-profile-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold">
                      {profile?.publicName?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.publicName || "User"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {profile?.currency || "PKR"} •{" "}
                      {profile?.language?.toUpperCase() || "EN"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">
                    {profile?.publicName || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
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
                <DropdownMenuItem className="text-gray-500" disabled>
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
