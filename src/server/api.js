"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const threads_1 = require("../utils/threads");
const generate_court_doc_1 = require("../generate-court-doc");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Enable CORS for frontend requests
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../../client/build')));
// API endpoints
// Get list of available JSON exports
app.get('/api/exports', async (req, res) => {
    try {
        const exportDir = path_1.default.join(__dirname, '../../exports');
        const files = await fs_extra_1.default.readdir(exportDir);
        const jsonFiles = files
            .filter(file => file.endsWith('.json'))
            .map(file => ({
            filename: file,
            path: path_1.default.join('exports', file),
            created: fs_extra_1.default.statSync(path_1.default.join(exportDir, file)).birthtime
        }))
            .sort((a, b) => b.created.getTime() - a.created.getTime());
        res.json(jsonFiles);
    }
    catch (error) {
        console.error('Error reading exports directory:', error);
        res.status(500).json({ error: 'Failed to read exports directory' });
    }
});
// Get threads from a specific JSON export
app.get('/api/threads/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(__dirname, '../../exports', filename);
        if (!await fs_extra_1.default.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Read the email data
        const emailData = await fs_extra_1.default.readJSON(filePath);
        // Parse threads
        const threadParser = new threads_1.ThreadParser();
        const threads = threadParser.groupEmailsByThread(emailData);
        // Return thread summaries (without full content to reduce payload size)
        const threadSummaries = threads.map(thread => ({
            threadId: thread.threadId,
            subject: thread.emails[0].subject || '(No subject)',
            participants: thread.participants,
            messageCount: thread.emails.length,
            dateRange: {
                start: thread.dateRange.start,
                end: thread.dateRange.end
            },
            // Include only basic email info for the thread view
            emails: thread.emails.map(email => ({
                id: email.id,
                from: email.from,
                to: email.to,
                subject: email.subject,
                date: email.date,
                snippet: email.snippet
            }))
        }));
        res.json(threadSummaries);
    }
    catch (error) {
        console.error('Error processing threads:', error);
        res.status(500).json({ error: 'Failed to process threads' });
    }
});
// Get a single thread with full content
app.get('/api/thread/:filename/:threadId', async (req, res) => {
    try {
        const { filename, threadId } = req.params;
        const filePath = path_1.default.join(__dirname, '../../exports', filename);
        if (!await fs_extra_1.default.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Read the email data
        const emailData = await fs_extra_1.default.readJSON(filePath);
        // Parse threads
        const threadParser = new threads_1.ThreadParser();
        const threads = threadParser.groupEmailsByThread(emailData);
        // Find the requested thread
        const thread = threads.find(t => t.threadId === threadId);
        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }
        res.json(thread);
    }
    catch (error) {
        console.error('Error retrieving thread:', error);
        res.status(500).json({ error: 'Failed to retrieve thread' });
    }
});
// Generate court document preview (markdown format)
app.post('/api/preview', async (req, res) => {
    try {
        const { filename, selectedThreads } = req.body;
        if (!filename || !selectedThreads || !Array.isArray(selectedThreads)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
        const filePath = path_1.default.join(__dirname, '../../exports', filename);
        if (!await fs_extra_1.default.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Read the email data
        const allEmails = await fs_extra_1.default.readJSON(filePath);
        // Filter only selected threads
        const filteredEmails = allEmails.filter(email => selectedThreads.includes(email.threadId));
        // Save to a temporary JSON file
        const tempJsonPath = path_1.default.join(__dirname, '../../exports', `temp-${Date.now()}.json`);
        await fs_extra_1.default.writeJSON(tempJsonPath, filteredEmails);
        // Generate preview (markdown format)
        const outputPath = await (0, generate_court_doc_1.generateCourtDocument)(tempJsonPath, undefined, 'md');
        // Read the generated markdown
        const markdownContent = await fs_extra_1.default.readFile(outputPath, 'utf8');
        // Clean up temporary files
        await fs_extra_1.default.remove(tempJsonPath);
        res.json({ preview: markdownContent });
    }
    catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});
// Generate final court document (PDF)
app.post('/api/generate', async (req, res) => {
    try {
        const { filename, selectedThreads, outputFormat } = req.body;
        if (!filename || !selectedThreads || !Array.isArray(selectedThreads)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
        const filePath = path_1.default.join(__dirname, '../../exports', filename);
        if (!await fs_extra_1.default.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Read the email data
        const allEmails = await fs_extra_1.default.readJSON(filePath);
        // Filter only selected threads
        const filteredEmails = allEmails.filter(email => selectedThreads.includes(email.threadId));
        // Save to a temporary JSON file
        const tempJsonPath = path_1.default.join(__dirname, '../../exports', `temp-${Date.now()}.json`);
        await fs_extra_1.default.writeJSON(tempJsonPath, filteredEmails);
        // Generate document
        const format = outputFormat === 'pdf' ? 'pdf' : 'md';
        const outputPath = await (0, generate_court_doc_1.generateCourtDocument)(tempJsonPath, undefined, format);
        // Return the path to the generated file
        const relativePath = path_1.default.relative(path_1.default.join(__dirname, '../..'), outputPath);
        // Clean up temporary JSON file
        await fs_extra_1.default.remove(tempJsonPath);
        res.json({
            success: true,
            outputPath: relativePath,
            format
        });
    }
    catch (error) {
        console.error('Error generating document:', error);
        res.status(500).json({ error: 'Failed to generate document' });
    }
});
// Download endpoint for the generated files
app.get('/api/download/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path_1.default.join(__dirname, '../../exports', filename);
    if (!fs_extra_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.download(filePath);
});
// Fallback route - serve the React app
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../client/build/index.html'));
});
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
exports.default = app;
