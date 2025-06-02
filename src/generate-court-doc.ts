import * as fs from 'fs-extra';
import * as path from 'path';
import { EmailData, EmailThread, ThreadAnalysisResult } from './types';
import { ThreadParser } from './utils/threads';
import { ThreadAnalyzer } from './utils/analysis';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';

// Load environment variables
dotenv.config();

/**
 * Generate a court-ready document from email data
 * @param inputJsonPath Path to the JSON file containing email data
 * @param outputPath Optional output path for the generated document
 * @param format Output format: 'md' for Markdown or 'pdf' for PDF
 * @returns Path to the generated document
 */
async function generateCourtDocument(inputJsonPath: string, outputPath?: string, format: 'md' | 'pdf' = 'md'): Promise<string> {
  try {
    console.log(`Reading email data from ${inputJsonPath}...`);
    // Read the JSON file
    const jsonData = await fs.readJson(inputJsonPath);
    const emails: EmailData[] = jsonData.emails || [];
    
    if (emails.length === 0) {
      console.error('No emails found in the input file.');
      process.exit(1);
    }
    
    console.log(`Found ${emails.length} emails. Generating court document...`);
    
    // Create output path if not provided
    if (!outputPath) {
      const inputDir = path.dirname(inputJsonPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = format === 'pdf' ? 'pdf' : 'md';
      outputPath = path.join(inputDir, `court-document-${timestamp}.${extension}`);
    } else {
      // Ensure output path has the correct extension
      const extension = format === 'pdf' ? '.pdf' : '.md';
      if (!outputPath.endsWith(extension)) {
        outputPath = outputPath.replace(/\.[^/.]+$/, '') + extension;
      }
    }
    
    // Group emails by thread for better organization
    const threads = ThreadParser.groupEmailsByThread(emails);
    
    // Initialize thread analyzer if OpenAI API key is available
    let analyzer: ThreadAnalyzer | null = null;
    if (process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key found. Thread analysis will be included.');
      analyzer = new ThreadAnalyzer();
    } else {
      console.log('No OpenAI API key found. Thread analysis will be skipped.');
    }
    
    // Create document content
    let documentContent = `# EMAIL EVIDENCE DOCUMENT\n\n`;
    documentContent += `**Generated:** ${new Date().toISOString()}\n`;
    documentContent += `**Total Emails:** ${emails.length}\n`;
    documentContent += `**Total Threads:** ${threads.length}\n\n`;
    
    // Process each thread
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      console.log(`Processing thread ${i+1}/${threads.length}: "${thread.subject}"`);
      
      documentContent += `## THREAD ${i+1}: ${thread.subject}\n\n`;
      documentContent += `**Thread ID:** ${thread.threadId}\n`;
      documentContent += `**Date Range:** ${new Date(thread.startDate).toLocaleString()} to ${new Date(thread.endDate).toLocaleString()}\n`;
      documentContent += `**Participants:** ${thread.participants.join(', ')}\n`;
      documentContent += `**Message Count:** ${thread.messageCount}\n\n`;
      
      // Add thread analysis if analyzer is available
      if (analyzer) {
        try {
          console.log(`Analyzing thread ${i+1}...`);
          const analysis: ThreadAnalysisResult = await analyzer.analyzeThread(thread, "Provide factual analysis relevant for legal proceedings");
          documentContent += `### THREAD ANALYSIS\n\n`;
          documentContent += `**Summary:** ${analysis.summary}\n`;
          documentContent += `**Key Topics:** ${analysis.topics.join(', ')}\n`;
          documentContent += `**Key Insights:**\n`;
          analysis.keyInsights.forEach(insight => {
            documentContent += `- ${insight}\n`;
          });
          documentContent += `\n`;
        } catch (error) {
          console.error(`Error analyzing thread ${thread.threadId}:`, error);
          documentContent += `### THREAD ANALYSIS\n\n`;
          documentContent += `*Analysis unavailable*\n\n`;
        }
      }
      
      // Add each message in the thread with detailed information
      documentContent += `### EMAIL MESSAGES\n\n`;
      
      for (let j = 0; j < thread.messages.length; j++) {
        const email = thread.messages[j];
        documentContent += `#### MESSAGE ${j+1}\n\n`;
        documentContent += `**Email ID:** ${email.id}\n`;
        documentContent += `**From:** ${email.from}\n`;
        documentContent += `**To:** ${email.to}\n`;
        documentContent += `**Date:** ${new Date(email.date).toLocaleString()}\n`;
        documentContent += `**Subject:** ${email.subject}\n`;
        
        // Email body
        documentContent += `\n**Content:**\n\n`;
        documentContent += '```\n';
        documentContent += email.body.plain || '[No plain text content available]';
        documentContent += '\n```\n\n';
        
        // Attachments if any
        if (email.attachments.length > 0) {
          documentContent += `**Attachments (${email.attachments.length}):**\n`;
          email.attachments.forEach(attachment => {
            documentContent += `- ${attachment.filename} (${attachment.mimeType})\n`;
          });
          documentContent += `\n`;
        }
        
        documentContent += `---\n\n`;
      }
    }
    
    // Add footer with legal disclaimer
    documentContent += `## LEGAL DISCLAIMER\n\n`;
    documentContent += `This document was automatically generated and contains email evidence in a format suitable for `;
    documentContent += `legal proceedings. All timestamps are shown in the local timezone at the time of document generation. `;
    documentContent += `The content of the emails has not been altered from the original sources. `;
    documentContent += `Any analysis provided is generated automatically and should be verified by qualified legal professionals.\n`;
    
    // Create HTML from markdown for better PDF rendering
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Evidence Document</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    h1 {
      text-align: center;
      color: #000;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    h2 {
      color: #333;
      margin-top: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }
    h3 {
      color: #444;
      margin-top: 15px;
    }
    h4 {
      color: #555;
      margin-top: 10px;
    }
    code {
      background-color: #f5f5f5;
      padding: 10px;
      display: block;
      border: 1px solid #ddd;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    strong {
      font-weight: bold;
    }
    hr {
      border: 0;
      border-top: 1px solid #eee;
      margin: 20px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
`;

    // Convert markdown to simple HTML
    const markdownToHtml = (md: string): string => {
      // Basic markdown conversion (headers, bold, etc.)
      return md
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/---/g, '<hr>')
        .replace(/- (.+)$/gm, '<li>$1</li>');
    };

    htmlContent += markdownToHtml(documentContent);
    htmlContent += `
</body>
</html>`;

    // Write the HTML file
    const htmlPath = outputPath.replace(/\.(md|pdf)$/, '.html');
    console.log(`Writing HTML document to ${htmlPath}...`);
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    
    // For markdown format, also save the markdown file
    if (format === 'md') {
      console.log(`Writing markdown document to ${outputPath}...`);
      await fs.writeFile(outputPath, documentContent, 'utf8');
      return outputPath;
    }
    
    // For PDF format, use Puppeteer to convert HTML to PDF
    if (format === 'pdf') {
      console.log('Converting HTML to PDF using Puppeteer...');
      try {
        // Launch a headless browser
        const browser = await puppeteer.launch({
          headless: true, // Run in headless mode
          args: ['--no-sandbox']
        });
        
        // Create a new page
        const page = await browser.newPage();
        
        // Load the HTML content
        await page.goto(`file://${path.resolve(htmlPath)}`, {
          waitUntil: 'networkidle0'
        });
        
        // Generate PDF
        await page.pdf({
          path: outputPath,
          format: 'A4',
          margin: {
            top: '30mm',
            bottom: '30mm',
            left: '20mm',
            right: '20mm'
          },
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 9px; width: 100%; text-align: center;">EMAIL EVIDENCE DOCUMENT</div>',
          footerTemplate: '<div style="font-size: 9px; width: 100%; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
          printBackground: true
        });
        
        // Close the browser
        await browser.close();
        
        console.log(`PDF successfully generated at: ${outputPath}`);
        
        // Clean up intermediate files
        await fs.remove(htmlPath);
        
        return outputPath;
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        console.log('Keeping HTML file as fallback...');
        return htmlPath;
      }
    }
    
    return outputPath;
  } catch (error) {
    console.error('Error generating court document:', error);
    process.exit(1);
  }
}

// Main function to handle command line arguments
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Please provide the path to the JSON email export file.');
    console.log('Usage: npm run court-doc -- <path-to-json-file> [output-path] [--pdf]');
    process.exit(1);
  }
  
  let inputJsonPath = '';
  let outputPath: string | undefined;
  let format: 'md' | 'pdf' = 'md';
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--pdf') {
      format = 'pdf';
    } else if (inputJsonPath === '') {
      inputJsonPath = arg;
    } else {
      outputPath = arg;
    }
  }
  
  if (!inputJsonPath) {
    console.error('Please provide the path to the JSON email export file.');
    process.exit(1);
  }
  
  try {
    const documentPath = await generateCourtDocument(inputJsonPath, outputPath, format);
    console.log(`Court document successfully generated at: ${documentPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
