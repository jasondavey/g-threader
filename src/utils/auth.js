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
exports.authorize = authorize;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const http = __importStar(require("http"));
const child_process = __importStar(require("child_process"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
/**
 * Create an OAuth2 client with the given credentials
 */
async function authorize() {
    const { CLIENT_ID, CLIENT_SECRET } = process.env;
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing required environment variables for authentication. Please check your .env file.');
    }
    // Create OAuth client for web application
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost:3000/oauth2callback');
    // Check if we have previously stored a token
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        }
        else {
            // Manual approach as fallback if we have issues with the server
            if (process.env.MANUAL_AUTH === 'true') {
                return getNewTokenManual(oAuth2Client);
            }
            else {
                return getNewTokenWithServer(oAuth2Client);
            }
        }
    }
    catch (error) {
        console.error('Error loading stored token:', error);
        return getNewTokenManual(oAuth2Client);
    }
}
/**
 * Get and store new token using a local web server
 * This is the approach recommended for web applications
 */
async function getNewTokenWithServer(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            if (!req.url) {
                res.end('No URL in request');
                return;
            }
            // Get the URL path
            const urlParts = new URL(req.url, 'http://localhost:3000');
            const pathname = urlParts.pathname;
            if (pathname !== '/oauth2callback') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('Invalid callback endpoint');
                return;
            }
            // Get the code from query parameters
            const code = urlParts.searchParams.get('code');
            if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('No authorization code received');
                server.close();
                reject(new Error('No authorization code received'));
                return;
            }
            // Display success page to user
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window and return to the application.</p></body></html>');
            // Exchange the code for tokens
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                // Save the token for future use
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                console.log('\nToken stored to', TOKEN_PATH);
                // Close the server and resolve
                server.close(() => {
                    resolve(oAuth2Client);
                });
            }
            catch (error) {
                console.error('Error getting tokens:', error);
                server.close(() => {
                    reject(error);
                });
            }
        });
        // Start the server on port 3000
        server.listen(3000, () => {
            // Generate the URL for authorization
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent',
            });
            console.log('\nAuthorize this app by visiting this URL:\n');
            console.log(authUrl);
            // Try to open the URL in a browser
            try {
                const platform = process.platform;
                const cmd = platform === 'win32' ? 'start' :
                    platform === 'darwin' ? 'open' :
                        'xdg-open';
                child_process.exec(`${cmd} "${authUrl}"`);
            }
            catch (error) {
                console.log('Could not open browser automatically. Please open the URL manually.');
            }
        });
        server.on('error', (e) => {
            console.error('Server error:', e);
            reject(e);
        });
    });
}
/**
 * Manual fallback method for getting a token
 * This is useful if the server method has issues
 */
async function getNewTokenManual(oAuth2Client) {
    // Generate the authorization URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    console.log('\nAuthorize this app by visiting this URL:\n');
    console.log(authUrl);
    console.log('\nAfter authorization, you will be redirected to a URL that starts with http://localhost:3000/oauth2callback');
    console.log('Copy the full URL from your browser and paste it below.');
    // Create a readline interface to get user input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    // Ask the user to enter the full redirect URL
    return new Promise((resolve, reject) => {
        rl.question('Enter the full redirect URL here: ', async (redirectUrl) => {
            rl.close();
            try {
                // Parse the URL to get the authorization code
                const parsedUrl = new URL(redirectUrl);
                const code = parsedUrl.searchParams.get('code');
                if (!code) {
                    throw new Error('No authorization code found in the URL');
                }
                // Exchange the code for tokens
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                // Store the token for future use
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                console.log('\nToken stored to', TOKEN_PATH);
                resolve(oAuth2Client);
            }
            catch (error) {
                console.error('Error retrieving access token:', error);
                reject(error);
            }
        });
    });
}
