# School Management System with Stripe Integration

This project is a demonstration of how a school can integrate Stripe Billing (RFA) for managing tuition payments and other school-related purchases. The system allows parents to sign up, add their children, manage payment methods, and purchase items, while staff members can view all parents and students, add items to them, and monitor transactions.

## Features

### Parent Portal
- Sign up and add children
- Select tuition payment frequency (weekly, monthly, yearly)
- Add payment methods securely using Stripe Elements
- Purchase additional items for themselves or their children
- Access Stripe Customer Portal for payment management

### Staff Portal
- View all parents and students
- Add items to multiple parents or students at once
- View individual parent details and their children
- Access transaction and invoice information
- Open Stripe Customer Portal on behalf of parents

### Stripe Integration
- Subscription-based tuition payments
- One-time purchases for various items
- Customer Portal for payment method management
- Webhook handling for payment events
- Embedded components for transaction display

## Project Structure

### Core Files and Directories

```
/
├── components/          # Reusable UI components
│   ├── AddressForm.tsx  # Stripe Address Element wrapper
│   ├── PaymentMethodForm.tsx # Stripe Payment Element wrapper
│   ├── SimplifiedContext.tsx # Context for simplified mode toggle
│   ├── StudentSelector.tsx   # Component for selecting students
│   └── TopBar.tsx      # Navigation bar component
│
├── data/
│   └── PeterRabbitAndFriends.ts # Sample data for characters
│
├── lib/                # Core business logic and utilities
│   ├── auth.ts         # Authentication utilities
│   ├── config.ts       # Configuration and environment variables
│   ├── db.ts           # Database initialization and schema
│   ├── parentStudent.ts # Parent and student operations
│   ├── products.ts     # Product and subscription management
│   └── stripe.ts       # Stripe API integration
│
├── pages/              # Next.js pages and API routes
│   ├── api/            # API endpoints
│   │   ├── auth/       # Authentication endpoints
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── parent-login.ts
│   │   │   ├── signup.ts
│   │   │   └── staff-login.ts
│   │   ├── create-setup-intent.ts
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
│   │   └── webhooks.ts # Stripe webhook handler
│   │
│   ├── index.tsx       # Login page
│   ├── parent.tsx      # Parent detail page (for staff)
│   ├── parent-portal.tsx # Parent dashboard
│   ├── parents.tsx     # Parents listing page (for staff)
│   ├── sign-up.tsx     # Parent registration page
│   ├── staff-portal.tsx # Staff dashboard
│   └── students.tsx    # Students listing page (for staff)
│
├── public/             # Static assets
│   └── school-logo.svg # School logo
│
├── scripts/            # Utility scripts
│   ├── delete_stripe_products_and_customers.ts # Cleanup script
│   └── populate_database.ts # Database seed script
│
├── slices/             # Redux slices
│   └── userSlice.ts    # User state management
│
├── styles/             # CSS modules
│   ├── AddressForm.module.css
│   ├── globals.css
│   ├── Login.module.css
│   ├── Main.module.css
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
- Node.js 14+ and npm
- Stripe account (test mode)
- Basic understanding of Next.js, React, and TypeScript

### Environment Setup

1. Copy `.env.local` to `.env` and fill in the required variables:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   JWT_SECRET=your-jwt-secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_BASE_URL=https://localhost:3000
   NEXT_PUBLIC_DEFAULT_EMAIL=demo@example.com
   ```

2. Set up Stripe Customer Portal Configuration:
   - Go to your Stripe Dashboard
   - Navigate to Settings > Billing (enable if needed) > Customer Portal
   - Configure your preferred settings for what customers can manage
   - Save the configuration

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate SSL certificates for local development (required for Stripe):
   ```bash
   npm run generate-cert
   ```

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

### Database Initialization

1. Run the database population script:
   ```bash
   npx ts-node scripts/populate_database.ts
   ```

   This script will:
   - Create products in Stripe based on `products.csv`
   - Create subscription pricing for tuition products
   - Create one-time pricing for student and parent items
   - Add staff members from `PeterRabbitAndFriends.ts`

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Access the application at `https://localhost:3000`

