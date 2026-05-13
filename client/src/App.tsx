import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
// import NotFound from "@/pages/not-found";
// import Dashboard from "@/pages/dashboard";
// import InvitePage from "@/pages/invite";
// import Landing from "@/pages/landing";
// import AdminPanel from "@/pages/admin";
import { ProfileInitializer } from "@/components/ProfileInitializer";
import { useAuth } from "react-oidc-context";
// import CallbackPage from "./pages/callback";
// import AccountDetail from "@/pages/AccountDetail";
// import About from "./pages/About";
// import Contact  from "./pages/Contact";
// import Blog from "./pages/Blog";

import { lazy, Suspense, useEffect, useRef } from "react";
import { App as CapacitorApp } from '@capacitor/app';


const Dashboard = lazy(() => import("@/pages/dashboard"));
const Landing = lazy(() => import("@/pages/landing"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Blog = lazy(() => import("@/pages/Blog"));
const AdminPanel = lazy(() => import("@/pages/admin"));
const InvitePage = lazy(() => import("@/pages/invite"));
const AccountDetail = lazy(() => import("@/pages/AccountDetail"));
const CallbackPage = lazy(() => import("@/pages/callback"));
const NotFound = lazy(() => import("@/pages/not-found"));
import Career from "./pages/careers";


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

  // Handle OAuth redirect in Capacitor
  useEffect(() => {
    const processDeepLink = (rawUrl?: string) => {
      if (!rawUrl) {
        return;
      }

      try {
        const url = new URL(rawUrl);
        if (url.protocol === 'cashpilot:' && url.hostname === 'callback') {
          const query = url.search;
          const hash = url.hash;
          window.location.replace(`/auth/google/callback${query}${hash}`);
        }
      } catch (error) {
        console.error('Failed to parse deep link URL', error);
      }
    };

    let isMounted = true;
    let cleanup: (() => Promise<void>) | undefined;

    void CapacitorApp.getLaunchUrl().then((launchData) => {
      if (!isMounted) {
        return;
      }
      processDeepLink(launchData?.url);
    }).catch((error) => {
      console.error('Failed to read launch URL', error);
    });

    CapacitorApp.addListener('appUrlOpen', (event) => {
      processDeepLink(event.url);
    }).then((listenerHandle) => {
      if (!isMounted) {
        void listenerHandle.remove();
        return;
      }
      cleanup = () => listenerHandle.remove();
    });

    return () => {
      isMounted = false;
      if (cleanup) {
        void cleanup();
      }
    };
  }, []);

  if (isLoading) {
    // Don't block with spinner — if we have a stored OIDC user, they'll resolve quickly.
    // Show minimal non-disruptive loading state
    return (
      <Suspense fallback={null}>
        <Switch>
          <Route path="/auth/google/callback" component={CallbackPage} />
          <Route path="/auth/google/mobile-callback" component={CallbackPage} />
          <Route>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            </div>
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <Switch>
            <Route path="/auth/google/callback" component={CallbackPage} />
            <Route path="/auth/google/mobile-callback" component={CallbackPage} />

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
                <Route path="/about" component={About} />
                <Route path="/contact" component={Contact} />
                <Route path="/blog" component={Blog} />
                <Route path="/careers" component={Career} />
        </>
            )}

            <Route component={NotFound} />
          </Switch>
    </Suspense>
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
