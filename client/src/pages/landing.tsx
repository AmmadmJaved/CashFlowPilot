import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, BarChart3, Smartphone } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { useState } from "react";

    function LazyYouTube() {
      const [loaded, setLoaded] = useState(false);

      return (
        <div className="relative aspect-video max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg">
          {!loaded && (
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xl font-semibold"
              onClick={() => setLoaded(true)}
            >
              ▶ Watch Demo
            </button>
          )}
          {loaded && (
            <iframe
              className="w-full h-full"
              src="https://www.youtube-nocookie.com/embed/a8pPuQ8Ytqk?si=hvKw7Ot97OUQCfEI&amp;start=32"
              title="YouTube demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          )}
        </div>
      );
    }

export default function Landing() {
  const auth = useAuth();

  const [amount, setAmount] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleCalculate = () => {
    if (!amount || !people || people <= 0) {
      setResult("Please enter valid values.");
      return;
    }
    const split = amount / people;
    setResult(`Each person pays: $${split.toFixed(2)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200">
      <Helmet>
        <title>CashPilot | Smart Expense Tracking and Group Budgeting</title>
        <meta
          name="description"
          content="Manage your money effortlessly with CashPilot — track expenses, split bills, analyze spending, and stay in control of your finances with smart analytics."
        />
        <meta
          name="keywords"
          content="expense tracker, split bills app, finance management, budgeting tool, group expenses, cashpilot, personal finance app"
        />
        <meta property="og:title" content="CashPilot | Simplify Your Finances" />
        <meta
          property="og:description"
          content="Track, analyze, and share your expenses easily with CashPilot — the modern way to manage money with friends and family."
        />
        <meta property="og:url" content="https://cashpilot.live" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* 🧭 Header (from PDF) */}
      <header className="bg-white dark:bg-gray-900 shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">CashPilot</h1>
          <nav className="hidden md:flex space-x-8 text-sm font-medium">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/Careers">Careers</Link>
          </nav>
          <a
            href="/get-app"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Get App
          </a>
        </div>
      </header>

      {/* 🌟 Main Landing Content */}
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <img src="/icon-72x72.png" alt="CashPilot Logo" loading="lazy" className="mx-auto mb-4 w-24 h-24" />
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            CashPilot
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Track your expenses, share costs with friends, and stay on top of your finances with our modern expense management platform.
          </p>
          <Button
            onClick={() => {
              if (!auth || !auth.signinRedirect) return;
              auth.signinRedirect().catch((err: any) => console.error(err));
            }}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Sign in with Google
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon={<DollarSign className="h-12 w-12 mx-auto text-blue-600 mb-4" />}
            title="Track Expenses"
            desc="Easily record and categorize your income and expenses with our intuitive interface."
          />
          <FeatureCard
            icon={<Users className="h-12 w-12 mx-auto text-green-600 mb-4" />}
            title="Share with Groups"
            desc="Create groups and split expenses with friends, family, or roommates seamlessly."
          />
          <FeatureCard
            icon={<BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-4" />}
            title="Smart Analytics"
            desc="Get insights into your spending patterns with detailed reports and statistics."
          />
          <FeatureCard
            icon={<Smartphone className="h-12 w-12 mx-auto text-orange-600 mb-4" />}
            title="Mobile Ready"
            desc="Access your financial data anywhere with our responsive, mobile-friendly design."
          />
        </div>

        {/* 📱 Mobile Preview Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl font-bold mb-4 text-blue-700">
            Your Finances — Visualized
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Experience CashPilot’s clean mobile interface that helps you track, analyze, 
            and export your financial reports in seconds.
          </p>
        </div>

        {/* Image centered at 75% width */}
        <div className="flex justify-center">
          <img
            src="/mobile.png"
            alt="CashPilot Financial Reports Preview"
            className="w-[85%] h-auto rounded-2xl shadow-2xl hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      </section>




        {/* Sections: How it works, Demo, Testimonials, CTA — unchanged */}
        {/* Keep your existing content here (no change needed) */}
      </main>

      {/* 🧱 Footer (from PDF) */}
      <footer className="bg-gray-900 text-gray-300 mt-10">
        <div className="container mx-auto px-6 py-10 grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Quick Links</h3>
            <ul className="space-y-1 text-sm">
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Contact</h3>
            <p className="text-sm">Email: <a href="mailto:cashpilot.live@gmail.com" className="hover:underline">cashpilot.live@gmail.com</a></p>
            <p className="text-sm">Phone: +92-310-7236900 / +92-345-0733379</p>
            <p className="text-sm">Address: Gulberg Greens Executive Block, Islamabad</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About</h3>
            <p className="text-sm leading-relaxed">
              CashPilot helps you track expenses, manage budgets, and stay in control of your finances anywhere, anytime.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 text-center py-4 text-xs">
          © 2025 NEXT GEN SOLUTION Web Agency · All Rights Reserved · Technology Center
        </div>
      </footer>
    </div>
  );
}

// ♻️ Reusable Feature Card
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card className="text-center hover:shadow-lg transition-shadow">
      <CardHeader>{icon}<CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}
