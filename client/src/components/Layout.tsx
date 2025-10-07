import React from "react";
import { Link } from "react-router-dom";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm p-4 sticky top-0 z-50">
        <nav className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            CashPilot
          </Link>
          <div className="flex space-x-6 text-gray-700 dark:text-gray-300">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </nav>
      </header>

      <main className="flex-grow">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white text-center py-4 mt-10">
        © {new Date().getFullYear()} CashPilot. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
