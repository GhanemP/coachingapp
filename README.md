# Coaching App

A performance management and coaching application built with Next.js.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

3. Set up database:

   ```bash
   npx prisma db push
   npm run seed
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## Production Build

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for required environment variables.
