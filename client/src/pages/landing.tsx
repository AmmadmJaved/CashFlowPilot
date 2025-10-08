import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, BarChart3, Smartphone } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { useState } from "react";

export default function Landing() {
   const auth = useAuth();
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const [amount, setAmount] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");

    const handleCalculate = () => {
      if (!amount || !people || people <= 0) {
        setResult("Please enter valid values.");
        return;
      }
      const split = amount / people;
      setResult(`Each person pays: $${split.toFixed(2)}`);
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
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
          <meta name="author" content="CashPilot" />
          <meta property="og:title" content="CashPilot | Simplify Your Finances" />
          <meta
            property="og:description"
            content="Track, analyze, and share your expenses easily with CashPilot — the modern way to manage money with friends and family."
          />
          <meta property="og:url" content="https://cashpilot.live" />
          <meta property="og:type" content="website" />
        </Helmet>
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            CashPilot
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Track your expenses, share costs with friends, and stay on top of your finances with our modern expense management platform.
          </p>
          <Button 
            onClick={() => {
                        console.log("✅ Button clicked");
                        if (!auth || !auth.signinRedirect) {
                          console.error("auth is not ready", auth);
                          return;
                        }
                        auth.signinRedirect().catch((err: any) => {
                          console.error("signinRedirect failed", err);
                        });
                      }}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            data-testid="button-login"
          >
            Sign in with Google
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <DollarSign className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>Track Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Easily record and categorize your income and expenses with our intuitive interface.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Share with Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create groups and split expenses with friends, family, or roommates seamlessly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>Smart Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get insights into your spending patterns with detailed reports and statistics.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Smartphone className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle>Mobile Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access your financial data anywhere with our responsive, mobile-friendly design.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        {/* How It Works Section */}
        <section className="py-16 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <h2 className="text-3xl font-bold text-center mb-12">How CashPilot Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { step: "1", title: "Sign In", desc: "Join securely with Google in one click." },
              { step: "2", title: "Add Expenses", desc: "Record your expenses, incomes, and group splits easily." },
              { step: "3", title: "View Insights", desc: "Track your balance and spending trends instantly." }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl shadow hover:shadow-lg transition-all bg-white dark:bg-gray-800">
                <h3 className="text-2xl font-semibold text-blue-600 mb-2">Step {item.step}</h3>
                <p className="text-xl font-medium mb-2">{item.title}</p>
                <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Simple Expense Split Demo */}
        <section className="py-16 text-center bg-white dark:bg-gray-900">
        <h2 className="text-3xl font-bold mb-6 text-indigo-600">Watch the Demo</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          See how CashPilot helps you split expenses and manage your finances with ease.
        </p>

        <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg relative">
          <div className="aspect-w-16 aspect-h-9">
            <iframe height="315" className="w-full" src="https://www.youtube-nocookie.com/embed/a8pPuQ8Ytqk?si=hvKw7Ot97OUQCfEI&amp;start=32" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>

        <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm">
          Learn how to take control of your shared expenses in just a few minutes.
        </p>
      </section>

        {/* Testimonials Section */}
        <section className="py-16 bg-indigo-50 dark:bg-gray-800">
          <h2 className="text-3xl font-bold text-center mb-10">Trusted by Smart Savers</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { name: "Ayesha", text: "CashPilot made splitting rent so easy!" },
              { name: "Usman", text: "Now I actually understand where my money goes." },
              { name: "Sara", text: "Love the analytics — it keeps me disciplined." }
            ].map((t, i) => (
              <div key={i} className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow hover:shadow-lg transition-all">
                <p className="italic mb-4">“{t.text}”</p>
                <p className="font-semibold text-blue-600">— {t.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Highlight */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose CashPilot?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-600">Real-time Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                See updates instantly when group members add expenses or make payments. Stay synchronized with live notifications.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 text-green-600">Multi-currency Support</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Handle expenses in different currencies with automatic conversion and localized formatting.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-purple-600">Advanced Filtering</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Find exactly what you're looking for with powerful filtering by date, category, person, or amount.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 text-orange-600">Data Export</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Export your financial data to Excel or PDF for tax purposes, budgeting, or record keeping.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Finances?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users who trust CashPilot to manage their money.
          </p>
           <h2 className="text-3xl font-bold mb-6">Start Tracking Smarter with CashPilot</h2>
           <p className="text-lg mb-8">Free forever for individuals — Sign in and take control today.</p>
  
          <Button 
            onClick={() => {
                        console.log("✅ Button clicked");
                        if (!auth || !auth.signinRedirect) {
                          console.error("auth is not ready", auth);
                          return;
                        }
                        auth.signinRedirect().catch((err: any) => {
                          console.error("signinRedirect failed", err);
                        });
                      }}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-lg"
            data-testid="button-cta-login"
          >
            Get Started Now
          </Button>
           {/* 👇 Added page navigation links near CTA */}
          <div className="mt-6 space-x-4">
            <Link href="/about" className="text-blue-600 hover:underline">
              About
            </Link>
            <Link href="/blog" className="text-blue-600 hover:underline">
              Blog
            </Link>
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact
            </Link>
          </div>
          {/* 👆 Added page navigation links near CTA */}
        </div>
      </div>
    </div>
  );
}