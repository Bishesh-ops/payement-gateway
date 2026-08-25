# Payment Gateway Aggregator

![67](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXVpaXc4Yzk2MW40Yml2dHgyOWhtdWNoMWwzbmhoMmxtdDE1MGNrYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dmmBhPUnCSF9ibuTEo/giphy.gif)

A unified payment gateway aggregator for Nepali e-commerce platforms, supporting **eSewa**, **Khalti**, <s>**NPS**</s>, <s>**ConnectIPS**</s>, <s>**MyPay**</s> and **Paypal** through a single integration.

<h3><I><s>Crossedout means Yet to be implemented :)</s></I></h3>

## Tech Stack

- **Client:** React + TypeScript + Vite
- **Server:** Express + TypeScript
- **Database:** PostgreSQL + Drizzle ORM

## Project Structure
payement-gateway/<br>
├── .github/ <br>
├── client/ <br>
│ ├── public/ <br>
│ ├── src/ <br>
│ ├── .env <br>
│ ├── eslint.config.js <br>
│ ├── index.html <br>
│ ├── vite.config.ts <br>
│ └── tsconfig*.json <br>
├── server/ <br>
│ ├── config/ <br>
│ ├── controllers/ <br>
│ ├── models/ <br>
│ ├── routes/ <br>
│ ├── schemas/ <br>
│ ├── utils/ <br>
│ ├── .env <br>
│ ├── app.ts <br>
│ ├── index.ts <br>
│ ├── Dockerfile <br>
│ └── drizzle.config.ts <br>
├── flow diagrams/ <br>
├── docker-compose.yml <br>
├── LICENSE <br>
└── package.json <br>
<br>

## Supported Providers

- Khalti
- eSewa
- <s>NPS</s>
- <s>ConnectIPS</s>
- <s>MyPay</s>
- Paypal

## Auth Flow

1. Customer initiates payment on the client's e-commerce system.
2. Client redirects to the Bridge with a `transaction_token` (JWT) and a PG API Key header.
3. Bridge validates the token, then fetches transaction details server-to-server from the client's backend.
4. Middleware presents the provider selection UI.
5. Middleware-Backend transforms the payload, dispatches to the chosen provider, and verifies status server-to-server.

## Getting Started

```bash
git clone https://github.com/Bishesh-ops/payement-gateway.git
cd payement-gateway
```

### Client Setup

```bash
cd client
npm install
npm run dev
```

Requires a `client/.env` with:

```env
VITE_API_URL=
```

### Backend Setup (Docker)

The backend (API + PostgreSQL) is fully containerized.

1. Create `server/.env`:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:${DOCKER_PASSWORD}@localhost:5432/payment_gateway_db

SUCCESS_URL=http://localhost:5173/payment/success
FAILURE_URL=http://localhost:5173/payment/failure

ESEWA_MERCHANT_ID=EPAYTEST
ESEWA_SECRET=8gBm/:&EnhH.1/q
ESEWA_PAYMENT_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_PAYMENT_STATUS_CHECK_URL=https://rc-epay.esewa.com.np/api/epay/transaction/status/


KHALTI_PUBLIC_KEY=your_public_key
KHALTI_SECRET_KEY=your_secret_key
KHALTI_PAYMENT_URL=https://a.khalti.com/api/v2/epayment/initiate/
KHALTI_VERIFICATION_URL=https://a.khalti.com/api/v2/epayment/lookup/

PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

DOCKER_PASSWORD=your_password
```

2. From the project root, run:

```bash
docker-compose up --build
```

This spins up:
- **`pg_payment_db`** — a Postgres 15 container on port `5432`, with data persisted in the `pgdata` volume
- **`payment_backend`** — the API server, built from `server/Dockerfile`, connected to the `db` service internally via `DATABASE_URL`

3. Run migrations against the running container:

```bash
docker exec -it payment_backend npm run db:migrate
```

## License

See [LICENSE](LICENSE).
