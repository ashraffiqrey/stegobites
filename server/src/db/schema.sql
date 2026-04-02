CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(180) NOT NULL,
  description TEXT,
  location VARCHAR(180) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_latitude_range'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_latitude_range CHECK (
        latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_longitude_range'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_longitude_range CHECK (
        longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  image_url TEXT,
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price > 0),
  discounted_price NUMERIC(10, 2) NOT NULL CHECK (discounted_price > 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  pickup_start TIMESTAMP NOT NULL,
  pickup_end TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_pickup_window CHECK (pickup_end > pickup_start),
  CONSTRAINT valid_discount CHECK (discounted_price <= original_price)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'picked_up', 'cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_vendor_id ON listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
