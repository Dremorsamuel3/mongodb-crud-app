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

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  author: { type: String, required: true, trim: true, maxlength: 100 },
  isbn: { type: String, required: true, trim: true, uppercase: true, maxlength: 17 },
  genre: { type: String, required: true, enum: ['Fiction', 'Nonfiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Biography', 'History', 'Other'] },
  copies: { type: Number, required: true, min: 0, max: 10000 },
  publishedYear: { type: Number, min: 1000, max: new Date().getFullYear() },
  description: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

bookSchema.index({ isbn: 1 }, { unique: true });
const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);

app.get('/api/books', async (req, res, next) => {
  try {
    const { search = '', genre = 'All', sort = 'createdAt', order = 'desc' } = req.query;
    const filter = {};
    if (search.trim()) filter.$or = ['title', 'author', 'isbn'].map(field => ({ [field]: { $regex: search.trim(), $options: 'i' } }));
    if (genre !== 'All') filter.genre = genre;
    const allowed = ['title', 'author', 'copies', 'publishedYear', 'createdAt'];
    const field = allowed.includes(sort) ? sort : 'createdAt';
    const books = await Book.find(filter).sort({ [field]: order === 'asc' ? 1 : -1 });
    res.json(books);
  } catch (error) { next(error); }
});

app.get('/api/books/:id', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
});

app.post('/api/books', async (req, res, next) => {
  try { res.status(201).json(await Book.create(req.body)); }
  catch (error) { next(error); }
});

app.put('/api/books/:id', async (req, res, next) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) { next(error); }
});

app.delete('/api/books/:id', async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/api/stats', async (req, res, next) => {
  try {
    const stats = await Book.aggregate([
      { $group: { _id: null, totalBooks: { $sum: 1 }, totalCopies: { $sum: '$copies' }, lowStock: { $sum: { $cond: [{ $lte: ['$copies', 3] }, 1, 0] } } } }
    ]);
    res.json(stats[0] || { totalBooks: 0, totalCopies: 0, lowStock: 0 });
  } catch (error) { next(error); }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));
}

app.use((error, req, res, next) => {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid book ID' });
  if (error.name === 'ValidationError') return res.status(422).json({ message: Object.values(error.errors).map(e => e.message).join('; ') });
  if (error.code === 11000) return res.status(409).json({ message: 'A book with that ISBN already exists' });
  console.error(error);
  res.status(500).json({ message: 'An unexpected server error occurred' });
});

const port = process.env.PORT || 5000;
async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library_inventory');
  app.listen(port, () => console.log(`Library API running at http://localhost:${port}`));
}
start().catch(error => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
