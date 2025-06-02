const express = require('express');
const app = express();
const port = 3002;

// Test each route pattern separately
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

// This is the problematic fallback route, commented out for testing
// app.get('/*', (req, res) => {
//   res.json({ message: 'Fallback route' });
// });

// This one is simpler
app.get('/', (req, res) => {
  res.json({ message: 'Root route' });
});

// Start the server
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});
