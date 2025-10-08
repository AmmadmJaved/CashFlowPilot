import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold text-blue-700 mb-8">About CashPilot</h1>
        <p className="text-gray-700 dark:text-gray-300 text-lg mb-12">
          CashPilot was built to make money management simple, social, and transparent.
          We understand that tracking expenses and splitting bills can be messy — so we
          created a tool that handles it all automatically, whether it’s for friends,
          roommates, or small teams.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              Empower individuals and groups to take control of their financial life
              through smart automation and transparency.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              To become the go-to platform for managing shared expenses across
              communities, friends, and workplaces worldwide.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Values</CardTitle>
            </CardHeader>
            <CardContent>
              Simplicity, Trust, and Innovation — we believe managing money should be
              stress-free, accurate, and empowering.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
