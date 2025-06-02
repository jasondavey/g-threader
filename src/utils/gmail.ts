import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { EmailData, EmailFilter } from '../types';
import * as base64 from 'base-64';
import * as utf8 from 'utf8';

export class GmailClient {
  private gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Build a Gmail search query from filter options
   */
  private buildQuery(filter: EmailFilter): string {
    const queryParts: string[] = [];

    if (filter.sender) {
      queryParts.push(`from:${filter.sender}`);
    }

    if (filter.fromDate) {
      queryParts.push(`after:${filter.fromDate}`);
    }

    if (filter.toDate) {
      queryParts.push(`before:${filter.toDate}`);
    }

    if (filter.subject) {
      queryParts.push(`subject:${filter.subject}`);
    }

    if (filter.query) {
      queryParts.push(filter.query);
    }

    return queryParts.join(' ');
  }

  /**
   * List emails matching the filter criteria
   */
  async listEmails(filter: EmailFilter): Promise<string[]> {
    const query = this.buildQuery(filter);
    console.log(`Searching for emails with query: ${query}`);
    
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500, // Adjust as needed
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log('No emails found matching the criteria.');
        return [];
      }

      console.log(`Found ${response.data.messages.length} emails.`);
      return response.data.messages.map(message => message.id as string);
    } catch (error) {
      console.error('Error listing emails:', error);
      throw error;
    }
  }

  /**
   * Get full email data by ID
   */
  async getEmail(id: string): Promise<EmailData> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      // Extract email data
      const emailData: EmailData = {
        id: message.id || '',
        threadId: message.threadId || '',
        subject: this.getHeader(headers, 'Subject') || '',
        from: this.getHeader(headers, 'From') || '',
        to: this.getHeader(headers, 'To') || '',
        date: this.getHeader(headers, 'Date') || '',
        body: {
          plain: '',
          html: '',
        },
        attachments: [],
      };

      // Extract body and attachments
      this.processMessageParts(message.payload, emailData);

      return emailData;
    } catch (error) {
      console.error(`Error getting email ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process message parts recursively to extract body and attachments
   */
  private processMessageParts(
    part: gmail_v1.Schema$MessagePart | undefined,
    emailData: EmailData,
    isAttachment = false
  ): void {
    if (!part) return;

    const mimeType = part.mimeType || '';
    const partId = part.partId || '';
    const filename = part.filename || '';

    // Handle body parts
    if (part.body?.data && !isAttachment) {
      const decodedData = this.decodeBase64(part.body.data);
      
      if (mimeType === 'text/plain') {
        emailData.body.plain = decodedData;
      } else if (mimeType === 'text/html') {
        emailData.body.html = decodedData;
      }
    }

    // Handle attachments
    if (part.body?.data && (isAttachment || filename)) {
      emailData.attachments.push({
        filename: filename || `attachment-${partId}`,
        mimeType,
        data: part.body.data,
      });
    }

    // Process nested parts
    if (part.parts && part.parts.length > 0) {
      part.parts.forEach(subPart => {
        // Check if this is an attachment
        const isSubPartAttachment = Boolean(
          subPart.filename && subPart.filename.length > 0
        );
        this.processMessageParts(subPart, emailData, isSubPartAttachment);
      });
    }
  }

  /**
   * Helper to get header value by name
   */
  private getHeader(
    headers: gmail_v1.Schema$MessagePartHeader[],
    name: string
  ): string | undefined {
    const header = headers.find(
      h => h.name?.toLowerCase() === name.toLowerCase()
    );
    // Convert null to undefined to match return type
    return header?.value ?? undefined;
  }

  /**
   * Decode base64 encoded string
   */
  private decodeBase64(data: string): string {
    try {
      const bytes = base64.decode(data.replace(/-/g, '+').replace(/_/g, '/'));
      return utf8.decode(bytes);
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  }
}
