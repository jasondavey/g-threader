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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./utils/auth");
const gmail_1 = require("./utils/gmail");
const export_1 = require("./utils/export");
const path = __importStar(require("path"));
// Load environment variables
dotenv_1.default.config();
async function main() {
    try {
        console.log('Starting Gmail Exporter...');
        // Get email filter settings from environment variables
        const filter = {
            sender: process.env.FILTER_SENDER,
            fromDate: process.env.FILTER_FROM_DATE,
            toDate: process.env.FILTER_TO_DATE,
            subject: process.env.FILTER_SUBJECT,
            query: process.env.FILTER_QUERY,
        };
        // Remove undefined filter properties
        Object.keys(filter).forEach(key => {
            if (filter[key] === undefined) {
                delete filter[key];
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
        const exportOptions = {
            format: 'json', // Default format
            path: path.resolve(process.cwd(), exportPath),
        };
        // Authorize with Google
        console.log('Authenticating with Google...');
        const auth = await (0, auth_1.authorize)();
        // Initialize Gmail client
        const gmailClient = new gmail_1.GmailClient(auth);
        // Search for emails
        console.log('Searching for emails matching filters...');
        console.log('Filter criteria:', filter);
        const emailIds = await gmailClient.listEmails(filter);
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
            const batchPromises = batch.map(id => gmailClient.getEmail(id));
            console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(emailIds.length / batchSize)}...`);
            const batchResults = await Promise.all(batchPromises);
            emails.push(...batchResults);
        }
        // Export emails
        console.log(`Exporting ${emails.length} emails...`);
        const exporter = new export_1.EmailExporter();
        // Export in standard formats
        const standardFormats = ['json', 'csv', 'eml'];
        for (const format of standardFormats) {
            exportOptions.format = format;
            const outputPath = await exporter.exportEmails(emails, exportOptions);
            console.log(`Exported emails in ${format.toUpperCase()} format to: ${outputPath}`);
        }
        console.log('Email export completed successfully');
    }
    catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}
// Run the application
main();
