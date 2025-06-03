import dotenv from 'dotenv';
import { authorize } from './utils/auth';
import { GmailClient } from './utils/gmail';
import { EmailExporter } from './utils/export';
import { EmailFilter, ExportOptions } from './types';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Starting Gmail Exporter...');
    
    // Get email filter settings from environment variables
    const filter: EmailFilter = {
      sender: process.env.FILTER_SENDER,
      fromDate: process.env.FILTER_FROM_DATE,
      toDate: process.env.FILTER_TO_DATE,
      subject: process.env.FILTER_SUBJECT,
      query: process.env.FILTER_QUERY,
    };

    // Remove undefined filter properties
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof EmailFilter] === undefined) {
        delete filter[key as keyof EmailFilter];
      }
    });

    // Check if any filter is defined
    if (Object.keys(filter).length === 0) {
      console.error('Error: At least one filter parameter must be provided.');
      console.log('Please set filter parameters in .env file or as command line arguments.');
      process.exit(1);
    }

    // Setup export options
    const exportPath = process.env.EXPORT_PATH || './exports';
    const exportOptions: ExportOptions = {
      format: 'json', // Default format
      path: path.resolve(process.cwd(), exportPath),
    };

    // Authorize with Google
    console.log('Authenticating with Google...');
    const auth = await authorize();
    
    // Initialize Gmail client
    const gmailClient = new GmailClient(auth);
    
    // Search for emails
    console.log('Searching for emails matching filters...');
    console.log('Filter criteria:', filter);
    const { messageIds: emailIds } = await gmailClient.listEmails(filter);
    
    if (emailIds.length === 0) {
      console.log('No emails found matching the criteria.');
      process.exit(0);
    }
    
    console.log(`Found ${emailIds.length} emails.`);
    
    // Fetch full email data
    console.log('Fetching email details...');
    const emails = [];
    
    // Process emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);
      const batchPromises = batch.map((id: string) => gmailClient.getEmail(id));
      
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(emailIds.length / batchSize)}...`);
      const batchResults = await Promise.all(batchPromises);
      emails.push(...batchResults);
    }
    
    // Export emails
    console.log(`Exporting ${emails.length} emails...`);
    const exporter = new EmailExporter();
    
    // Export in standard formats
    const standardFormats: Array<'json' | 'csv' | 'eml'> = ['json', 'csv', 'eml'];
    
    for (const format of standardFormats) {
      exportOptions.format = format;
      const outputPath = await exporter.exportEmails(emails, exportOptions);
      console.log(`Exported emails in ${format.toUpperCase()} format to: ${outputPath}`);
    }
    
    console.log('Email export completed successfully');
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

// Run the application
main();
