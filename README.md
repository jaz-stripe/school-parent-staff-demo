# School Management System with Stripe Connect Integration

This project is a demonstration of how multiple schools can integrate Stripe Billing (RFA) for managing tuition payments and other school-related purchases, using Stripe Connect architecture. The system allows for platform management of multiple school accounts, each with their own payment processing capabilities.

## Features

### Multi-School Platform
- Platform management of multiple school accounts
- Each school has its own Stripe Connect account
- School-specific branding and customization
- Separation of data between different schools

### Parent Portal
- Sign up and add children
- Select tuition payment frequency (weekly, monthly, yearly)
- Add payment methods securely using Stripe Elements
- Purchase additional items for themselves or their children
- Access Stripe Customer Portal for payment management

### Staff Portal
- View all parents and students within their school
- Add items to multiple parents or students at once
- View individual parent details and their children
- Access transaction and invoice information
- Open Stripe Customer Portal on behalf of parents

### School Onboarding
- Add new schools to the platform
- Customizable school names and logos
- Streamlined Stripe Connect onboarding process
- Automatic setup of school catalog after onboarding

### Stripe Connect Integration
- Platform-level management of connected accounts
- Each school processes payments through their own account
- Shared product catalog framework with school-specific data
- Support for different country requirements

## Project Structure

### Core Files and Directories

```
/
├── components/          # Reusable UI components
│   ├── AddressForm.tsx  # Stripe Address Element wrapper
│   ├── PaymentMethodForm.tsx # Stripe Payment Element wrapper
│   ├── ProductSelection.tsx   # Component for product selection
│   ├── StudentSelector.tsx   # Component for selecting students
│   └── TopBar.tsx      # Navigation bar component with school logo display
│
├── contexts/           # React contexts
│   └── AccountContext.tsx # Context for managing current school account
│
├── data/
│   └── PeterRabbitAndFriends.ts # Sample data for characters and schools
│
├── lib/                # Core business logic and utilities
│   ├── auth.ts         # Authentication with school account support
│   ├── config.ts       # Configuration and environment variables
│   ├── db.ts           # Database with school account data isolation
│   ├── parentStudent.ts # Parent and student operations for specific schools
│   ├── products.ts     # Product and subscription management
│   └── stripe.ts       # Stripe Connect API integration
│
├── pages/              # Next.js pages and API routes
│   ├── api/            # API endpoints
│   │   ├── accounts/   # School account management
│   │   │   ├── create.ts # Create new school account
│   │   │   ├── index.ts  # List school accounts
│   │   │   ├── onboarding-complete.ts # Handle onboarding completion
│   │   │   └── populate.ts # Populate school database
│   │   ├── auth/       # Authentication endpoints
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── parent-login.ts
│   │   │   ├── signup.ts
│   │   │   └── staff-login.ts
│   │   ├── parent/     # Parent-specific endpoints
│   │   │   ├── profile.ts
│   │   │   ├── students.ts
│   │   │   └── update-purchases.ts
│   │   ├── portal.ts   # Customer portal endpoint
│   │   ├── products.ts # Products listing endpoint
│   │   ├── staff/      # Staff-specific endpoints
│   │   │   ├── customer-portal/[customerId].ts
│   │   │   ├── embedded/
│   │   │   │   ├── outstanding-invoices.ts
│   │   │   │   └── recent-transactions.ts
│   │   │   ├── parent/[id].ts
│   │   │   ├── parents.ts
│   │   │   ├── profile.ts
│   │   │   ├── stripe-overview.ts
│   │   │   ├── students.ts
│   │   │   ├── update-parent-items/[id].ts
│   │   │   ├── update-parent-purchases.ts
│   │   │   └── update-student-purchases.ts
│   │   └── webhooks.ts # Stripe webhook handler for all accounts
│   │
│   ├── index.tsx       # Login page with school selection
│   ├── onboarding.tsx  # School onboarding page
│   ├── parent.tsx      # Parent detail page (for staff)
│   ├── parent-portal.tsx # Parent dashboard
│   ├── parents.tsx     # Parents listing page (for staff)
│   ├── sign-up.tsx     # Parent registration page
│   ├── staff-portal.tsx # Staff dashboard
│   └── students.tsx    # Students listing page (for staff)
│
├── public/             # Static assets
│   ├── school-logo.png  # Default school logo
│   └── logos/           # School-specific logos
│       ├── school-1.png
│       ├── school-2.png
│       └── ...
│
├── scripts/            # Utility scripts
│   ├── delete_stripe_products_and_customers.ts # Cleanup script with Connect support
│   ├── populate_account.ts # Script to populate a specific school's data
│   └── populate_database.ts # Main database initialization script
│
├── slices/             # Redux slices
│   └── userSlice.ts    # User state management
│
├── styles/             # CSS modules
│   ├── AddressForm.module.css
│   ├── globals.css
│   ├── Login.module.css
│   ├── Main.module.css
│   ├── Onboarding.module.css
│   ├── ParentDetail.module.css
│   ├── ParentPortal.module.css
│   ├── Parents.module.css
│   ├── PaymentMethodForm.module.css
│   ├── Signup.module.css
│   ├── StaffPortal.module.css
│   ├── StudentSelector.module.css
│   ├── Students.module.css
│   └── TopBar.module.css
│
├── .env                # Environment variables (needs to be created)
├── .env.local          # Template for environment variables
├── next.config.js      # Next.js configuration
├── package.json        # Project dependencies
├── products.csv        # Product data for seeding
├── README.md           # Project documentation
└── tsconfig.json       # TypeScript configuration
```

