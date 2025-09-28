import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import InvitePage from "@/pages/invite";
import Landing from "@/pages/landing";
import AdminPanel from "@/pages/admin";
import { ProfileInitializer } from "@/components/ProfileInitializer";
import { useAuth } from "react-oidc-context";
import { useEffect, useRef } from "react";
import CallbackPage from "./pages/callback";
import AccountDetail from "@/pages/AccountDetail";

function Router() {
  const auth = useAuth();
  const { isAuthenticated, isLoading } = auth;

  // 🔄 Prevent repeated silent renew calls
  const renewAttempted = useRef(false);

  useEffect(() => {
    if (!auth.user) return;

    if (auth.user.expired && !renewAttempted.current) {
      renewAttempted.current = true; // mark attempt
      auth
        .signinSilent()
        .then((user) => {
          console.log("Silent renew success:", user);
          renewAttempted.current = false; // reset if successful
        })
        .catch((err) => {
          console.warn("Silent renew failed:", err);
          // You could redirect to login here if needed
        });
    }
  }, [auth.user, auth]);

  // 🚫 Prevent going back to /callback in history
  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      if (isAuthenticated && window.location.href.includes("callback")) {
        event.preventDefault();
        window.history.pushState(null, "", "/");
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth/google/callback" component={CallbackPage} />

      {isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route
            path="/account/:id"
            component={({ params }) => <AccountDetail accountId={params.id} />}
          />
          <Route path="/group/:groupId/invite/:inviteCode" component={InvitePage} />
          <Route path="/admin" component={AdminPanel} />
        </>
      ) : (
        <>
          <Route path="/" component={Landing} />
          <Route path="/group/:groupId/invite/:inviteCode" component={InvitePage} />
        </>
      )}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProfileInitializer>
          <Toaster />
          <PWAInstallBanner />
          <Router />
        </ProfileInitializer>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
