# Payment Gateway Aggregator

![Demo](docs/demo.gif)

A unified payment gateway aggregator for Nepali e-commerce platforms, supporting **eSewa**, **Khalti**, <s>**NPS**</s>, <s>**ConnectIPS**</s>, <s>**MyPay**</s> and **Paypal** through a single integration.

<h3><I>~~Crossedout means Yet to be implemented :)~~~</I></h3>

## Tech Stack

- **Client:** React + TypeScript + Vite
- **Server:** Express + TypeScript
- **Database:** PostgreSQL + Drizzle ORM

## Project Structure
payement-gateway/
├── .github/
├── client/
│ ├── public/
│ ├── src/
│ ├── .env
│ ├── eslint.config.js
│ ├── index.html
│ ├── vite.config.ts
│ └── tsconfig*.json
├── server/
│ ├── config/
│ ├── controllers/
│ ├── models/
│ ├── routes/
│ ├── schemas/
│ ├── utils/
│ ├── .env
│ ├── app.ts
│ ├── index.ts
│ ├── Dockerfile
│ └── drizzle.config.ts
├── flow diagrams/
├── docker-compose.yml
├── LICENSE
└── package.json



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
JWT_SECRET=
ESEWA_API_KEY=
KHALTI_API_KEY=
DOCKER_PASSWORD=
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