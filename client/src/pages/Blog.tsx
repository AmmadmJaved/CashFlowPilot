import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const blogPosts = [
  {
    title: "5 Ways to Take Control of Your Finances in 2025",
    summary:
      "Simple yet powerful strategies to help you save money, manage expenses, and build financial discipline this year.",
  },
  {
    title: "Why Tracking Shared Expenses Matters",
    summary:
      "Learn how CashPilot simplifies group payments, making shared costs easy and transparent for everyone.",
  },
  {
    title: "How Analytics Can Improve Your Budget",
    summary:
      "Discover how spending analytics can reveal patterns and help you make smarter money decisions.",
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 px-6">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-5xl font-bold text-center text-blue-700 mb-10">Our Blog</h1>
        <p className="text-center text-gray-700 dark:text-gray-300 mb-12">
          Tips, insights, and updates from the CashPilot team to help you stay financially
          empowered.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {blogPosts.map((post, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">{post.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
