import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ── DB connection ────────────────────────────────────────────────────────────
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
let products;

async function connect() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'inventory_manager');
  products = db.collection('products');

  // Unique index on SKU so duplicates are rejected at the DB level
  await products.createIndex({ sku: 1 }, { unique: true });

  console.log('✅ Connected to MongoDB');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function validateProduct(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('name is required');
  if (!body.sku  || !body.sku.trim())  errors.push('sku is required');
  if (!body.category)                  errors.push('category is required');
  if (body.quantity === '' || body.quantity === undefined || isNaN(Number(body.quantity)) || Number(body.quantity) < 0)
    errors.push('quantity must be a non-negative number');
  if (body.price === '' || body.price === undefined || isNaN(Number(body.price)) || Number(body.price) < 0)
    errors.push('price must be a non-negative number');
  return errors;
}

function toId(id) {
  if (!ObjectId.isValid(id)) throw new Error('Invalid product ID');
  return new ObjectId(id);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/products?search=&category=&sort=createdAt&order=desc
app.get('/api/products', async (req, res) => {
  try {
    const { search = '', category = '', sort = 'createdAt', order = 'desc' } = req.query;
    const filter = {};
    if (search)                        filter.name = { $regex: search.trim(), $options: 'i' };
    if (category && category !== 'All') filter.category = category;

    const sortDir = order === 'asc' ? 1 : -1;
    const allowedSorts = ['createdAt', 'name', 'price', 'quantity'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

    const docs = await products
      .find(filter)
      .sort({ [sortField]: sortDir })
      .toArray();

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const doc = await products.findOne({ _id: toId(req.params.id) });
    if (!doc) return res.status(404).json({ message: 'Product not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length) return res.status(422).json({ message: errors.join('; ') });

    const doc = {
      name:      req.body.name.trim(),
      sku:       req.body.sku.trim().toUpperCase(),
      category:  req.body.category,
      quantity:  Number(req.body.quantity),
      price:     Number(Number(req.body.price).toFixed(2)),
      notes:     (req.body.notes || '').trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await products.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    // MongoDB duplicate key error code
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A product with that SKU already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length) return res.status(422).json({ message: errors.join('; ') });

    const updates = {
      name:      req.body.name.trim(),
      sku:       req.body.sku.trim().toUpperCase(),
      category:  req.body.category,
      quantity:  Number(req.body.quantity),
      price:     Number(Number(req.body.price).toFixed(2)),
      notes:     (req.body.notes || '').trim(),
      updatedAt: new Date(),
    };

    const result = await products.findOneAndUpdate(
      { _id: toId(req.params.id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ message: 'Product not found' });
    res.json(result);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A product with that SKU already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await products.deleteOne({ _id: toId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Product not found' });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/stats  (dashboard aggregate)
app.get('/api/stats', async (req, res) => {
  try {
    const [agg] = await products.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits:    { $sum: '$quantity' },
          totalValue:    { $sum: { $multiply: ['$quantity', '$price'] } },
          lowStock:      { $sum: { $cond: [{ $lte: ['$quantity', 10] }, 1, 0] } },
        },
      },
    ]).toArray();

    res.json(agg || { totalProducts: 0, totalUnits: 0, totalValue: 0, lowStock: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connect()
  .then(() => app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`)))
  .catch(err => { console.error('❌ MongoDB connection failed:', err.message); process.exit(1); });
