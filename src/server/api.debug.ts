import express, { Request, Response, NextFunction } from 'express';

// Define Request Handler Type
type RequestHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any> | any;
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { EmailData, EmailThread } from '../types';
import { ThreadParser } from '../utils/threads';
import { ThreadAnalyzer } from '../utils/analysis';
import { generateCourtDocument } from '../generate-court-doc';

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../../client/build')));

// API endpoints
// Get list of available JSON exports
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/exports', async (req: Request, res: Response) => {
  try {
    const exportDir = path.join(__dirname, '../../exports');
    const files = await fs.readdir(exportDir);
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        filename: file,
        path: path.join('exports', file),
        created: fs.statSync(path.join(exportDir, file)).birthtime
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json(jsonFiles);
  } catch (error) {
    console.error('Error reading exports directory:', error);
    res.status(500).json({ error: 'Failed to read exports directory' });
  }
});

// Get threads from a specific JSON export
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/threads/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    console.log(`Processing request for filename: '${filename}'`);
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    console.log(`Looking for file at: ${filePath}`);
    
    if (!await fs.pathExists(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the email data
    try {
      console.log(`Reading JSON file: ${filePath}`);
      const fileData = await fs.readJSON(filePath);
      console.log(`File data type: ${typeof fileData}`);
      
      // Extract emails array from the file data
      // Export files have structure { count, exported_at, emails[] }
      const emailData: EmailData[] = fileData.emails || [];
      
      console.log(`Found ${emailData.length} emails in file`);
      
      // Parse threads
      console.log('Parsing threads...');
      const threads = ThreadParser.groupEmailsByThread(emailData);
      console.log(`Found ${threads.length} threads`);
      
      // Return thread summaries (without full content to reduce payload size)
      const threadSummaries = threads.map((thread: EmailThread) => ({
        threadId: thread.threadId,
        subject: thread.subject || '(No subject)',
        participants: thread.participants,
        messageCount: thread.messageCount,
        dateRange: {
          start: thread.startDate,
          end: thread.endDate
        },
        // Include only basic email info for the thread view
        emails: thread.messages.map((email: EmailData) => ({
          id: email.id,
          from: email.from,
          to: email.to,
          subject: email.subject,
          date: email.date,
          preview: email.body?.plain ? email.body.plain.substring(0, 100) + '...' : '(No content)'
        }))
      }));

      console.log(`Sending response with ${threadSummaries.length} thread summaries`);
      res.json(threadSummaries);
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return res.status(500).json({ error: 'Failed to parse JSON file' });
    }
  } catch (error) {
    console.error('Error processing threads:', error);
    res.status(500).json({ error: 'Failed to process threads' });
  }
});

// Get a single thread with full content
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/threads/:filename/thread/:threadId', async (req, res) => {
  try {
    const { filename, threadId } = req.params;
    console.log(`Thread detail request - Filename: ${filename}, ThreadId: ${threadId}`);
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    console.log(`Looking for file at: ${filePath}`);
    
    if (!await fs.pathExists(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the email data
    try {
      const fileData = await fs.readJSON(filePath);
      
      // Extract emails array from the file data
      const emailData: EmailData[] = fileData.emails || [];
      
      // Parse threads
      const threads = ThreadParser.groupEmailsByThread(emailData);
      
      // Find the requested thread
      const thread = threads.find(t => t.threadId === threadId);
      
      if (!thread) {
        console.error(`Thread not found: ${threadId}`);
        return res.status(404).json({ error: 'Thread not found' });
      }

      console.log(`Found thread with ${thread.messages.length} messages`);
      res.json(thread);
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return res.status(500).json({ error: 'Failed to parse JSON file' });
    }
  } catch (error) {
    console.error('Error retrieving thread:', error);
    res.status(500).json({ error: 'Failed to retrieve thread' });
  }
});

// Generate court document preview (markdown format)
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/preview', async (req, res) => {
  try {
    const { filename, selectedThreads } = req.body;
    
    if (!filename || !selectedThreads || !Array.isArray(selectedThreads)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the email data
    const fileData = await fs.readJSON(filePath);
    const allEmails: EmailData[] = fileData.emails || [];
    
    // Filter only selected threads
    const filteredEmails = allEmails.filter(email => 
      selectedThreads.includes(email.threadId)
    );
    
    // Save to a temporary JSON file
    const tempJsonPath = path.join(__dirname, '../../exports', `temp-${Date.now()}.json`);
    await fs.writeJSON(tempJsonPath, { emails: filteredEmails });
    
    // Generate preview (markdown format)
    const outputPath = await generateCourtDocument(tempJsonPath, undefined, 'md');
    
    // Read the generated markdown
    const markdownContent = await fs.readFile(outputPath, 'utf8');
    
    // Clean up temporary files
    await fs.remove(tempJsonPath);
    
    res.json({ preview: markdownContent });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Generate final court document (PDF)
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/generate', async (req, res) => {
  try {
    const { filename, selectedThreads, outputFormat } = req.body;
    
    if (!filename || !selectedThreads || !Array.isArray(selectedThreads)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the email data
    const fileData = await fs.readJSON(filePath);
    const allEmails: EmailData[] = fileData.emails || [];
    
    // Filter only selected threads
    const filteredEmails = allEmails.filter(email => 
      selectedThreads.includes(email.threadId)
    );
    
    // Save to a temporary JSON file
    const tempJsonPath = path.join(__dirname, '../../exports', `temp-${Date.now()}.json`);
    await fs.writeJSON(tempJsonPath, { emails: filteredEmails });
    
    // Generate document
    const format = outputFormat === 'pdf' ? 'pdf' : 'md';
    const outputPath = await generateCourtDocument(tempJsonPath, undefined, format);
    
    // Return the path to the generated file
    const relativePath = path.relative(path.join(__dirname, '../..'), outputPath);
    
    // Clean up temporary JSON file
    await fs.remove(tempJsonPath);
    
    res.json({ 
      success: true, 
      outputPath: relativePath,
      format
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// Download endpoint for the generated files
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../exports', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Serve index.html for the client app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

// Add specific routes for client-side navigation
app.get('/export', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.get('/threads', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.get('/threads/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.get('/preview', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
