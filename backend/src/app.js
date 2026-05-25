import express from 'express';
import cors from 'cors';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';


const app = express();
app.use(cors());

app.disable('etag');

app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use('/api/stocks', stockRoutes);

export default app;
