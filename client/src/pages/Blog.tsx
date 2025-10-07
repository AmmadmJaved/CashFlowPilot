import React from "react";
import Layout from "../components/Layout";

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "How to Analyze Website Earnings with CashPilot",
    excerpt: "Learn how to monitor and grow your online income using CashPilot’s analytics dashboard.",
    date: "October 7, 2025",
  },
  {
    id: 2,
    title: "SEO Optimization: How to Rank Better in Google",
    excerpt: "Step-by-step methods to improve your website ranking using Search Console and other tools.",
    date: "October 5, 2025",
  },
];

const Blog: React.FC = () => {
  return (
    <Layout>
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">Latest Blog Posts</h2>
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <article key={post.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
              <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
              <p className="text-gray-600 mb-2">{post.excerpt}</p>
              <span className="text-sm text-gray-500">{post.date}</span>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
