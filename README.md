# Gmail Exporter

A full-stack web application that uses the Gmail API to search, export, and analyze email conversations. Built with TypeScript, Express, React, and Material UI, this application provides a seamless workflow for discovering email insights and generating reports.

## Features

- **Email Search**: Filter emails by sender, recipient, date range, subject, or custom query
- **Project Management**: Organize exports into projects for better workflow management
- **Export Creation**: Save selected emails as JSON exports with proper thread organization
- **Thread Analysis**: Analyze email threads with simple statistics or optional OpenAI-powered insights
- **Report Generation**: Create downloadable PDF reports from analysis results
- **Modern UI**: Clean, responsive interface built with React and Material UI
- **OAuth 2.0 Authentication**: Secure access to Gmail API with token refresh support
- **TypeScript**: End-to-end type safety across frontend and backend

## Prerequisites

- Node.js (v14 or later)
- npm
- Google Cloud Platform account with Gmail API enabled
- Gmail account with emails you want to export

## Setup

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```
3. Set up Google Cloud Project and Gmail API:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Gmail API for your project
   - Configure the OAuth consent screen
   - Create OAuth 2.0 Client ID credentials
   - Download the credentials

4. Configure environment variables:

   - Copy `.env.example` to `.env`

   - Add your Google API credentials to the `.env` file:

     ```env
     CLIENT_ID=your_client_id
     CLIENT_SECRET=your_client_secret
     REDIRECT_URI=http://localhost:3000/oauth2callback
     ```

   - If you plan to use the thread analysis feature, add your OpenAI API key:

     ```env
     OPENAI_API_KEY=your_openai_api_key
     ```

## Getting Started

1. Start the application:

   ```bash
   ./start.sh
   ```

2. Access the web interface at [http://localhost:3000](http://localhost:3000)

3. The first time you run the application, it will provide a URL for authorization. Open the URL in your browser, grant permission to access your Gmail account, and copy the authorization code back to the terminal if prompted.

## Web Application Workflow

1. **Project Management**
   - Create and manage projects to organize your email exports
   - Select an existing project or create a new one before starting an export

2. **Email Search**
   - Search emails using filters (date range, sender, recipient, subject, etc.)
   - Review search results in a sortable, filterable table
   - Select emails to include in your export

3. **Export Creation**
   - Name your export and associate it with a project
   - The system will organize selected emails into threads
   - JSON export files are stored in the exports directory

4. **Analysis**
   - View thread statistics including word frequency, sender distribution, timeline
   - Get simple insights about communication patterns
   - Optionally use OpenAI-powered analysis for deeper insights (requires API key)

5. **Report Generation**
   - Generate PDF reports from analysis results
   - Download reports for offline use or sharing

## Filter Examples

- `FILTER_SENDER=newsletter@example.com` - Filter emails from a specific sender
- `FILTER_FROM_DATE=2023/01/01` - Filter emails after this date
- `FILTER_TO_DATE=2023/12/31` - Filter emails before this date
- `FILTER_SUBJECT=Invoice` - Filter emails with "Invoice" in the subject
- `FILTER_QUERY=has:attachment` - Filter emails with attachments

You can combine multiple filters to narrow your search. See [Gmail search operators](https://support.google.com/mail/answer/7190?hl=en) for more query options.

## Export Formats

- **JSON**: Exports all email data in a structured JSON format
- **CSV**: Exports email metadata in a tabular format
- **EML**: Exports each email as an individual .eml file (can be opened in email clients)

## Gmail API Integration

The application connects to the Gmail API using OAuth 2.0 authentication. Here are important details about this integration:

1. **Authentication Flow**
   - The first time you run the application, it will prompt you to authorize access to your Gmail account
   - Default authorization uses a local HTTP server for the OAuth callback
   - You can set `MANUAL_AUTH=true` in `.env` to use a manual authorization flow if needed
   - Once authenticated, tokens are stored in a local `token.json` file for future use

2. **Configuration Options**
   - `MOCK_GMAIL_API=true`: Use mock data instead of real Gmail API (useful for development)
   - `MANUAL_AUTH=true`: Use manual authorization flow instead of local HTTP server
   - `PORT=3001`: Change the server port (default: 3001)

3. **API Usage**
   - The application uses batch processing to avoid Gmail API rate limits
   - Search queries use Gmail's query language for efficient server-side filtering
   - Email data is cached locally after retrieval to minimize API calls

4. **Permissions Required**
   - The application requests `https://www.googleapis.com/auth/gmail.readonly` scope
   - This allows read-only access to Gmail messages - it cannot modify or send emails

5. **Rate Limits**
   - Gmail API has usage quotas (see [Google API Quotas](https://developers.google.com/gmail/api/reference/quotas))
   - The application implements batch processing and exponential backoff for retries

## Thread Analysis

After exporting emails, you can analyze conversation threads to extract insights on specific topics:

1. Make sure you have set your OpenAI API key in the `.env` file

2. Run the analysis command with your query:

   ```bash
   npm run analyze -- --input ./exports/emails-xxxx-xx-xx.json --query "in network therapy"
   ```

3. Additional analysis options:

   ```bash
   # Minimum number of messages in a thread
   --min-messages 2
   
   # Filter by date range
   --from-date 2023-01-01 --to-date 2023-12-31
   
   # Filter by participants
   --participants user@example.com provider@healthcare.com
   
   # Specify output file
   --output ./analysis-results.json
   
   # Change OpenAI model
   --model gpt-4-turbo
   ```

4. The analysis results will include:
   - Thread summaries
   - Topic identification
   - Relevance scores to your query
   - Key insights extracted from conversations

## Example Use Cases

- **Insurance Coverage Analysis**: Find all threads discussing in-network vs. private therapy options
- **Customer Support Tracking**: Identify recurring issues mentioned in support emails
- **Project Management**: Extract action items and decisions from email discussions
- **Research**: Analyze conversations on specific topics across multiple threads

## Development

- Build the project:

  ```bash
  npm run build
  ```

- Run in development mode with auto-reload:

  ```bash
  npm run dev
  ```

## License

ISC
