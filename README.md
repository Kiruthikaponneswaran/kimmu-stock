# Kimmu Stock

Inventory and ERP web app: masters, inventory tracking, production, sales, purchase, finance, accounts, reports and Excel export.
Built with Next.js 15, React 19, Redux Toolkit, Node.js and SQLite (no separate database server).

## Run locally
Needs Node.js 20 or newer.

    npm install
    npm run dev          # http://localhost:3000

For production: `npm run build && npm start`.

## First sign-in
The first start creates an administrator: `admin@kimmustock.com`. Its password is `ADMIN_PASSWORD` from your environment
(copy `.env.example` to `.env.local`), or `Admin@123` if you do not set one. Change it right away under Accounts > User accounts.
Set `JWT_SECRET` to a long random string when you host it.

## Roles
- **admin**: everything, plus users and access rights
- **manager / staff**: set per area in Accounts > Access rights
- **viewer**: created when anyone signs up; read-only access to products and categories

## Data
Stored in the `data` folder (git-ignored). Back it up to keep your records.
