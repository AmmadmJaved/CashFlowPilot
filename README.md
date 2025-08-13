# ExpenseShare - Smart Expense Tracking PWA

A user-friendly full-stack Progressive Web Application for expense tracking and sharing built with React, TypeScript, Express.js, and PostgreSQL. Features real-time collaboration, group management, comprehensive financial reporting, and offline support.

## 🌟 Features

### Core Functionality
- **Personal Expense Tracking** - Track income and expenses with categories
- **Group Expense Sharing** - Create groups and split costs with friends
- **Real-time Collaboration** - Live updates with WebSocket integration
- **Advanced Filtering** - Search by date, category, amount, and person
- **Data Export** - PDF reports and Excel spreadsheets
- **Multi-currency Support** - PKR default with multiple currency options

### PWA Features
- **Installable App** - Install on mobile and desktop devices
- **Offline Support** - Works without internet connection
- **Push Notifications** - Real-time updates and reminders
- **Native App Feel** - Standalone app experience
- **Auto-sync** - Data syncs when back online

### Technical Features
- **Micro-interactions** - Smooth animations and transitions
- **Responsive Design** - Works on all screen sizes
- **Dark Mode Compatible** - Consistent theming
- **Real-time Statistics** - Live financial insights
- **Secure Authentication** - Session-based security

## 🚀 Quick Start

### For Users
1. Visit the deployed app at your-domain.vercel.app
2. Click the install banner or browser menu to install as PWA
3. Start tracking expenses immediately - no signup required!

### For Developers

#### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon, Supabase, or Vercel Postgres)
- Vercel CLI (optional)

#### Local Development
```bash
# Clone the repository
git clone <your-repo>
cd expenseshare

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## 📦 Vercel Deployment

### Automatic Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Environment Variables
Configure these in Vercel dashboard:

```env
DATABASE_URL=postgresql://username:password@host:5432/database
SESSION_SECRET=your-super-secret-session-key
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=your-database
NODE_ENV=production
```

## 🔧 Configuration Files

### Vercel Configuration
- `vercel.json` - Vercel deployment configuration
- `api/index.ts` - Serverless function wrapper
- `BUILD_FOR_VERCEL.md` - Detailed deployment guide

### PWA Configuration
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker for offline support
- `client/src/hooks/usePWA.ts` - PWA installation hook
- `client/src/components/PWAInstallBanner.tsx` - Install prompt

## 🏗️ Project Structure

```
├── api/                    # Vercel serverless functions
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Utilities and configurations
├── server/                # Backend Express server
├── shared/                # Shared TypeScript types
├── public/                # Static assets and PWA files
├── vercel.json           # Vercel configuration
└── BUILD_FOR_VERCEL.md   # Deployment guide
```

## 🎨 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing

### Backend
- **Express.js** - Web framework
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Robust database
- **WebSocket** - Real-time communication
- **Passport.js** - Authentication

### PWA & Deployment
- **Service Worker** - Offline support
- **Web App Manifest** - Installation metadata
- **Vercel** - Serverless deployment
- **Vite** - Fast build tool

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Click the install icon in the address bar
2. Click "Install" in the popup
3. App appears in your applications menu

### Mobile (Android)
1. Tap the install banner
2. Or use browser menu > "Add to Home Screen"
3. App appears on your home screen

### Mobile (iOS)
1. Tap the Share button in Safari
2. Select "Add to Home Screen"
3. Confirm installation

## 🌍 Multi-currency Support

Default currency: Pakistani Rupee (₨)
Supported currencies:
- PKR (Pakistani Rupee)
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- INR (Indian Rupee)
- And more...

## 📊 Features Overview

### Expense Management
- Add income/expense transactions
- Categorize by type (food, utilities, etc.)
- Track who paid and received money
- Real-time balance calculations

### Group Sharing
- Create expense sharing groups
- Invite members via WhatsApp/email
- Split costs automatically
- Track group balances

### Reporting & Export
- Monthly statistics and trends
- Advanced filtering options
- PDF expense reports
- Excel spreadsheet export
- Custom date ranges

### Real-time Collaboration
- Live updates across all devices
- WebSocket-based notifications
- Activity feed
- Connection status indicator

## 🔒 Security

- Environment-based configuration
- Secure session management
- HTTPS enforced in production
- CORS properly configured
- No sensitive data in client code

## 🚀 Performance

- Service Worker caching
- Offline-first architecture
- Optimized bundle size
- Lazy loading
- Hardware-accelerated animations
- 60fps micro-interactions

## 📈 Future Enhancements

- Push notifications
- Recurring transactions
- Budget planning
- Receipt photo upload
- Bank account integration
- Advanced analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For deployment issues or questions:
1. Check BUILD_FOR_VERCEL.md
2. Review Vercel deployment logs
3. Test PWA functionality in browser DevTools
4. Verify environment variables are set correctly

---

Built with ❤️ for seamless expense tracking and sharing