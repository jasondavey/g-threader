import dotenv from 'dotenv';
import { authorize } from './utils/auth';
import { GmailClient } from './utils/gmail';
import { EmailFilter, EmailData } from './types';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Check if the required environment variables are set
 */
function checkRequiredEnvVars(): boolean {
  const requiredVars = ['CLIENT_ID', 'CLIENT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  return true;
}

/**
 * Generate mock email data for testing
 */
function generateMockEmails(count: number): EmailData[] {
  const emails: EmailData[] = [];
  
  for (let i = 1; i <= count; i++) {
    emails.push({
      id: `mock_email_id_${i}`,
      threadId: `mock_thread_${Math.ceil(i/2)}`,
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: `Mock Email #${i}`,
      date: new Date(Date.now() - i * 3600000).toISOString(),
      body: {
        plain: `This is the plain text content of mock email #${i}`,
        html: `<div>This is the <b>HTML content</b> of mock email #${i}</div>`
      },
      attachments: i % 3 === 0 ? [{
        filename: 'sample.pdf',
        mimeType: 'application/pdf',
        data: 'bW9jayBwZGYgZGF0YQ=='
      }] : []
    });
  }
  
  return emails;
}

/**
 * Simple test script to verify Gmail API connection
 */
async function testGmailApiConnection() {
  console.log('Starting Gmail API connection test...');
  
  // Check if we should use mock data
  const useMockData = process.env.MOCK_GMAIL_API === 'true' || !checkRequiredEnvVars();
  
  if (useMockData) {
    console.log('🔄 Using mock data mode for testing');
    const mockEmails = generateMockEmails(5);
    
    console.log('✅ Successfully generated mock data:');
    const email = mockEmails[0];
    console.log(`- ID: ${email.id}`);
    console.log(`- Thread ID: ${email.threadId}`);
    console.log(`- From: ${email.from}`);
    console.log(`- Subject: ${email.subject}`);
    console.log(`- Date: ${email.date}`);
    console.log(`- Has ${email.attachments?.length || 0} attachments`);
    
    // Save mock data for future reference
    try {
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      const mockExportPath = path.join(exportsDir, 'mock_export.json');
      fs.writeFileSync(mockExportPath, JSON.stringify({
        metadata: {
          created: new Date().toISOString(),
          resultCount: mockEmails.length
        },
        emails: mockEmails
      }, null, 2));
      
      console.log(`\n✅ Mock data saved to ${mockExportPath}`);
      console.log('\nMock data test completed successfully!');
    } catch (saveError) {
      console.error('Error saving mock data:', saveError);
    }
    
    console.log('\n⚠️  To test with real Gmail API:');
    console.log('1. Set MOCK_GMAIL_API=false in your .env file');
    console.log('2. Add your CLIENT_ID and CLIENT_SECRET to .env');
    console.log('3. Run this test again');
    
    return;
  }
  
  // Real Gmail API test
  try {
    console.log('Attempting to authorize with Gmail API...');
    const auth = await authorize();
    console.log('✅ Authorization successful! Token acquired.');
    
    console.log('Initializing Gmail client...');
    const gmailClient = new GmailClient(auth);
    
    console.log('Fetching a sample of 5 recent emails...');
    // Create a filter that matches recent emails
    const filter: EmailFilter = {
      fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // last 30 days
      query: 'is:inbox'
    };
    
    // We'll limit to 5 results in our handling
    const { messageIds: emailIds } = await gmailClient.listEmails(filter);
    const limitedIds = emailIds.slice(0, 5);
    
    console.log(`✅ Successfully found ${emailIds.length} emails.`);
    
    if (limitedIds.length > 0) {
      console.log('Fetching full data for the first email...');
      const email = await gmailClient.getEmail(limitedIds[0]);
      
      console.log('✅ Successfully retrieved email details:');
      console.log(`- ID: ${email.id}`);
      console.log(`- Thread ID: ${email.threadId}`);
      console.log(`- From: ${email.from}`);
      console.log(`- Subject: ${email.subject}`);
      console.log(`- Date: ${email.date}`);
      console.log(`- Has ${email.attachments?.length || 0} attachments`);
      console.log('\nGmail API connection test completed successfully! ✅');
    } else {
      console.log('No emails found in your inbox.');
    }
  } catch (error) {
    console.error('❌ Error testing Gmail API connection:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Verify your CLIENT_ID and CLIENT_SECRET are correct in .env');
    console.log('2. Make sure you completed the OAuth2 authorization flow');
    console.log('3. Check if token.json exists and has valid credentials');
    console.log('4. Try deleting token.json to force a new authorization');
    console.log('5. Set MOCK_GMAIL_API=true in your .env if you want to use mock data instead');
    process.exit(1);
  }
}

// Run the test
testGmailApiConnection();
