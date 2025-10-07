import Layout from "@/components/Layout";
import React from "react";

const About: React.FC = () => {
  return (
    <Layout>
      <section className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">About CashPilot</h2>
        <p className="text-lg leading-relaxed mb-4">
          CashPilot is a financial insights and analytics platform designed to help
          individuals and businesses make smarter financial decisions through
          real-time tracking and reporting.
        </p>
        <p className="text-gray-600">
          Our mission is to provide transparent and data-driven tools for
          understanding earnings, expenses, and growth metrics in one easy dashboard.
        </p>
      </section>
    </Layout>
  );
};

export default About;
