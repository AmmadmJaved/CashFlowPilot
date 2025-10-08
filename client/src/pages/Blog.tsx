"use client";

import { useState } from "react";
import { Helmet } from "react-helmet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const blogPosts = [
  {
    title: "5 Ways to Take Control of Your Finances in 2025",
    summary:
      "Simple yet powerful strategies to help you save money, manage expenses, and build financial discipline this year.",
    content: `
      Taking control of your finances in 2025 starts with a plan. Here are five proven ways to stay on track:
      1. **Set clear financial goals** – Define what you want to achieve this year: debt reduction, saving targets, or investments.
      2. **Track every expense** – Use CashPilot to record where your money goes and identify areas to cut costs.
      3. **Build an emergency fund** – Aim for at least three months of expenses saved.
      4. **Automate savings** – Set up automatic transfers to ensure consistency.
      5. **Review monthly** – Reassess your budget regularly to stay aligned with your goals.
    `,
  },
  {
    title: "Why Tracking Shared Expenses Matters",
    summary:
      "Learn how CashPilot simplifies group payments, making shared costs easy and transparent for everyone.",
    content: `
      Shared expenses often cause confusion, especially among friends, couples, or roommates.
      Tracking them accurately ensures fairness and avoids misunderstandings.
      **CashPilot** allows you to:
      - Log expenses in real time
      - Split bills instantly and fairly
      - Keep everyone updated with automatic notifications
      Stay organized and stress-free when managing shared finances.
    `,
  },
  {
    title: "How Analytics Can Improve Your Budget",
    summary:
      "Discover how spending analytics can reveal patterns and help you make smarter money decisions.",
    content: `
      Analytics transforms how you understand your spending habits.
      By reviewing your CashPilot insights, you can:
      - Spot unnecessary expenses
      - Identify saving opportunities
      - Set realistic monthly goals
      With AI-powered analytics, budgeting becomes smarter and easier.
    `,
  },
];

export default function Blog() {
  const [activePost, setActivePost] = useState<number | null>(null);

  const handleBack = () => setActivePost(null);

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>CashPilot Blog | Smart Financial Tips & Expense Insights</title>
        <meta
          name="description"
          content="Explore the CashPilot blog for smart financial strategies, expense tracking tips, and analytics insights to take control of your finances in 2025."
        />
        <meta
          name="keywords"
          content="cashpilot blog, finance tips, expense tracker, budgeting 2025, shared expenses, analytics finance"
        />
        <meta name="author" content="CashPilot Team" />
        <meta property="og:title" content="CashPilot Blog | Financial Tips" />
        <meta
          property="og:description"
          content="Learn financial strategies, budgeting techniques, and shared expense tracking with CashPilot."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://cashpilot.live/blog" />
        <meta property="og:site_name" content="CashPilot" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-5xl font-bold text-center text-blue-700 mb-10">Our Blog</h1>
          <p className="text-center text-gray-700 dark:text-gray-300 mb-12">
            Insights and strategies from the CashPilot team to help you manage your money better in 2025.
          </p>

          {activePost === null ? (
            <div className="grid md:grid-cols-3 gap-8">
              {blogPosts.map((post, i) => (
                <Card
                  key={i}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setActivePost(i)}
                >
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{post.summary}</p>
                    <Button variant="outline" className="text-blue-600">
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
              <h2 className="text-4xl font-bold text-blue-700 mb-4">
                {blogPosts[activePost].title}
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: blogPosts[activePost].content }}
              />
              <div className="mt-8">
                <Button onClick={handleBack} className="bg-blue-600 text-white">
                  ← Back to Blog
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
