import dotenv from 'dotenv';
import app from './server/api';

// Load environment variables
dotenv.config();

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
