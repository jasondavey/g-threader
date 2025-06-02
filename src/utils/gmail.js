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
exports.GmailClient = void 0;
const googleapis_1 = require("googleapis");
const base64 = __importStar(require("base-64"));
const utf8 = __importStar(require("utf8"));
class GmailClient {
    constructor(auth) {
        this.gmail = googleapis_1.google.gmail({ version: 'v1', auth });
    }
    /**
     * Build a Gmail search query from filter options
     */
    buildQuery(filter) {
        const queryParts = [];
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
    async listEmails(filter) {
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
            return response.data.messages.map(message => message.id);
        }
        catch (error) {
            console.error('Error listing emails:', error);
            throw error;
        }
    }
    /**
     * Get full email data by ID
     */
    async getEmail(id) {
        var _a;
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id,
                format: 'full',
            });
            const message = response.data;
            const headers = ((_a = message.payload) === null || _a === void 0 ? void 0 : _a.headers) || [];
            // Extract email data
            const emailData = {
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
        }
        catch (error) {
            console.error(`Error getting email ${id}:`, error);
            throw error;
        }
    }
    /**
     * Process message parts recursively to extract body and attachments
     */
    processMessageParts(part, emailData, isAttachment = false) {
        var _a, _b;
        if (!part)
            return;
        const mimeType = part.mimeType || '';
        const partId = part.partId || '';
        const filename = part.filename || '';
        // Handle body parts
        if (((_a = part.body) === null || _a === void 0 ? void 0 : _a.data) && !isAttachment) {
            const decodedData = this.decodeBase64(part.body.data);
            if (mimeType === 'text/plain') {
                emailData.body.plain = decodedData;
            }
            else if (mimeType === 'text/html') {
                emailData.body.html = decodedData;
            }
        }
        // Handle attachments
        if (((_b = part.body) === null || _b === void 0 ? void 0 : _b.data) && (isAttachment || filename)) {
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
                const isSubPartAttachment = Boolean(subPart.filename && subPart.filename.length > 0);
                this.processMessageParts(subPart, emailData, isSubPartAttachment);
            });
        }
    }
    /**
     * Helper to get header value by name
     */
    getHeader(headers, name) {
        var _a;
        const header = headers.find(h => { var _a; return ((_a = h.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === name.toLowerCase(); });
        // Convert null to undefined to match return type
        return (_a = header === null || header === void 0 ? void 0 : header.value) !== null && _a !== void 0 ? _a : undefined;
    }
    /**
     * Decode base64 encoded string
     */
    decodeBase64(data) {
        try {
            const bytes = base64.decode(data.replace(/-/g, '+').replace(/_/g, '/'));
            return utf8.decode(bytes);
        }
        catch (error) {
            console.error('Error decoding base64:', error);
            return '';
        }
    }
}
exports.GmailClient = GmailClient;
