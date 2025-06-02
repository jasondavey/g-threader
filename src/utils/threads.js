"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadParser = void 0;
/**
 * Thread Parser utility to group emails by thread and analyze them
 */
class ThreadParser {
    /**
     * Group emails by their threadId
     */
    static groupEmailsByThread(emails) {
        // Create a map to group emails by threadId
        const threadMap = new Map();
        // Group all emails by their threadId
        emails.forEach(email => {
            var _a;
            if (!threadMap.has(email.threadId)) {
                threadMap.set(email.threadId, []);
            }
            (_a = threadMap.get(email.threadId)) === null || _a === void 0 ? void 0 : _a.push(email);
        });
        // Convert the map to an array of EmailThread objects
        const threads = [];
        threadMap.forEach((messages, threadId) => {
            // Sort messages by date (oldest first)
            messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            // Extract all participants (from both 'from' and 'to' fields)
            const participants = new Set();
            messages.forEach(message => {
                this.extractEmailAddresses(message.from).forEach(addr => participants.add(addr));
                this.extractEmailAddresses(message.to).forEach(addr => participants.add(addr));
            });
            // Create a thread object
            const thread = {
                threadId,
                subject: messages[0].subject, // Subject from the first message
                participants: Array.from(participants),
                startDate: messages[0].date, // Date of the first message
                endDate: messages[messages.length - 1].date, // Date of the last message
                messageCount: messages.length,
                messages
            };
            threads.push(thread);
        });
        // Sort threads by the date of their most recent message (newest first)
        threads.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        return threads;
    }
    /**
     * Filter threads based on query terms and other criteria
     */
    static filterThreads(threads, query, minMessages = 1, dateRange, participants) {
        // Convert query to lowercase for case-insensitive matching
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        return threads.filter(thread => {
            // Filter by minimum number of messages
            if (thread.messageCount < minMessages) {
                return false;
            }
            // Filter by date range if specified
            if (dateRange) {
                if (dateRange.from && new Date(thread.endDate) < new Date(dateRange.from)) {
                    return false;
                }
                if (dateRange.to && new Date(thread.startDate) > new Date(dateRange.to)) {
                    return false;
                }
            }
            // Filter by participants if specified
            if (participants && participants.length > 0) {
                const hasParticipant = participants.some(p => thread.participants.some(tp => tp.toLowerCase().includes(p.toLowerCase())));
                if (!hasParticipant) {
                    return false;
                }
            }
            // Check if any message in the thread matches all query terms
            if (queryTerms.length > 0) {
                return thread.messages.some(message => {
                    const messageText = `${message.subject} ${message.from} ${message.to} ${message.body.plain || ''}`
                        .toLowerCase();
                    return queryTerms.every(term => messageText.includes(term));
                });
            }
            return true;
        });
    }
    /**
     * Generate a text representation of a thread for analysis
     */
    static generateThreadText(thread) {
        let threadText = `Thread: ${thread.subject}\n`;
        threadText += `Participants: ${thread.participants.join(', ')}\n`;
        threadText += `Date Range: ${thread.startDate} to ${thread.endDate}\n`;
        threadText += `Message Count: ${thread.messageCount}\n\n`;
        // Add each message to the thread text
        thread.messages.forEach((message, index) => {
            threadText += `--- Message ${index + 1} ---\n`;
            threadText += `From: ${message.from}\n`;
            threadText += `Date: ${message.date}\n`;
            threadText += `Subject: ${message.subject}\n\n`;
            // Use plain text body if available, otherwise use a placeholder
            if (message.body.plain) {
                threadText += `${message.body.plain.trim()}\n\n`;
            }
            else if (message.body.html) {
                threadText += `[HTML Content Available]\n\n`;
            }
            else {
                threadText += `[No Content Available]\n\n`;
            }
        });
        return threadText;
    }
    /**
     * Helper to extract email addresses from a string
     */
    static extractEmailAddresses(input) {
        if (!input)
            return [];
        // Simple regex to extract email addresses
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
        return (input.match(emailRegex) || []);
    }
}
exports.ThreadParser = ThreadParser;
