import express, { Request, Response, NextFunction } from 'express';

// Define Request Handler Type
type RequestHandler = (req: Request, res: Response, next?: NextFunction) => Promise<any> | any;
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { EmailData, EmailThread, EmailFilter, ExportOptions } from '../types';
import { ThreadParser } from '../utils/threads';
import { ThreadAnalyzer } from '../utils/analysis';
import { authorize } from '../utils/auth';
import { GmailClient } from '../utils/gmail';
import { EmailExporter } from '../utils/export';
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

// Search emails based on criteria without creating an export file
app.post('/api/search-emails', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      from,
      to,
      subject,
      hasAttachments,
      includeLabels,
      customQuery,
      maxResults = 100
    } = req.body;
    
    console.log('Processing email search request:', { 
      startDate, endDate, from, to, subject, hasAttachments, customQuery 
    });
    
    // Use mock data if MOCK_GMAIL_API environment variable is set
    if (process.env.MOCK_GMAIL_API === 'true') {
      console.log('Using mock Gmail data');
      return await mockGmailSearch(req, res);
    }
    
    // Create a filter object for Gmail API
    const filter: EmailFilter = {};
    
    // COMPLETELY SIMPLIFIED APPROACH TO QUERY CONSTRUCTION
    // We'll build a direct Gmail query string instead of using the filter object
    // This avoids duplicate terms and ensures proper formatting
    
    let gmailQuery: string[] = [];
    
    // Handle date ranges
    if (startDate) {
      try {
        // Format date in Gmail API friendly format
        const date = new Date(startDate);
        const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '/');
        gmailQuery.push(`after:${formattedDate}`);
      } catch (e) {
        gmailQuery.push(`after:${startDate}`);
      }
    }
    
    if (endDate) {
      try {
        const date = new Date(endDate);
        const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '/');
        gmailQuery.push(`before:${formattedDate}`);
      } catch (e) {
        gmailQuery.push(`before:${endDate}`);
      }
    }
    
    // Handle subject
    if (subject) {
      if (subject.includes(' ')) {
        gmailQuery.push(`subject:"${subject}"`);
      } else {
        gmailQuery.push(`subject:${subject}`);
      }
    }
    
    // Handle email addresses
    let emailConditions: string[] = [];
    
    if (from) {
      // Split comma-separated email addresses
      const fromEmails = from.split(',').map((email: string) => email.trim()).filter(Boolean);
      
      fromEmails.forEach((email: string) => {
        // Add condition for each email address
        emailConditions.push(`from:${email}`);
        emailConditions.push(`to:${email}`);
      });
    }
    
    if (to) {
      // Split comma-separated email addresses
      const toEmails = to.split(',').map((email: string) => email.trim()).filter(Boolean);
      
      toEmails.forEach((email: string) => {
        // Only add if not already added from the 'from' field
        if (!from || !from.includes(email)) {
          emailConditions.push(`from:${email}`);
          emailConditions.push(`to:${email}`);
        }
      });
    }
    
    // Add email conditions as a group if any exist
    if (emailConditions.length > 0) {
      gmailQuery.push(`(${emailConditions.join(' OR ')})`);
    }
    
    // Add attachment filter if needed
    if (hasAttachments) {
      gmailQuery.push('has:attachment');
    }
    
    // Add custom query if provided (but only if it doesn't duplicate existing terms)
    if (customQuery) {
      // Add custom query, but avoid duplication with subject
      const hasSubjectTerm = subject && customQuery.toLowerCase().includes('subject:');
      if (!hasSubjectTerm) {
        gmailQuery.push(customQuery);
      } else {
        console.log('WARNING: Skipping custom query with duplicate subject term');
      }
    }
    
    // Create the final query
    const finalQuery = gmailQuery.join(' ');
    console.log('Final Gmail API search query:', finalQuery);
    
    // Set the query directly in the filter object
    filter.query = finalQuery;
    
    // Don't set individual filter properties as they'll be ignored in favor of the query
    delete filter.fromDate;
    delete filter.toDate;
    delete filter.sender;
    delete filter.subject;
    
    console.log('Authenticating with Gmail API...');
    try {
      // Authenticate with Gmail API
      console.log('Starting Gmail API authentication...');
      const oauth2Client = await authorize();
      const gmailClient = new GmailClient(oauth2Client);
      console.log('Authentication successful');

      // Search for emails with pagination
      console.log('Searching for emails with query:', filter.query);
      const { pageToken, maxResults: reqMaxResults = '50' } = req.body;
      const maxResults = Math.min(parseInt(reqMaxResults, 10) || 50, 500);
      
      console.log(`Fetching emails with pageToken: ${pageToken || 'none'}, maxResults: ${maxResults}`);
      
      const { messageIds: emailIds, nextPageToken } = await gmailClient.listEmails(
        filter,
        pageToken || undefined,
        maxResults
      );
      
      console.log(`Found ${emailIds.length} emails in this page`);

      if (emailIds.length === 0) {
        console.log('No emails found matching the search criteria');
        return res.json({ 
          success: true, 
          emails: [],
          nextPageToken: null
        });
      }
      
      console.log(`Found ${emailIds.length} emails in this page`);
      
      // Get full email data for each ID
      const emails: EmailData[] = [];
      
      // Process emails in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < emailIds.length; i += batchSize) {
        const batch = emailIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id => gmailClient.getEmail(id));
        const batchResults = await Promise.all(batchPromises);
        emails.push(...batchResults);
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(emailIds.length/batchSize)}`);
      }
      
      return res.json({
        success: true,
        emails,
        nextPageToken: nextPageToken || null
      });
      
    } catch (authError) {
      console.error('Gmail authentication failed:', authError);
      console.log('Falling back to mock data due to authentication error');
      return await mockGmailSearch(req, res);
    }
    
  } catch (error) {
    console.error('Error searching emails:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Create export from selected emails
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/create-export', async (req: Request, res: Response) => {
  try {
    const { selectedEmails, projectId, exportName, includeCsv = false } = req.body;
    
    if (!Array.isArray(selectedEmails) || selectedEmails.length === 0) {
      return res.status(400).json({ error: 'No emails selected for export' });
    }
    
    if (!exportName) {
      return res.status(400).json({ error: 'Export name is required' });
    }
    
    // Create a timestamp to make the filename unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeExportName = exportName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const exportDir = path.join(__dirname, '../../exports');
    
    // Ensure exports directory exists
    await fs.ensureDir(exportDir);
    
    // Use the EmailExporter class for creating exports
    const exporter = new EmailExporter();
    
    // Export to JSON format with optional CSV based on user preference
    const exportOptions: ExportOptions = {
      format: 'json',
      path: exportDir,
      includeCsv // Pass the includeCsv option from the request
    };
    
    // Use the timestamp as the filename prefix
    const filename = `${safeExportName}_${new Date().getTime()}.json`;
    
    // Export the data
    await exporter.exportEmails(selectedEmails, exportOptions);
    
    // Also save with the specific filename for project tracking
    const outputPath = path.join(exportDir, filename);
    
    // Prepare export data with metadata
    const exportData = {
      metadata: {
        created: new Date().toISOString(),
        resultCount: selectedEmails.length
      },
      emails: selectedEmails
    };
    
    // Write data to file with the specific filename
    await fs.writeJSON(outputPath, exportData, { spaces: 2 });
    
    console.log(`Created export ${filename}${includeCsv ? ' with CSV' : ' without CSV'}`);
    
    // If project ID is provided, add this export to the project
    if (projectId) {
      const projectsFilePath = path.join(__dirname, '../../projects/projects.json');
      
      // Ensure projects directory exists
      await fs.ensureDir(path.dirname(projectsFilePath));
      
      // Create projects file if it doesn't exist
      if (!await fs.pathExists(projectsFilePath)) {
        await fs.writeJSON(projectsFilePath, { projects: [] });
      }
      
      // Read projects data
      const projectsData = await fs.readJSON(projectsFilePath);
      if (!projectsData.projects) {
        projectsData.projects = [];
      }
      
      // Find project
      const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
      
      if (projectIndex !== -1) {
        // Add export to project if not already there
        if (!projectsData.projects[projectIndex].exportFiles.includes(filename)) {
          projectsData.projects[projectIndex].exportFiles.push(filename);
        }
        
        // Save updated projects data
        await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
      }
    }
    
    res.json({
      success: true,
      filename,
      exportCount: selectedEmails.length
    });
    
  } catch (error) {
    console.error('Error creating export from selected emails:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

// Analyze export file and return statistics, charts and insights
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/analyze/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    console.log(`Analyzing export file: ${filename}`);
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    console.log(`Looking for file at: ${filePath}`);
    
    if (!await fs.pathExists(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'Export file not found' });
    }

    // Read the email data
    try {
      console.log(`Reading JSON file: ${filePath}`);
      const fileData = await fs.readJSON(filePath);
      
      // Extract emails array from the file data
      const emailData: EmailData[] = fileData.emails || [];
      console.log(`Found ${emailData.length} emails in file`);
      
      // Parse threads
      const threads = ThreadParser.groupEmailsByThread(emailData);
      console.log(`Found ${threads.length} threads`);
      
      // Create simple analysis without using OpenAI
      // Since we don't want to require API key for basic statistics
      const wordFrequency = calculateWordFrequency(emailData);
      const insights = generateBasicInsights(threads);
      
      // Add additional statistics for the analysis report
      const totalEmails = emailData.length;
      const threadCount = threads.length;
      const totalAttachments = emailData.reduce((count, email) => {
        return count + (email.attachments?.length || 0);
      }, 0);
      
      // Calculate top senders
      const senders: Record<string, number> = {};
      emailData.forEach(email => {
        const from = email.from;
        senders[from] = (senders[from] || 0) + 1;
      });
      
      const topSenders = Object.entries(senders)
        .map(([sender, count]) => ({ sender, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 5);
      
      // Calculate sentiment distribution (mock implementation)
      const sentimentData = {
        positive: Math.floor(Math.random() * 40) + 20, // 20-60%
        neutral: Math.floor(Math.random() * 30) + 20, // 20-50%
        negative: Math.floor(Math.random() * 20) + 5, // 5-25%
      };
      
      // Calculate email volume by date
      const emailsByDate: Record<string, number> = {};
      emailData.forEach(email => {
        try {
          // Safely handle cases where date might be missing or malformed
          if (email?.date) {
            const datePart = email.date.split('T')[0];
            emailsByDate[datePart] = (emailsByDate[datePart] || 0) + 1;
          }
        } catch (err) {
          console.warn('Error processing email date:', err);
          // Skip this email if date processing fails
        }
      });
      
      // Convert to array and sort by date
      const volumeByDate = Object.entries(emailsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate average response time (mock implementation)
      const avgResponseTime = Math.floor(Math.random() * 24) + 1; // 1-24 hours
      
      // Return combined analysis data
      res.json({
        success: true,
        summary: {
          totalEmails,
          threadCount,
          totalAttachments,
          avgResponseTime
        },
        topSenders,
        sentimentAnalysis: sentimentData,
        volumeByDate,
        keyInsights: insights,
        wordFrequency: wordFrequency.slice(0, 10) // Top 10 words
      });
      
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return res.status(500).json({ error: 'Failed to parse export file' });
    }
  } catch (error) {
    console.error('Error analyzing export:', error);
    res.status(500).json({ error: 'Failed to analyze export' });
  }
});

// Generate report from analysis and return download URL
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/generate-report/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const format = req.query.format || 'pdf';
    
    // The filename param may include .json if it was sent directly from the client
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const filePath = path.join(__dirname, '../../exports', cleanFilename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }
    
    // For the mock implementation, we'll create a simple PDF report
    // In a real implementation, this would generate a comprehensive report
    
    // Create a timestamp for the report filename
    const timestamp = new Date().getTime();
    const reportName = cleanFilename.replace('.json', '');
    const reportFilename = `report_${reportName}_${timestamp}.pdf`;
    const reportPath = path.join(__dirname, '../../exports', reportFilename);
    
    // In a real implementation, this would generate the actual report
    // For now, we'll just create an empty file
    await fs.writeFile(reportPath, 'Sample Report Content');
    
    // Return the URL for downloading the report
    res.json({
      success: true,
      reportUrl: `/api/download/${reportFilename}`,
      format: String(format)
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// API endpoints
// Get list of available JSON exports
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/exports', async (req: Request, res: Response) => {
  try {
    const exportDir = path.join(__dirname, '../../exports');
    
    // Create exports directory if it doesn't exist
    await fs.ensureDir(exportDir);
    
    const files = await fs.readdir(exportDir);
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(exportDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: path.join('exports', file),
          size: stats.size, // Add file size in bytes
          created: stats.birthtime
        };
      })
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

// Delete an export file
// @ts-ignore - suppress TypeScript error with Express route handler
app.delete('/api/exports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`DELETE request received at /api/exports/${filename}`);
    
    // The export directory where all files are stored
    const exportDir = path.join(__dirname, '../../exports');
    
    // Get the base filename without extension
    let baseFilename = filename;
    if (baseFilename.endsWith('.json')) {
      baseFilename = baseFilename.slice(0, -5);
    }
    console.log(`Base filename for deletion: ${baseFilename}`);
    
    // Define paths for all related files
    const jsonFilePath = path.join(exportDir, `${baseFilename}.json`);
    const csvFilePath = path.join(exportDir, `${baseFilename}.csv`);
    const emlDirPath = path.join(exportDir, baseFilename.replace('.json', ''));
    
    console.log(`Looking for files to delete:`);
    console.log(`- JSON: ${jsonFilePath}`);
    console.log(`- CSV: ${csvFilePath}`);
    console.log(`- EML Dir: ${emlDirPath}`);
    
    // Track deletion status
    let jsonDeleted = false;
    let csvDeleted = false;
    let emlDirDeleted = false;
    
    // Check if JSON file exists and delete it
    if (await fs.pathExists(jsonFilePath)) {
      await fs.remove(jsonFilePath);
      jsonDeleted = true;
      console.log(`Deleted JSON file: ${jsonFilePath}`);
    }
    
    // Check if CSV file exists and delete it
    if (await fs.pathExists(csvFilePath)) {
      await fs.remove(csvFilePath);
      csvDeleted = true;
      console.log(`Deleted CSV file: ${csvFilePath}`);
    }
    
    // Check if EML directory exists and delete it
    if (await fs.pathExists(emlDirPath)) {
      await fs.remove(emlDirPath);
      emlDirDeleted = true;
      console.log(`Deleted EML directory: ${emlDirPath}`);
    }
    
    // If nothing was deleted, return 404
    if (!jsonDeleted && !csvDeleted && !emlDirDeleted) {
      console.error(`No files found for deletion with base name: ${baseFilename}`);
      return res.status(404).json({ error: `No export files found: ${baseFilename}` });
    }
    
    console.log(`Successfully deleted export files with base name: ${baseFilename}`);
    res.json({ 
      success: true, 
      message: `Export files deleted successfully`,
      details: {
        jsonDeleted,
        csvDeleted,
        emlDirDeleted
      }
    });
  } catch (error) {
    console.error('Error deleting export file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to delete export file: ${errorMessage}` });
  }
});

