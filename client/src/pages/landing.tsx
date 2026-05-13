import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, DollarSign, ShieldCheck, Smartphone, Users } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";
import { User } from "oidc-client-ts";
import type { ReactNode } from "react";

export default function Landing() {
  const auth = useAuth();

  const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const authority = import.meta.env.VITE_AUTH_AUTHORITY || "https://accounts.google.com";
  const scope = import.meta.env.VITE_GOOGLE_SCOPE || "openid profile email";

  const storeNativeSession = (
    idToken: string,
    account: {
      userId: string;
      email: string | null;
      displayName: string | null;
      givenName: string | null;
      familyName: string | null;
      imageUrl: string | null;
      accessToken: string | null;
    },
  ) => {
    const claims = JSON.parse(atob(idToken.split(".")[1] || "e30="));
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = typeof claims.exp === "number" ? claims.exp : now + 3600;

    const user = new User({
      id_token: idToken,
      access_token: account.accessToken || idToken,
      token_type: "Bearer",
      scope,
      expires_at: expiresAt,
      profile: {
        sub: account.userId || claims.sub || "native-user",
        exp: expiresAt,
        iat: typeof claims.iat === "number" ? claims.iat : now,
        email: account.email || claims.email || undefined,
        name: account.displayName || claims.name || undefined,
        given_name: account.givenName || claims.given_name || undefined,
        family_name: account.familyName || claims.family_name || undefined,
        picture: account.imageUrl || claims.picture || undefined,
        iss: claims.iss || authority,
        aud: claims.aud || webClientId,
      },
    });

    const key = `oidc.user:${authority}:${webClientId}`;
    window.localStorage.setItem(key, user.toStorageString());
  };

  const handleLogin = async () => {
    const isNative = Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";

    if (isNative) {
      try {
        await GoogleSignIn.initialize({
          clientId: webClientId,
          scopes: ["openid", "email", "profile"],
        });
        const result = await GoogleSignIn.signIn();
        storeNativeSession(result.idToken, result);
        window.location.replace("/");
      } catch (err) {
        console.error("Native Google Sign-In failed", err);
      }
      return;
    }

    if (!auth || !auth.signinRedirect) {
      return;
    }
    auth.signinRedirect().catch((err: any) => console.error(err));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>CashPilot | Expense Tracking for Teams and Individuals</title>
        <meta
          name="description"
          content="CashPilot helps you track spending, split costs, and understand trends with clear analytics across personal and group accounts."
        />
        <meta property="og:title" content="CashPilot | Finance Without Friction" />
        <meta
          property="og:description"
          content="Track, split, and analyze your expenses in one professional dashboard."
        />
        <meta property="og:url" content="https://cashpilot.live" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/icon-72x72.png" alt="CashPilot logo" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-cyan-300">CashPilot</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/careers" className="hover:text-white">Careers</Link>
          </nav>

          <Button onClick={handleLogin} className="bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400">
            Sign In
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-6 md:pt-16">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Built for Real-World Money Management
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
              Spend smarter.
              <br />
              Split faster.
              <br />
              <span className="text-cyan-300">Stay in control.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              CashPilot combines expense tracking, shared bills, and trend analytics in one focused platform for individuals, families, and teams.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleLogin}
                size="lg"
                className="group bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              >
                Sign in with Google
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <a
                href="/get-app"
                className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-300"
              >
                Get Android App
              </a>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/80 shadow-2xl shadow-cyan-900/20">
            <CardHeader>
              <CardTitle className="text-white">Live Snapshot</CardTitle>
              <CardDescription className="text-slate-400">
                Designed for speed on mobile and desktop.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Monthly Spend</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">Rs 148,560</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Shared Groups</p>
                  <p className="mt-1 text-lg font-bold text-white">12</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Transactions</p>
                  <p className="mt-1 text-lg font-bold text-white">642</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <StatBox label="Active Users" value="25k+" />
          <StatBox label="Split Settlements" value="1.2M+" />
          <StatBox label="Reported Uptime" value="99.9%" />
        </section>

        <section className="mt-16">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">Everything you need in one clean workflow</h2>
            <p className="mt-2 text-slate-300">Built to remove friction from personal and shared financial tracking.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FeatureCard
              icon={<DollarSign className="h-6 w-6 text-cyan-300" />}
              title="Track Expenses"
              desc="Capture daily expenses and income in seconds with structured categories and real-time totals."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6 text-cyan-300" />}
              title="Share with Groups"
              desc="Create group ledgers, invite members, and track each person’s share without spreadsheet chaos."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6 text-cyan-300" />}
              title="Smart Analytics"
              desc="Turn raw entries into useful insights with period summaries, trends, and account-level filtering."
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6 text-cyan-300" />}
              title="Mobile First"
              desc="Smooth experience on Android and web, designed for quick actions while you are on the move."
            />
          </div>
        </section>

        <section className="mt-16 grid gap-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:grid-cols-2 md:p-8">
          <div>
            <h3 className="text-3xl font-bold text-white">Your finances, visualized with clarity</h3>
            <p className="mt-3 text-slate-300">
              CashPilot keeps reports readable and useful, so decisions are easier for you and your group.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Secure Sign-In and Session Handling
            </div>
          </div>
          <img
            src="/mobile.png"
            alt="CashPilot app preview"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 object-cover"
            loading="lazy"
          />
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-300 md:grid-cols-3 md:px-6">
          <div>
            <h4 className="mb-2 text-base font-semibold text-white">CashPilot</h4>
            <p>Track smarter. Split fairly. Grow financial discipline with better visibility.</p>
          </div>
          <div>
            <h4 className="mb-2 text-base font-semibold text-white">Explore</h4>
            <div className="space-y-1">
              <Link href="/privacy-policy" className="block hover:text-cyan-300">Privacy Policy</Link>
              <Link href="/terms" className="block hover:text-cyan-300">Terms and Conditions</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-base font-semibold text-white">Contact</h4>
            <p>cashpilot.live@gmail.com</p>
            <p>+92-345-0733379</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <Card className="border-slate-800 bg-slate-900/80 transition hover:-translate-y-1 hover:border-cyan-400/40">
      <CardHeader>
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
          {icon}
        </div>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-slate-300">{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}