### Using the Application

1. **Parent Flow**:
   - Sign up as a new parent
   - Add children and select payment frequency
   - Add payment method
   - View assigned tuition subscriptions
   - Add optional items for yourself or your children
   - Access Stripe Customer Portal for payment management

2. **Staff Flow**:
   - Log in as staff (pre-defined as Mr. McGregor with password "password")
   - View all parents and students
   - Select multiple parents/students to add items to them
   - View individual parent details
   - View transactions and outstanding invoices

### Cleanup

If you want to reset the application:

1. Delete customers in the Stripe dashboard or use the API
2. Archive products created by the application:
   ```bash
   npx ts-node scripts/delete_stripe_products_and_customers.ts
   ```
3. Delete the SQLite database:
   ```bash
   rm mydb.sqlite
   ```

## Implementation Details

### Database Schema
The application uses SQLite for local storage with the following key tables:
- `parent`: Stores parent information and Stripe customer ID
- `student`: Links students to parents with their year level
- `subscription`: Stores tuition products for each year
- `subscription_price`: Links tuition products to their different payment frequencies
- `product`: Stores non-subscription products (student/parent items)
- `parent_subscriptions`: Records tuition subscriptions for parents
- `parent_purchases`: Records one-time purchases by parents

### Stripe Integration
The application uses several Stripe features:
- Products and Prices: Both subscription and one-time
- Customers: Each parent is a Stripe customer
- Payment Methods: Captured via Stripe Elements
- Subscriptions: For recurring tuition payments
- Invoices: For one-time purchases
- Customer Portal: For payment method management
- Webhooks: For event handling

### Authentication
The application uses JSON Web Tokens (JWT) for authentication with cookies for storage. The `auth.ts` library handles token generation, verification, and user identification.

### React Components
Key components include:
- `TopBar`: Navigation and user menu
- `StudentSelector`: Component for selecting and managing student information
- `AddressForm`: Wraps Stripe Address Element
- `PaymentMethodForm`: Wraps Stripe Payment Element

## Development Notes

### Expanding the System
To add new features:

1. **New Product Types**:
   - Add entries to the `products.csv` file
   - Run the database population script
   - Update the UI to display and manage these products

2. **Additional User Roles**:
   - Extend the user model in `db.ts`
   - Add authentication handling in `auth.ts`
   - Create appropriate UI flows and API endpoints

3. **Enhanced Reporting**:
   - Add new API endpoints to fetch data from Stripe and the local database
   - Create visualization components to display this data

### Security Considerations
This demo focuses on functionality rather than security. For a production system:

1. Improve authentication with password hashing
2. Add proper validation to all API endpoints
3. Implement CSRF protection
4. Add rate limiting to prevent abuse
5. Ensure all Stripe operations have proper error handling
6. Implement comprehensive logging

### Testing
The application doesn't include tests, but for a production system:

1. Add unit tests for utility functions
2. Add API tests for endpoints
3. Add integration tests for Stripe operations
4. Add end-to-end tests for user flows

## Troubleshooting

### Common Issues

1. **Stripe API Key Issues**:
   - Ensure your API keys are correct in `.env`
   - Make sure you're using test mode keys

2. **Webhook Errors**:
   - Ensure the webhook listener is running
   - Check that the webhook secret is correct

3. **Database Issues**:
   - If errors occur during database operations, delete the SQLite file and re-run the population script

4. **Payment Setup Issues**:
   - Check browser console for errors
   - Ensure the Stripe publishable key is correct
   - Test with Stripe test cards

### Getting Help
If issues persist, check:
- Stripe documentation: https://stripe.com/docs
- Next.js documentation: https://nextjs.org/docs
- The error logs in your console or server output

## Conclusion

This application demonstrates how schools can integrate with Stripe Billing to manage tuition payments and other purchases. It provides a foundation that can be expanded with additional features specific to your school's needs.