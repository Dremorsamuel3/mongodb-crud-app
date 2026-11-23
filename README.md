# Stockly Product Inventory

A responsive full-stack product inventory application built with React, Vite, Node.js, Express, MongoDB, and Mongoose.

## Features

- Create, read, update, and delete products
- Search by name, SKU, or notes
- Filter by category and view inventory totals
- Mongoose validation and duplicate SKU protection
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

4. Update `MONGO_URI` in `.env` if necessary. The default expects MongoDB at `mongodb://127.0.0.1:27017/inventory`.
5. Start the development servers:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

The server starts even without MongoDB configured, but inventory API requests return `503` until `MONGO_URI` is set and the database is reachable.

## Production build

```sh
npm run build
npm run start:windows
```

Then open `http://localhost:5000` (or the port from `.env`). On macOS/Linux, use `NODE_ENV=production node server/app.js` instead.

## VS Code

Open the Run and Debug view and choose **Inventory App (Full Stack)** to start both the Vite client and Express API. The configuration is available in `.vscode/launch.json`.

## Render deployment

The included `render.yaml` creates a Node web service and declares `MONGO_URI` as a secret environment variable.

1. In Render, create a Web Service from this GitHub repository.
2. Set `MONGO_URI` to a MongoDB Atlas connection string with database credentials.
3. Deploy using build command `npm ci && npm run build` and start command `npm start`.
4. Confirm `/api/health` reports `{"status":"ok"}` before submitting the Render URL.

## API

- `GET /api/health`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/stats`

Optional product-list query parameters include `search`, `category`, `sort`, and `order`.

## Submission checklist

- [ ] Set `MONGO_URI` to a reachable MongoDB Atlas or local MongoDB connection string.
- [ ] Run `npm install`.
- [ ] Run `npm run build`.
- [ ] Run `npm run dev` and verify the app at `http://localhost:5173`.
- [ ] Verify CRUD operations and refresh the page to confirm data persists in MongoDB.
- [ ] Confirm `GET /api/health` returns `{"status":"ok"}`.
- [ ] Optionally deploy `render.yaml` and submit the public Render URL.
