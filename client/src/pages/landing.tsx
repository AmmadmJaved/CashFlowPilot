import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, BarChart3, Smartphone } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ExpenseShare
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Track your expenses, share costs with friends, and stay on top of your finances with our modern expense management platform.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            data-testid="button-login"
          >
            Sign in with Email/Gmail
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

        {/* Features Highlight */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose ExpenseShare?</h2>
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
            Join thousands of users who trust ExpenseShare to manage their money.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-lg"
            data-testid="button-cta-login"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}