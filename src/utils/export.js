"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailExporter = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const csv_writer_1 = require("csv-writer");
class EmailExporter {
    /**
     * Export emails to the specified format
     */
    async exportEmails(emails, options) {
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
    async exportToJson(emails, exportPath, timestamp) {
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
    async exportToCsv(emails, exportPath, timestamp) {
        const filePath = path.join(exportPath, `emails-${timestamp}.csv`);
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
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
    async exportToEml(emails, exportPath) {
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
exports.EmailExporter = EmailExporter;
