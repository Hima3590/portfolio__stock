import express from 'express';
import cors from 'cors';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';


const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allows localhost development OR any subfolder/app hosted on Render
    if (
      !origin || 
      /^http:\/\/localhost:\d+$/.test(origin) || 
      /\.onrender\.com$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.disable('etag');

app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use('/api/stocks', stockRoutes);

export default app;
