import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// API endpoints
app.get('/api/exports', (req, res) => {
  res.json({ message: 'Exports endpoint' });
});

app.get('/api/threads/:filename', (req, res) => {
  res.json({ message: 'Threads endpoint', filename: req.params.filename });
});

app.get('/api/threads/:filename/thread/:threadId', (req, res) => {
  res.json({ 
    message: 'Thread detail endpoint', 
    filename: req.params.filename,
    threadId: req.params.threadId 
  });
});

app.post('/api/preview', (req, res) => {
  res.json({ message: 'Preview endpoint' });
});

app.post('/api/generate', (req, res) => {
  res.json({ message: 'Generate endpoint' });
});

app.get('/api/download/:filename', (req, res) => {
  res.json({ message: 'Download endpoint', filename: req.params.filename });
});

// Fallback route
app.get('/', (req, res) => {
  res.json({ message: 'API server is running' });
});

// Start the server
app.listen(port, () => {
  console.log(`Test API server running on port ${port}`);
});
