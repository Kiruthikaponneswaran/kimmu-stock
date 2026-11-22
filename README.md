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

## Photos
Put `login-banner.jpg` and `dashboard-banner.jpg` in `public/images/` (see the README there). Products can show a photo too:
paste an image link in the "Image link" field when adding or editing a product.

## Hosting
Set `ADMIN_PASSWORD` and `JWT_SECRET` as environment variables. The administrator is `admin@kimmustock.com`, and its
password is whatever `ADMIN_PASSWORD` is set to each time the app starts.
