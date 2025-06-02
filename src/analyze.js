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
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const threads_1 = require("./utils/threads");
const analysis_1 = require("./utils/analysis");
// Load environment variables
dotenv_1.default.config();
/**
 * Main analysis function to process exported emails
 */
async function analyzeEmails(options) {
    try {
        console.log('Starting email thread analysis...');
        // Load emails from the input file
        console.log(`Loading emails from: ${options.inputFile}`);
        if (!fs.existsSync(options.inputFile)) {
            console.error(`Error: Input file not found: ${options.inputFile}`);
            process.exit(1);
        }
        // Read and parse the email data
        const rawData = await fs.readFile(options.inputFile, 'utf8');
        const parsedData = JSON.parse(rawData);
        // Handle different possible JSON structures
        let emails;
        if (Array.isArray(parsedData)) {
            // If the JSON is directly an array of emails
            emails = parsedData;
        }
        else if (parsedData && typeof parsedData === 'object') {
            // If the JSON has emails under a property (common export format)
            if (Array.isArray(parsedData.emails)) {
                emails = parsedData.emails;
            }
            else {
                // Try to find any array property that might contain the emails
                const arrayProps = Object.keys(parsedData).filter(key => Array.isArray(parsedData[key]));
                if (arrayProps.length > 0) {
                    // Use the first array property found
                    emails = parsedData[arrayProps[0]];
                    console.log(`Using data from '${arrayProps[0]}' property.`);
                }
                else {
                    throw new Error('Could not find an array of emails in the JSON file. Check the file structure.');
                }
            }
        }
        else {
            throw new Error('Invalid JSON structure. Expected an array or an object with an array property.');
        }
        console.log(`Loaded ${emails.length} emails.`);
        // Group emails by thread
        console.log('Grouping emails by thread...');
        const threads = threads_1.ThreadParser.groupEmailsByThread(emails);
        console.log(`Found ${threads.length} threads.`);
        // Filter threads based on query and options
        console.log(`Filtering threads using query: "${options.query}"`);
        const filteredThreads = threads_1.ThreadParser.filterThreads(threads, options.query, options.minMessages, options.dateRange, options.participants);
        console.log(`${filteredThreads.length} threads match the criteria.`);
        if (filteredThreads.length === 0) {
            console.log('No threads found matching the criteria.');
            process.exit(0);
        }
        // Initialize the thread analyzer
        console.log('Initializing LLM analysis...');
        const analyzer = new analysis_1.ThreadAnalyzer(undefined, // Use API key from environment
        options.model, options.maxTokens);
        // Analyze threads
        console.log('Analyzing threads...');
        const analysisResults = await analyzer.analyzeThreads(filteredThreads, options.query);
        // Save the results
        const outputFile = options.outputFile ||
            path.join(path.dirname(options.inputFile), `analysis-${new Date().toISOString().replace(/:/g, '-')}.json`);
        await fs.writeJSON(outputFile, {
            query: options.query,
            totalThreads: threads.length,
            matchedThreads: filteredThreads.length,
            analysisResults
        }, { spaces: 2 });
        console.log(`Analysis results saved to: ${outputFile}`);
        // Display summary of top results
        console.log('\nTop Analysis Results:');
        analysisResults.slice(0, 5).forEach((result, index) => {
            console.log(`\n#${index + 1} - ${result.subject} (Relevance: ${result.relevanceScore}%)`);
            console.log(`Summary: ${result.summary}`);
            console.log(`Topics: ${result.topics.join(', ')}`);
            console.log('Key Insights:');
            result.keyInsights.forEach(insight => console.log(`- ${insight}`));
        });
        console.log('\nAnalysis completed successfully.');
    }
    catch (error) {
        console.error('Error during analysis:', error);
        process.exit(1);
    }
}
/**
 * Main function to parse command line arguments and start analysis
 */
async function main() {
    const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .usage('Usage: $0 --input <file> --query <search query>')
        .option('input', {
        alias: 'i',
        describe: 'Path to the exported JSON file containing emails',
        type: 'string',
        demandOption: true
    })
        .option('output', {
        alias: 'o',
        describe: 'Path to save the analysis results',
        type: 'string'
    })
        .option('query', {
        alias: 'q',
        describe: 'Search query to filter relevant threads',
        type: 'string',
        demandOption: true
    })
        .option('min-messages', {
        alias: 'm',
        describe: 'Minimum number of messages in a thread',
        type: 'number',
        default: 2
    })
        .option('from-date', {
        describe: 'Filter threads starting from this date (YYYY-MM-DD)',
        type: 'string'
    })
        .option('to-date', {
        describe: 'Filter threads up to this date (YYYY-MM-DD)',
        type: 'string'
    })
        .option('participants', {
        alias: 'p',
        describe: 'Filter by participant email (can be specified multiple times)',
        type: 'array'
    })
        .option('model', {
        describe: 'OpenAI model to use for analysis',
        type: 'string',
        default: 'gpt-3.5-turbo'
    })
        .option('max-tokens', {
        describe: 'Maximum tokens for LLM responses',
        type: 'number',
        default: 1000
    })
        .help()
        .alias('help', 'h')
        .example('$0 --input ./exports/emails.json --query "in network therapy"', 'Analyze threads related to in-network therapy')
        .wrap(yargs_1.default.terminalWidth())
        .argv;
    // Construct analysis options
    const options = {
        inputFile: argv.input,
        outputFile: argv.output,
        query: argv.query,
        minMessages: argv.minMessages,
        model: argv.model,
        maxTokens: argv.maxTokens
    };
    // Add date range if specified
    if (argv.fromDate || argv.toDate) {
        options.dateRange = {
            from: argv.fromDate,
            to: argv.toDate
        };
    }
    // Add participants if specified
    if (argv.participants) {
        options.participants = argv.participants;
    }
    // Start analysis
    await analyzeEmails(options);
}
// Run the application
main();
