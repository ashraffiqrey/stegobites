const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Keep schema in sync for local development seeds.
    await client.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url TEXT");
    await client.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
    await client.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
    await client.query("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE");

    // Clear existing records so the seed is deterministic across runs.
    await client.query("DELETE FROM orders");
    await client.query("DELETE FROM listings");
    await client.query("DELETE FROM vendors");
    await client.query("DELETE FROM users");

    const passwordHash = await bcrypt.hash("123456", 10);

    // 1) Create users (2 vendors + 1 customer).
    const usersResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES
         ($1, $2, $3, 'vendor'),
         ($4, $5, $3, 'vendor'),
         ($6, $7, $3, 'customer')
       RETURNING id, full_name, email, role`,
      [
        "Vendor One",
        "vendor1@test.com",
        passwordHash,
        "Vendor Two",
        "vendor2@test.com",
        "Demo Customer",
        "user@test.com"
      ]
    );

    const vendorUser1 = usersResult.rows.find((row) => row.email === "vendor1@test.com");
    const vendorUser2 = usersResult.rows.find((row) => row.email === "vendor2@test.com");

    // 2) Create vendor profiles linked to vendor users.
    const vendorsResult = await client.query(
      `INSERT INTO vendors (
         user_id,
         business_name,
         description,
         location,
         latitude,
         longitude,
         onboarding_completed,
         is_approved
       )
       VALUES
         ($1, $2, $3, $4, $5, $6, true, true),
         ($7, $8, $9, $10, $11, $12, true, true)
       RETURNING id, business_name`,
      [
        vendorUser1.id,
        "Jaslea Bakery",
        "Fresh baked goods and pastry boxes",
        "Kuala Lumpur",
        3.139,
        101.6869,
        vendorUser2.id,
        "Stego Cafe",
        "Coffee, sandwiches, and ready-to-go meals",
        "Petaling Jaya",
        3.1073,
        101.6067
      ]
    );

    const vendor1 = vendorsResult.rows.find((row) => row.business_name === "Jaslea Bakery");
    const vendor2 = vendorsResult.rows.find((row) => row.business_name === "Stego Cafe");

    const now = new Date();
    const plusHours = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

    // 3) Create sample listings linked to vendors.
    await client.query(
      `INSERT INTO listings (
         vendor_id,
         title,
         description,
         original_price,
         discounted_price,
         quantity,
         pickup_start,
         pickup_end,
         is_active
       )
       VALUES
         ($1, 'Croissant Box', '4 mixed croissants', 20.00, 9.90, 6, $3, $4, true),
         ($1, 'Bagel Bundle', 'Sesame and plain bagels', 18.00, 8.50, 5, $3, $4, true),
         ($1, 'Sandwich Pack', 'Assorted mini sandwiches', 24.00, 12.00, 4, $3, $4, true),
         ($2, 'Nasi Lemak Set', 'Rice, sambal, and sides', 16.00, 7.50, 10, $5, $6, true),
         ($2, 'Pasta Meal Box', 'Creamy chicken pasta', 22.00, 10.90, 7, $5, $6, true),
         ($2, 'Coffee + Pastry Combo', 'Any coffee and pastry', 14.00, 6.90, 9, $5, $6, true)`,
      [vendor1.id, vendor2.id, plusHours(2), plusHours(5), plusHours(6), plusHours(9)]
    );

    await client.query("COMMIT");
    console.log("Seeding complete");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
