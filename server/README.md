# ReMeal Server (Express + PostgreSQL)

## Setup

1. Install dependencies:
   - `npm install` from repo root
   - or `cd server && npm install`
2. Copy environment file:
   - `cp .env.example .env` (or Windows equivalent)
3. Create a PostgreSQL database.
4. Run SQL schema from `src/db/schema.sql`.
5. Start server:
   - `npm run dev`

## API Base URL

- `http://localhost:5000/api`

## Auth

- `POST /auth/register`
- `POST /auth/login`

### Register payload

```json
{
  "fullName": "Alex Doe",
  "email": "alex@example.com",
  "password": "password123",
  "role": "customer"
}
```

## Users

- `GET /users/me` (auth required)
- `GET /users` (admin only)

## Vendors

- `POST /vendors/register` (vendor role)
- `GET /vendors/me` (vendor role)
- `PATCH /vendors/me` (vendor role)
- `GET /vendors/pending` (admin)
- `PATCH /vendors/:vendorId/approve` (admin)

## Listings

- `GET /listings`
- `GET /listings?location=city`
- `GET /listings?lat=3.139&lng=101.6869`
- `GET /listings/:listingId`
- `POST /listings` (approved vendor)
- `PATCH /listings/:listingId/sold-out` (vendor)

### Vendor profile payload

```json
{
  "businessName": "Surplus Cafe",
  "location": "Rawang",
  "description": "Fresh meals and bakery boxes",
  "latitude": 3.3214,
  "longitude": 101.5767
}
```

### Create listing payload

```json
{
  "title": "Surprise Bakery Bag",
  "description": "Bread + pastries",
  "originalPrice": 30,
  "discountedPrice": 12,
  "quantity": 8,
  "pickupStart": "2026-03-26T18:00:00.000Z",
  "pickupEnd": "2026-03-26T20:00:00.000Z"
}
```

## Orders

- `POST /orders` (customer reserve)
- `GET /orders/my` (customer)
- `GET /orders/vendor` (vendor)

### Reserve payload

```json
{
  "listingId": "UUID_HERE",
  "quantity": 1
}
```

