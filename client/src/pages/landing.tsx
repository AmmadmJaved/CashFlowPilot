import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Users, TrendingUp, Download } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-income rounded-lg flex items-center justify-center">
                <Share2 className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">ExpenseShare</h1>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-blue-700"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Expense Splitting Made Simple
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Track personal expenses, split costs with roommates, and manage your finances 
            with powerful filtering and export capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-income rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-white" />
              </div>
              <CardTitle>Track Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Monitor your income and expenses with detailed categorization and date filtering.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" />
              </div>
              <CardTitle>Share with Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Create groups with roommates and friends to split expenses fairly and automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-warning rounded-lg flex items-center justify-center mx-auto mb-4">
                <Share2 className="text-white" />
              </div>
              <CardTitle>Real-time Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Offline-first design with automatic syncing when you're back online.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-expense rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="text-white" />
              </div>
              <CardTitle>Export Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Export your financial data in PDF or Excel format with custom date ranges.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-3"
            data-testid="button-get-started"
          >
            Get Started for Free
          </Button>
        </div>
      </main>
    </div>
  );
}