## Setup and Running Instructions

### Prerequisites
- Node.js 16+ and npm
- Stripe account (in platform mode)
- SSL certificates for local HTTPS (required for Stripe)
- Basic understanding of Next.js, React, and TypeScript
- Familiarity with Stripe Connect concepts

### SSL Certificate Setup

Since the original certificate generation script is non-functional, you'll need to create SSL certificates manually:

1. Install `mkcert` (a tool for making locally-trusted development certificates):

   - On macOS: `brew install mkcert`
   - On Windows: `choco install mkcert`
   - On Linux: Follow the [mkcert installation instructions](https://github.com/FiloSottile/mkcert#installation)

2. Create and install a local CA:
   ```bash
   mkcert -install
   ```

3. Generate local certificates:
   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

4. Rename the generated files:
   ```bash
   mv localhost+2-key.pem localhost-key.pem
   mv localhost+2.pem localhost.pem
   ```

### Environment Setup

1. Copy `.env.local` to `.env` and fill in the required variables:
   ```
   NEXT_PUBLIC_DEFAULT_EMAIL=demo@example.com
   NEXT_PUBLIC_BASE_URL=https://localhost:3000
   SERVER_BASE_URL=https://localhost:3000
   CURRENCY="aud"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   CONNECTED_ACCOUNT=acct_... (optional)
   JWT_SECRET=your-jwt-secret
   ```

   Notes:
   - `STRIPE_SECRET_KEY` should be your platform account API key
   - `CONNECTED_ACCOUNT` is optional and can be used to specify a pre-existing Connect account ID

2. Set up Stripe Customer Portal Configuration:
   - Go to your Stripe Dashboard
   - Navigate to Settings > Billing (enable if needed) > Customer Portal
   - Configure your preferred settings for what customers can manage
   - Save the configuration

3. Create a Webhook endpoint in your Stripe Dashboard:
   - Go to Developers > Webhooks
   - Add an endpoint with URL: `https://your-domain/api/webhooks` 
   - Add the events: `account.updated`, `setup_intent.succeeded`, `invoice.paid`, `invoice.payment_failed`, and `subscription.created`
   - Get the Webhook signing secret for your `.env` file
   - For development, use Stripe CLI for local webhook forwarding (see below)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create the `public/logos` directory and add sample school logos:
   ```bash
   mkdir -p public/logos
   ```
   
   Add 10 logo image files named `school-1.png` through `school-10.png` to this directory.

3. Login to Stripe CLI:
   ```bash
   stripe login
   ```

4. Start the Stripe webhook listener:
   ```bash
   stripe listen --skip-verify --forward-to https://localhost:3000/api/webhooks
   ```
   This will output the STRIPE_WEBHOOK_SECRET when it runs `whsec_...`

5. Add the webhook signing secret to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Access the application at `https://localhost:3000`

3. The first time you run the application, you'll need to create a school:
   - Look for the cog icon in the top left corner
   - Click "Add a New School"
   - Complete the onboarding process with Stripe

### Using the Application

1. **Platform Admin Flow**:
   - Use the cog icon on the login page to switch between schools or add new ones
   - Add new schools through the onboarding process
   - Each school will have its own isolated data

2. **School Setup Flow**:
   - Create a new school with the "Add a New School" button
   - Complete the Stripe Connect onboarding process
   - Once onboarding is complete, the school's database will be automatically populated

3. **Parent Flow**:
   - Sign up as a new parent for a specific school
   - Add children and select payment frequency
   - Add payment method
   - View assigned tuition subscriptions
   - Add optional items for yourself or your children
   - Access Stripe Customer Portal for payment management

4. **Staff Flow**:
   - Log in as staff (pre-defined as Mr. McGregor with password "password")
   - View all parents and students for that school
   - Select multiple parents/students to add items to them
   - View individual parent details
   - View transactions and outstanding invoices

### Cleanup

If you want to reset the application:

1. Delete customers and products in Stripe:
   ```bash
   npx ts-node scripts/delete_stripe_products_and_customers.ts
   ```
   - Add `--delete-connected-accounts` to also delete the Connect accounts
   - Add `--clear-database` to clear the local database tables

2. Or manually delete the SQLite database:
   ```bash
   rm mydb.sqlite
   ```

## Implementation Details

### Multi-Account Architecture

The application uses a single platform Stripe account to manage multiple Connect accounts (one per school). Each school has:

- A separate Stripe Connect Standard account
- Isolated data in the database (via accountId foreign keys)
- Its own Stripe customers, products, prices, and subscriptions
- Custom branding (name and logo)

### Database Schema

The application uses SQLite with account-based data isolation:
- Every table includes an `accountId` column linking to the `account` table
- The `account` table stores Stripe Connect account IDs and onboarding status
- Queries filter data by accountId to ensure isolation between schools

### Stripe Connect Integration

The application uses several Stripe features:
- Connect Standard Accounts: For each school
- Account Onboarding: Streamlined onboarding experience
- Cross-account API calls: Using the Stripe-Account header
- Products and Prices: School-specific catalog
- Customers and Subscriptions: For student tuition
- Customer Portal: For payment method management
- Webhooks: For event handling across all accounts

### Authentication

The application uses JSON Web Tokens (JWT) with account-specific scoping. This ensures:
- Staff and parents can only access data from their own school
- Tokens include the accountId to enforce isolation
- Login requires selecting a specific school

## Development Notes

### Expanding the System

To add new features:

1. **School Management Features**:
   - Add school profile editing
   - Implement platform admin dashboards
   - Add support for subscription sharing between schools

2. **Connect Account Management**:
   - Add balance and payout reports
   - Implement account capability management
   - Add account verification status monitoring

3. **Platform Fee Management**:
   - Implement application fee calculations
   - Add platform revenue reporting
   - Create fee adjustment mechanisms

### Security Considerations

This demo focuses on functionality rather than security. For a production system:

1. Improve authentication with password hashing
2. Add proper validation to all API endpoints
3. Implement strict account isolation checks
4. Add rate limiting to prevent abuse
5. Use role-based access control for platform admins vs school admins
6. Implement comprehensive logging and audit trails

### Testing

The application doesn't include tests, but for a production system:

1. Add unit tests for utility functions
2. Add API tests for endpoints
3. Add tests for cross-account data isolation
4. Add integration tests for Stripe operations
5. Add end-to-end tests for user flows

## Troubleshooting

### Common Issues

1. **SSL Certificate Errors**:
   - Ensure your certificates are properly set up
   - Check that the browser trusts your self-signed certificate
   - Try accessing `https://localhost:3000` directly first

2. **Stripe Connect Onboarding Issues**:
   - Check the Stripe dashboard for account status
   - Review the account capabilities to ensure charges_enabled
   - Look for event logs in your application logs and Stripe dashboard

3. **Database Population Issues**:
   - If a school isn't populated after onboarding, use the `/api/accounts/populate` endpoint
   - Check the server logs for any errors during population

4. **Multiple Accounts Confusion**:
   - If users are seeing the wrong data, ensure they're logged into the correct school
   - Check that all queries are properly filtering by accountId
   - Verify that the token contains the correct accountId

### Getting Help

If issues persist, check:
- Stripe Connect documentation: https://stripe.com/docs/connect
- Next.js documentation: https://nextjs.org/docs
- The error logs in your console or server output

## Conclusion

This application demonstrates how to build a multi-tenant platform using Stripe Connect for payment processing. It allows multiple schools to onboard to your platform, each with their own Stripe account, while maintaining a consistent user experience.