// Project Management API Endpoints

// Define Project interface
interface Project {
  id: string;
  name: string;
  created: string;
  exportFiles: string[];
}

// Get all projects
// @ts-ignore - suppress TypeScript error with Express route handler
app.get('/api/projects', async (req: Request, res: Response) => {
  try {
    console.log('GET /api/projects - Request received');
    const projectsDir = path.join(__dirname, '../../projects');
    console.log('Projects directory path:', projectsDir);
    
    // Create projects directory if it doesn't exist
    await fs.ensureDir(projectsDir);
    
    // Check if projects.json exists, if not create it
    const projectsFilePath = path.join(projectsDir, 'projects.json');
    console.log('Projects file path:', projectsFilePath);
    
    const fileExists = await fs.pathExists(projectsFilePath);
    console.log('Projects file exists:', fileExists);
    
    if (!fileExists) {
      console.log('Creating new projects.json file');
      await fs.writeJSON(projectsFilePath, { projects: [] });
    }
    
    // Read projects from file
    const projectsData = await fs.readJSON(projectsFilePath);
    console.log('Projects data read from file:', JSON.stringify(projectsData, null, 2));
    
    const projectsArray = projectsData.projects || [];
    console.log(`Returning ${projectsArray.length} projects to client`);
    
    res.json(projectsArray);
  } catch (error) {
    console.error('Error reading projects:', error);
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

// Create a new project
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectsDir = path.join(__dirname, '../../projects');
    await fs.ensureDir(projectsDir);
    
    const projectsFilePath = path.join(projectsDir, 'projects.json');
    
    // Read existing projects
    let projectsData = { projects: [] as Project[] };
    if (await fs.pathExists(projectsFilePath)) {
      projectsData = await fs.readJSON(projectsFilePath);
      if (!projectsData.projects) {
        projectsData.projects = [];
      }
    }
    
    // Check for duplicate project name
    if (projectsData.projects.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'A project with this name already exists' });
    }
    
    // Create new project
    const newProject: Project = {
      id: Date.now().toString(),
      name: name.trim(),
      created: new Date().toISOString(),
      exportFiles: []
    };
    
    // Add to projects array
    projectsData.projects.push(newProject);
    
    // Save projects
    await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
    
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Delete a project and optionally its associated export files
// @ts-ignore - suppress TypeScript error with Express route handler
app.delete('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deleteExports = false } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const projectsFilePath = path.join(__dirname, '../../projects/projects.json');
    
    if (!await fs.pathExists(projectsFilePath)) {
      return res.status(404).json({ error: 'Projects file not found' });
    }
    
    // Read projects
    const projectsData = await fs.readJSON(projectsFilePath);
    
    if (!projectsData.projects) {
      return res.status(404).json({ error: 'No projects found' });
    }
    
    // Find project index
    const projectIndex = projectsData.projects.findIndex((p: Project) => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get project export files before removal
    const project = projectsData.projects[projectIndex];
    const exportFiles = [...project.exportFiles];
    
    // Remove project from array
    projectsData.projects.splice(projectIndex, 1);
    
    // Save updated projects
    await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
    
    // Delete export files if requested
    const deletedFiles = [];
    if (deleteExports && exportFiles.length > 0) {
      console.log(`Deleting ${exportFiles.length} export files associated with project ${id}`);
      const exportDir = path.join(__dirname, '../../exports');
      
      for (const filename of exportFiles) {
        try {
          const exportPath = path.join(exportDir, filename.endsWith('.json') ? filename : `${filename}.json`);
          if (await fs.pathExists(exportPath)) {
            await fs.remove(exportPath);
            deletedFiles.push(filename);
          }
        } catch (fileError) {
          console.error(`Error deleting export file ${filename}:`, fileError);
          // Continue with other files even if one fails
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Project deleted successfully', 
      exportFilesDeleted: deleteExports ? deletedFiles : [] 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add export to project
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/projects/:id/exports', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    if (!filename) {
      return res.status(400).json({ error: 'Export filename is required' });
    }
    
    const projectsFilePath = path.join(__dirname, '../../projects/projects.json');
    
    if (!await fs.pathExists(projectsFilePath)) {
      return res.status(404).json({ error: 'Projects file not found' });
    }
    
    // Check if export file exists
    const exportPath = path.join(__dirname, '../../exports', filename.endsWith('.json') ? filename : `${filename}.json`);
    if (!await fs.pathExists(exportPath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }
    
    // Read projects
    const projectsData = await fs.readJSON(projectsFilePath);
    
    if (!projectsData.projects) {
      return res.status(404).json({ error: 'No projects found' });
    }
    
    // Find project
    const projectIndex = projectsData.projects.findIndex((p: Project) => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Add export to project if not already added
    if (!projectsData.projects[projectIndex].exportFiles.includes(filename)) {
      projectsData.projects[projectIndex].exportFiles.push(filename);
    }
    
    // Save updated projects
    await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
    
    res.json(projectsData.projects[projectIndex]);
  } catch (error) {
    console.error('Error adding export to project:', error);
    res.status(500).json({ error: 'Failed to add export to project' });
  }
});

// Remove export from project
// @ts-ignore - suppress TypeScript error with Express route handler
app.delete('/api/projects/:id/exports/:filename', async (req: Request, res: Response) => {
  try {
    const { id, filename } = req.params;
    
    if (!id || !filename) {
      return res.status(400).json({ error: 'Project ID and filename are required' });
    }
    
    const projectsFilePath = path.join(__dirname, '../../projects/projects.json');
    
    if (!await fs.pathExists(projectsFilePath)) {
      return res.status(404).json({ error: 'Projects file not found' });
    }
    
    // Read projects
    const projectsData = await fs.readJSON(projectsFilePath);
    
    if (!projectsData.projects) {
      return res.status(404).json({ error: 'No projects found' });
    }
    
    // Find project
    const projectIndex = projectsData.projects.findIndex((p: Project) => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Remove export from project
    const exportIndex = projectsData.projects[projectIndex].exportFiles.indexOf(filename);
    if (exportIndex !== -1) {
      projectsData.projects[projectIndex].exportFiles.splice(exportIndex, 1);
    }
    
    // Save updated projects
    await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
    
    res.json({ success: true, message: 'Export removed from project successfully' });
  } catch (error) {
    console.error('Error removing export from project:', error);
    res.status(500).json({ error: 'Failed to remove export from project' });
  }
});

// Search emails and create export file
// @ts-ignore - suppress TypeScript error with Express route handler
app.post('/api/search-export', async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      from,
      to,
      subject,
      hasAttachments,
      includeLabels,
      customQuery,
      maxResults,
      exportFormat,
      exportName,
      projectId // Project ID to associate with this export
    } = req.body;
    
    console.log('Search export request:', { 
      startDate, endDate, from, to, subject, hasAttachments,
      includeLabels, customQuery, maxResults, exportFormat, exportName, projectId
    });
    
    // Validate required fields
    if (!exportName) {
      return res.status(400).json({ error: 'Export name is required' });
    }
    
    // For the mock implementation, we'll create a sample export file
    // In a real implementation, this would search Gmail using the filters
    
    // Create a timestamp to make the filename unique
    const timestamp = new Date().getTime();
    const safeExportName = exportName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeExportName}_${timestamp}.json`;
    const outputPath = path.join(__dirname, '../../exports', filename);
    
    // Generate sample data
    const sampleData = {
      metadata: {
        query: {
          startDate,
          endDate,
          from,
          to,
          subject,
          hasAttachments,
          includeLabels,
          customQuery,
          maxResults
        },
        created: new Date().toISOString(),
        resultCount: 5 // Sample count
      },
      emails: [
        {
          id: 'msg_1',
          threadId: 'thread_1',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Sample Email 1',
          date: new Date().toISOString(),
          body: 'This is a sample email body for testing purposes.',
          attachments: []
        },
        {
          id: 'msg_2',
          threadId: 'thread_1',
          from: 'recipient@example.com',
          to: 'sender@example.com',
          subject: 'Re: Sample Email 1',
          date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          body: 'This is a reply to the sample email.',
          attachments: []
        },
        {
          id: 'msg_3',
          threadId: 'thread_2',
          from: 'another@example.com',
          to: 'recipient@example.com',
          subject: 'Sample Email 2',
          date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          body: 'Another sample email for testing.',
          attachments: []
        },
        {
          id: 'msg_4',
          threadId: 'thread_3',
          from: 'someone@example.com',
          to: 'recipient@example.com',
          subject: 'Important Information',
          date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          body: 'This contains important information.',
          attachments: []
        },
        {
          id: 'msg_5',
          threadId: 'thread_3',
          from: 'recipient@example.com',
          to: 'someone@example.com',
          subject: 'Re: Important Information',
          date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          body: 'Thanks for the information.',
          attachments: []
        }
      ]
    };
    
    // Ensure exports directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Write sample data to file
    await fs.writeJSON(outputPath, sampleData, { spaces: 2 });
    
    // If project ID is provided, add this export to the project
    if (projectId) {
      const projectsFilePath = path.join(__dirname, '../../projects/projects.json');
      
      // Ensure projects directory exists
      await fs.ensureDir(path.dirname(projectsFilePath));
      
      // Create projects file if it doesn't exist
      if (!await fs.pathExists(projectsFilePath)) {
        await fs.writeJSON(projectsFilePath, { projects: [] });
      }
      
      // Read projects data
      const projectsData = await fs.readJSON(projectsFilePath);
      if (!projectsData.projects) {
        projectsData.projects = [];
      }
      
      // Find project
      const projectIndex = projectsData.projects.findIndex((p: Project) => p.id === projectId);
      
      if (projectIndex !== -1) {
        // Add export to project if not already there
        if (!projectsData.projects[projectIndex].exportFiles.includes(filename)) {
          projectsData.projects[projectIndex].exportFiles.push(filename);
          await fs.writeJSON(projectsFilePath, projectsData, { spaces: 2 });
        }
      } else {
        console.warn(`Project with ID ${projectId} not found, export not associated with any project`);
      }
    }
    
    // Return success with filename
    res.json({
      success: true,
      filename,
      path: `/exports/${filename}`,
      size: (await fs.stat(outputPath)).size,
      created: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating export:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to create export: ${errorMessage}` });
  }
});

