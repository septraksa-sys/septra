@@ .. @@
# Septra - Pharmaceutical Procurement Platform

A comprehensive B2B pharmaceutical procurement platform that streamlines the entire supply chain from demand aggregation to delivery tracking.

## 🚀 Live Demo

The application is deployed and ready to use! Access it through your deployment URL.

## 🔑 Login Credentials

- **Admin**: `admin@septra.com` / `admin123`
- **Register**: Use the registration form to create pharmacy or supplier accounts

## ✨ Features

### Admin Dashboard
- **SKU Engine**: Centralized product catalog management
- **Demand Aggregation**: Combine pharmacy demands into bulk orders
- **RFQ Management**: Publish and manage Request for Quotations
- **Bid Management**: Review and award supplier bids
- **Order Management**: Track complete order lifecycle
- **Escrow Management**: Secure payment processing
- **Logistics Tracking**: Monitor deliveries and shipments
- **Analytics**: Comprehensive platform insights

### Pharmacy Portal
- Submit pharmaceutical demands
- Confirm and pay for aggregated orders
- Track order delivery status
- Manage payment terms and delivery addresses

### Supplier Portal
- View open RFQs matching your categories
- Submit competitive bids
- Manage awarded orders and fulfillment
- Track shipping and delivery status

## 🏗️ Architecture

- **Frontend**: Next.js 13 with TypeScript and Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Local storage + Supabase integration
- **Deployment**: Bolt Cloud (Static Export)

## Supabase Setup

This application uses Supabase for authentication and data storage.

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Wait for the project to be set up

### 2. Get your Supabase credentials
1. Go to your project settings
2. Navigate to API settings
3. Copy your project URL and anon public key

### 3. Configure environment variables
Your `.env.local` file should already be configured with your Supabase credentials.

### 4. Run database migrations
1. Go to your Supabase SQL Editor
2. Copy and paste this simple migration:

```sql
-- Simple Supabase Migration for Septra Platform
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('pharmacy', 'supplier', 'admin')),
  name text,
  address text,
  phone text,
  license_number text,
  rating decimal(3,2) DEFAULT 4.0,
  categories text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view own profile" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
```

3. Click "Run" to execute the migration

## Authentication

The application uses Supabase Auth with email/password authentication. Users are stored in the `profiles` table with role-based access control.

### Creating an Admin Account

After running the migration, you need to create an admin account:

#### Option 1: Through the Application (Recommended)
1. Start your application with `npm run dev`
2. Open the browser console (F12)
3. Run this command in the console:
```javascript
// Import the function and create admin user
import('./lib/seed-data.js').then(module => {
  module.createAdminUser('admin@septra.com', 'admin123');
});
```

#### Option 2: Manual Creation in Supabase
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user" and create a user with email `admin@septra.com`
4. Go to SQL Editor and run:
```sql
INSERT INTO profiles (id, email, role, name)
SELECT id, email, 'admin', 'Administrator'
FROM auth.users 
WHERE email = 'admin@septra.com';
```

### Login Credentials
- **Admin**: admin@septra.com / admin123
- **Register new users**: Use the registration form in the application

## Getting Started

1. **Clone and Install**
   ```bash
   npm install
   npm run dev
   ```

2. **Configure Supabase** (if running locally)
   - Set up your Supabase project
   - Run the provided migration
   - Create admin user

3. **Access the Platform**
   - Login with admin credentials
   - Create SKUs in the SKU Engine
   - Register pharmacy and supplier accounts
   - Start the procurement workflow

## 🔄 Workflow

1. **Admin** creates SKUs in the SKU Engine
2. **Pharmacies** submit demands for pharmaceutical products
3. **Admin** aggregates demands into Septra Orders
4. **Admin** publishes RFQs to suppliers
5. **Suppliers** submit competitive bids
6. **Admin** awards bids to best suppliers
7. **Pharmacies** confirm orders and pay to escrow
8. **Suppliers** fulfill orders and arrange shipping
9. **Admin** coordinates logistics and delivery
10. **System** releases escrow payments upon delivery

## 🛡️ Security Features

- Supabase Authentication with Row Level Security (RLS)
- Role-based access control (Admin, Pharmacy, Supplier)
- Secure escrow payment processing
- Data encryption and secure API endpoints

## 📱 Responsive Design

Fully responsive design that works seamlessly across:
- Desktop computers
- Tablets
- Mobile devices

## 🎯 Production Ready

- Static export optimized for deployment
- Error handling and loading states
- Performance optimized with Next.js
- SEO friendly with proper meta tags
- Accessibility compliant (WCAG guidelines)