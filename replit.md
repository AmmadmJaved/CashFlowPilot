# ExpenseShare Application

## Overview

ExpenseShare is a full-stack web application for expense tracking and sharing built with React, TypeScript, Express.js, and PostgreSQL. The application allows users to track personal expenses, create expense groups for sharing costs with others, and export financial data. It features a modern UI built with shadcn/ui components and Tailwind CSS, with authentication handled through Replit's OpenID Connect system.

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