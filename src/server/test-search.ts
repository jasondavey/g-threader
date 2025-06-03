import { authorize } from '../utils/auth';
import { google } from 'googleapis';

/**
 * A simple test function to directly search Gmail with minimal parameters
 * This helps us isolate if the issue is with our query construction or with the API access
 */
async function testGmailSearch() {
  console.log('Starting basic Gmail search test...');
  
  try {
    // Authenticate
    console.log('Authenticating with Gmail API...');
    const auth = await authorize();
    console.log('Authentication successful');
    
    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Try a very simple search query first
    const simpleQuery = 'subject:therapy';
    console.log(`Testing simple search query: ${simpleQuery}`);
    
    const simpleResponse = await gmail.users.messages.list({
      userId: 'me',
      q: simpleQuery,
      maxResults: 10
    });
    
    if (simpleResponse.data.messages && simpleResponse.data.messages.length > 0) {
      console.log(`Simple search SUCCESS: Found ${simpleResponse.data.messages.length} messages with subject:therapy`);
    } else {
      console.log('Simple search returned NO RESULTS.');
    }
    
    // Try another search with just sender
    const senderQuery = 'from:jasonrdavey@gmail.com';
    console.log(`Testing sender query: ${senderQuery}`);
    
    const senderResponse = await gmail.users.messages.list({
      userId: 'me',
      q: senderQuery,
      maxResults: 10
    });
    
    if (senderResponse.data.messages && senderResponse.data.messages.length > 0) {
      console.log(`Sender search SUCCESS: Found ${senderResponse.data.messages.length} messages from jasonrdavey@gmail.com`);
    } else {
      console.log('Sender search returned NO RESULTS.');
    }
    
    // Try a combination of queries but very simple
    const combinedQuery = 'subject:therapy from:jasonrdavey@gmail.com';
    console.log(`Testing combined query: ${combinedQuery}`);
    
    const combinedResponse = await gmail.users.messages.list({
      userId: 'me',
      q: combinedQuery,
      maxResults: 10
    });
    
    if (combinedResponse.data.messages && combinedResponse.data.messages.length > 0) {
      console.log(`Combined search SUCCESS: Found ${combinedResponse.data.messages.length} messages`);
    } else {
      console.log('Combined search returned NO RESULTS.');
    }
    
  } catch (error) {
    console.error('Error during test search:', error);
  }
}

// Run the test
testGmailSearch().then(() => {
  console.log('Gmail search test completed');
}).catch(err => {
  console.error('Test failed:', err);
});
