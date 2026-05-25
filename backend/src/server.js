import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
//first connect to database then start the server by listening to the port
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
  }
};

startServer();
