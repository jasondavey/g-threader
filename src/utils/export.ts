import * as fs from 'fs-extra';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { EmailData, ExportOptions } from '../types';

export class EmailExporter {
  /**
   * Export emails to the specified format
   */
  async exportEmails(emails: EmailData[], options: ExportOptions): Promise<string> {
    // Ensure export directory exists
    await fs.ensureDir(options.path);
    
    // Format timestamp for filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (options.format) {
      case 'json':
        return this.exportToJson(emails, options.path, timestamp);
      case 'csv':
        return this.exportToCsv(emails, options.path, timestamp);
      case 'eml':
        return this.exportToEml(emails, options.path);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export emails to JSON format
   */
  private async exportToJson(emails: EmailData[], exportPath: string, timestamp: string): Promise<string> {
    const filePath = path.join(exportPath, `emails-${timestamp}.json`);
    
    await fs.writeJson(filePath, {
      count: emails.length,
      exported_at: new Date().toISOString(),
      emails
    }, { spaces: 2 });
    
    return filePath;
  }

  /**
   * Export emails to CSV format
   */
  private async exportToCsv(emails: EmailData[], exportPath: string, timestamp: string): Promise<string> {
    const filePath = path.join(exportPath, `emails-${timestamp}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'threadId', title: 'Thread ID' },
        { id: 'subject', title: 'Subject' },
        { id: 'from', title: 'From' },
        { id: 'to', title: 'To' },
        { id: 'date', title: 'Date' },
        { id: 'plainBody', title: 'Plain Body' },
        { id: 'attachmentCount', title: 'Attachment Count' }
      ]
    });
    
    const records = emails.map(email => ({
      id: email.id,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      date: email.date,
      plainBody: email.body.plain,
      attachmentCount: email.attachments.length
    }));
    
    await csvWriter.writeRecords(records);
    
    return filePath;
  }

  /**
   * Export emails to EML format (one file per email)
   */
  private async exportToEml(emails: EmailData[], exportPath: string): Promise<string> {
    const emailDir = path.join(exportPath, `eml-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await fs.ensureDir(emailDir);
    
    for (const email of emails) {
      // Create a simplified EML format
      const emlContent = [
        `From: ${email.from}`,
        `To: ${email.to}`,
        `Subject: ${email.subject}`,
        `Date: ${email.date}`,
        `Message-ID: <${email.id}@gmail.com>`,
        `Thread-ID: <${email.threadId}@gmail.com>`,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="boundary-string"',
        '',
        '--boundary-string',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        email.body.plain || '',
        '',
      ];
      
      // Add HTML part if available
      if (email.body.html) {
        emlContent.push('--boundary-string');
        emlContent.push('Content-Type: text/html; charset="UTF-8"');
        emlContent.push('');
        emlContent.push(email.body.html);
        emlContent.push('');
      }
      
      // Close the boundary
      emlContent.push('--boundary-string--');
      
      // Save the EML file
      const filename = `${email.id}.eml`;
      const filePath = path.join(emailDir, filename);
      await fs.writeFile(filePath, emlContent.join('\r\n'));
    }
    
    return emailDir;
  }
}
