import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json());

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  category: { type: String, required: true, enum: ['Electronics', 'Furniture', 'Office', 'Accessories', 'Clothing', 'Food & Beverage'] },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true });

productSchema.index({ sku: 1 }, { unique: true });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

app.get('/api/products', async (req, res, next) => {
  try {
    const { search = '', category = 'All', sort = 'createdAt', order = 'desc' } = req.query;
    const filter = {};
    if (search.trim()) filter.$or = ['name', 'sku', 'notes'].map(field => ({ [field]: { $regex: search.trim(), $options: 'i' } }));
    if (category !== 'All') filter.category = category;
    const allowed = ['name', 'sku', 'quantity', 'price', 'createdAt'];
    const field = allowed.includes(sort) ? sort : 'createdAt';
    const products = await Product.find(filter).sort({ [field]: order === 'asc' ? 1 : -1 });
    res.json(products);
  } catch (error) { next(error); }
});

app.get('/api/stats', async (req, res, next) => {
  try {
    const [stats] = await Product.aggregate([
      { $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalUnits: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
        lowStock: { $sum: { $cond: [{ $lte: ['$quantity', 10] }, 1, 0] } },
      } },
    ]);
    res.json(stats || { totalProducts: 0, totalUnits: 0, totalValue: 0, lowStock: 0 });
  } catch (error) { next(error); }
});

app.post('/api/products', async (req, res, next) => {
  try { res.status(201).json(await Product.create(req.body)); }
  catch (error) { next(error); }
});

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) { next(error); }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.use((error, req, res, next) => {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid product ID' });
  if (error.name === 'ValidationError') return res.status(422).json({ message: Object.values(error.errors).map(e => e.message).join('; ') });
  if (error.code === 11000) return res.status(409).json({ message: 'A product with that SKU already exists' });
  console.error(error);
  res.status(500).json({ message: 'An unexpected server error occurred' });
});

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function start() {
  app.listen(port, () => console.log(`Inventory app running on port ${port}`));

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
    }
  } else {
    console.warn('MONGO_URI is not set. Configure it in Render for persistent storage.');
  }
}

start();