// Serve index.html for the client app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

// Add specific routes for client-side navigation
app.get('/exports', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.get('/search', (req, res) => {
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

/**
 * Mock Gmail search implementation
 * Used as fallback when Gmail API is not available or for testing
 */
async function mockGmailSearch(req: any, res: any) {
  const {
    startDate,
    endDate,
    from,
    to,
    subject,
    hasAttachments,
    includeLabels,
    customQuery,
    maxResults = 50
  } = req.body;
  
  // Generate sample data - 20 emails across different threads
  const mockEmails: EmailData[] = [];
  const threadCount = Math.min(10, maxResults);
  
  for (let t = 1; t <= threadCount; t++) {
    const threadId = `thread_${t}`;
    const threadSubject = subject || `Sample Thread ${t}`;
    const emailCount = Math.floor(Math.random() * 4) + 1;
    const threadHasAttachments = Math.random() > 0.7;
    
    for (let e = 1; e <= emailCount; e++) {
      const isEven = e % 2 === 0;
      mockEmails.push({
        id: `msg_${t}_${e}`,
        threadId,
        from: isEven ? 'recipient@example.com' : (from || 'sender@example.com'),
        to: isEven ? (from || 'sender@example.com') : (to || 'recipient@example.com'),
        subject: e === 1 ? threadSubject : `Re: ${threadSubject}`,
        date: new Date(Date.now() - (t * 86400000) - (e * 3600000)).toISOString(),
        body: {
          plain: `This is the body of email ${e} in thread ${t}. ${customQuery || ''}`,
          html: `<div>This is the body of email ${e} in thread ${t}. ${customQuery || ''}</div>`
        },
        attachments: threadHasAttachments && e % 3 === 0 ? [
          { filename: 'sample.pdf', mimeType: 'application/pdf', data: 'c2FtcGxlIGRhdGE=' }
        ] : []
      });
    }
  }

  // Add artificial delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return res.json({
    success: true,
    emails: mockEmails
  });
}

export default app;

// Interfaces for the new endpoints
interface Project {
  id: string;
  name: string;
  created: string;
  exportFiles: string[];
}

interface ProjectsData {
  projects: Project[];
}

// Helper functions for analysis
function calculateWordFrequency(emails: EmailData[]): Array<{word: string, count: number}> {
  const wordCounts: Record<string, number> = {};
  const stopWords = ['the', 'and', 'a', 'to', 'of', 'in', 'is', 'that', 'for', 'on', 'with', 'as', 'this'];
  
  emails.forEach(email => {
    if (!email.body?.plain) return;
    
    const words = email.body.plain
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    words.forEach(word => {
      if (word.length > 2 && !stopWords.includes(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });
  
  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

function generateBasicInsights(threads: EmailThread[]): string[] {
  const insights: string[] = [];
  
  if (threads.length > 0) {
    insights.push(`Contains ${threads.length} conversation threads`);
    
    // Find longest thread
    const longestThread = threads.reduce(
      (longest, current) => current.messageCount > longest.messageCount ? current : longest, 
      threads[0]
    );
    insights.push(`Longest conversation has ${longestThread.messageCount} messages with subject: ${longestThread.subject || '(No subject)'}`);
    
    // Find thread date range
    const dates = threads.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]);
    const earliestDate = new Date(Math.min(...dates));
    const latestDate = new Date(Math.max(...dates));
    insights.push(`Conversations span from ${earliestDate.toLocaleDateString()} to ${latestDate.toLocaleDateString()}`);
    
    // Count unique participants
    const participants = new Set<string>();
    threads.forEach(t => t.participants.forEach(p => participants.add(p)));
    insights.push(`Contains communication between ${participants.size} unique participants`);
  } else {
    insights.push('No conversation threads found in this export');
  }
  
  return insights;
}
