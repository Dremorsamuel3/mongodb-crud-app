# Bookstack Library Inventory

A responsive full-stack library inventory application built with Node.js, Express, MongoDB, Mongoose, and vanilla HTML/CSS/JavaScript.

## Features

- Create, read, update, and delete books
- Search by title, author, or ISBN
- Filter by genre and view library totals
- Mongoose validation and duplicate ISBN protection
- Loading, empty, error, confirmation, and success states
- Responsive desktop and mobile interface

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

1. Open a terminal in this folder.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Create the environment file:

   ```sh
   copy .env.example .env
   ```

4. Update `MONGODB_URI` in `.env` if necessary. The default expects MongoDB at `mongodb://127.0.0.1:27017/library_inventory`.
5. Start the development servers:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

## Production build

```sh
npm run build
npm run start:windows
```

Then open `http://localhost:5000` (or the port from `.env`). On macOS/Linux, use `NODE_ENV=production node server/app.js` instead.

## API

- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books`
- `PUT /api/books/:id`
- `DELETE /api/books/:id`
- `GET /api/stats`

Optional book-list query parameters include `search`, `genre`, `sort`, and `order`.
