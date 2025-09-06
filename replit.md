# Vale Cashback Pro

## Overview

Vale Cashback Pro is a comprehensive cashback and referral system with multi-level administration panels. The system enables businesses to offer cashback rewards to customers, manage referral programs, and process QR code payments. It includes separate dashboards for administrators, merchants, and clients, with real-time transaction processing and financial reporting capabilities.

The application features a complete transaction ecosystem where merchants pay platform fees, customers receive cashback rewards, and referrals generate bonus commissions. The system has been tested with authentic user data and includes 160+ real users across different user types.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query for server state and caching
- **Form Handling**: React Hook Form with Zod schema validation
- **Routing**: React Router for client-side navigation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript for type safety across the stack
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based auth with bcrypt password hashing
- **File Structure**: Modular route handlers with shared schema definitions
- **API Design**: RESTful endpoints with role-based access control

### Database Design
- **Database**: PostgreSQL with 21+ tables for comprehensive data management
- **Key Tables**: users, merchants, transactions, cashbacks, qr_codes, referrals
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Data Integrity**: Foreign key relationships and constraints
- **Performance**: Indexed queries for user lookups and transaction processing

### Authentication & Authorization
- **Session Management**: Express-session with secure cookie storage
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access**: Three user types (admin, merchant, client) with specific permissions
- **Password Reset**: Token-based system with expiration and security notifications

### Transaction Processing
- **Fee Structure**: 5% platform fee, 2% client cashback, 1% referral bonus
- **Real-time Processing**: Immediate cashback calculation and distribution
- **QR Code Payments**: Dynamic QR generation for contactless transactions
- **Financial Tracking**: Complete audit trail for all monetary transactions

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **Connection**: SSL-required connections with connection pooling
- **Backup**: SQL dump restoration capabilities for data migration

### Development Tools
- **ESLint**: Code quality and consistency enforcement
- **TypeScript**: Static type checking across the entire codebase
- **Drizzle Kit**: Database schema management and migrations
- **PM2**: Process management for production deployments (ecosystem.config.js)

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library with customizable themes
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Framer Motion**: Animation library for enhanced user experience

### Hosting and Deployment
- **Vercel**: Serverless deployment platform (primary)
- **VPS Options**: Traditional server deployment with Node.js runtime
- **Environment Variables**: Database URL and session secrets for security
- **Build Process**: Vite frontend build with Express backend bundling

### Business Logic Libraries
- **bcrypt**: Password hashing and validation
- **UUID**: Unique identifier generation for transactions and sessions
- **Archiver**: File compression for backup and export features
- **File Upload**: Express-fileupload for merchant document handling

The system is designed for horizontal scaling with stateless backend services and can be deployed across multiple environments from development to production. The modular architecture allows for easy feature additions and maintenance.