# ExpenseShare Application

## Overview

ExpenseShare is a user-friendly full-stack web application for expense tracking and sharing built with React, TypeScript, Express.js, and PostgreSQL. The application allows anyone to immediately start tracking personal expenses, create expense groups for sharing costs with others, and export financial data without requiring signup or login. It features a modern UI built with shadcn/ui components and Tailwind CSS.

**Status**: Fully functional with simplified no-authentication architecture, multi-user group management, advanced filtering, custom date ranges, comprehensive data export, and real-time collaborative editing. Ready for immediate use without user accounts.

## Recent Changes (August 2025)

- ✅ **Invite System Completely Rebuilt** - Fixed all authentication issues, created comprehensive invite modal with create/manage functionality
- ✅ **Session Management Fixed** - Resolved secure cookie issues in development, authentication now working consistently 
- ✅ **Public Invite Links** - Invite links work on any device without authentication, proper 404 error resolution
- ✅ **Enhanced Error Handling** - Detailed error messages, retry logic, and user-friendly feedback throughout the system
- ✅ **Authentication System Fully Implemented** - Added comprehensive email/Gmail login with Replit Auth integration
- ✅ **Admin Panel Complete** - Three-tier admin system (user, admin, super_admin) with user management and analytics
- ✅ **Performance Optimizations** - Fixed autoscale deployment performance issues and optimized startup times
- ✅ **Enhanced Forms** - Added "Paid By" and "Received By" fields for expense and income tracking
- ✅ **Fixed Export Functionality** - Text-based reports (PDF) and Excel exports now working perfectly
- ✅ **Responsive Dashboard** - Clean interface showing personal expenses, group sharing, and monthly statistics
- ✅ **Advanced Filtering** - Date ranges, categories, and search functionality
- ✅ **Real-time Statistics** - Monthly income, expenses, and net balance calculations
- ✅ **Real-time Collaborative Editing** - WebSocket-based live updates with notification system
- ✅ **User Profile & Settings System** - Multi-currency support with Pakistan-friendly defaults (PKR, Urdu, Karachi timezone)
- ✅ **Profile Initialization** - Automatic setup with localized defaults for Pakistani users
- ✅ **PKR Default Currency** - Set Pakistani Rupee (₨) as default across all functions and features
- ✅ **Micro-interactions & UI Animations** - Comprehensive animation framework with staggered loading, hover effects, and smooth transitions
- ✅ **Vercel Deployment Ready** - Complete Vercel configuration with serverless functions and static build setup
- ✅ **Progressive Web App (PWA)** - Full PWA implementation with offline support, installable app, and service worker caching

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with OpenID Connect strategy for Replit authentication
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **API Design**: RESTful API with JSON responses and comprehensive error handling

### Database Design
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema definitions
- **Key Tables**:
  - Users table for authentication (required by Replit Auth)
  - Groups table for expense sharing
  - Group members for many-to-many relationships
  - Transactions table for income/expense records
  - Transaction splits for shared expense distribution
  - Sessions table for authentication state

### Authentication & Authorization
- **Identity Provider**: Replit OpenID Connect integration
- **Session Storage**: Server-side sessions in PostgreSQL with configurable TTL
- **Authorization Pattern**: Middleware-based route protection with user context injection
- **Security Features**: HTTPS-only cookies, CSRF protection via session secrets

### Data Export Capabilities
- **PDF Generation**: jsPDF library for formatted expense reports
- **Excel Export**: ExcelJS for spreadsheet generation with filtering support
- **Export Filters**: Date ranges, categories, transaction types, and search terms

### Real-time Collaborative Features
- **WebSocket Integration**: Live updates using WebSocket Server (ws) with automatic reconnection
- **Instant Notifications**: Toast notifications and activity feed for real-time events
- **Multi-user Sync**: Automatic cache invalidation and data refresh across all connected clients
- **Connection Status**: Visual indicators showing live/offline connection status
- **Activity Tracking**: Comprehensive real-time activity log with timestamps and event types

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL connection with WebSocket support for serverless environments
- **drizzle-orm**: Type-safe database ORM with PostgreSQL adapter
- **express**: Web application framework with middleware ecosystem
- **passport**: Authentication middleware with OpenID Connect strategy

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives (dialogs, forms, navigation)
- **react-hook-form**: Form state management with validation
- **@hookform/resolvers**: Zod schema integration for form validation
- **wouter**: Lightweight routing library

### Development & Build Tools
- **vite**: Frontend build tool with hot reload and optimization
- **typescript**: Static type checking across the entire codebase
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management and migration tool

### Third-Party Integrations
- **Replit Authentication**: OpenID Connect provider for user authentication
- **Replit Development Tools**: Banner integration and cartographer plugin for development environment
- **Font Integration**: Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)

### Export and Utility Libraries
- **jspdf**: PDF document generation for expense reports
- **exceljs**: Excel file generation with advanced formatting
- **date-fns**: Date manipulation and formatting utilities
- **memoizee**: Function memoization for performance optimization