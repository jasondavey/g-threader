import { EmailThread, ThreadAnalysisResult } from '../types';
import { ThreadParser } from './threads';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * LLM Analysis utility to analyze email threads using OpenAI
 */
export class ThreadAnalyzer {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;

  /**
   * Initialize the ThreadAnalyzer with OpenAI configuration
   */
  constructor(apiKey?: string, model = 'gpt-3.5-turbo', maxTokens = 1000) {
    // Use provided API key or get from environment variables
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in .env or provide it when initializing ThreadAnalyzer.');
    }
    
    this.openai = new OpenAI({ apiKey: key });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  /**
   * Analyze a thread and generate insights
   */
  public async analyzeThread(
    thread: EmailThread, 
    query: string
  ): Promise<ThreadAnalysisResult> {
    // Generate text representation of the thread
    const threadText = ThreadParser.generateThreadText(thread);
    
    // Create the prompt for the LLM
    const prompt = this.createAnalysisPrompt(threadText, query);
    
    try {
      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an email analysis assistant that extracts key information from email conversations.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3,
      });
      
      // Parse the response
      const analysisText = response.choices[0]?.message?.content || '';
      const result = this.parseAnalysisResponse(analysisText, thread);
      
      return result;
    } catch (error) {
      console.error('Error analyzing thread:', error);
      // Return a basic result in case of error
      return {
        threadId: thread.threadId,
        subject: thread.subject,
        summary: 'Error analyzing this thread.',
        topics: [],
        relevanceScore: 0,
        keyInsights: [],
      };
    }
  }

  /**
   * Analyze multiple threads in batch
   */
  public async analyzeThreads(
    threads: EmailThread[],
    query: string,
    concurrency = 3
  ): Promise<ThreadAnalysisResult[]> {
    const results: ThreadAnalysisResult[] = [];
    const batchSize = concurrency;
    
    // Process threads in batches to avoid rate limiting
    for (let i = 0; i < threads.length; i += batchSize) {
      const batch = threads.slice(i, i + batchSize);
      console.log(`Analyzing batch ${i / batchSize + 1} of ${Math.ceil(threads.length / batchSize)}...`);
      
      const batchPromises = batch.map(thread => this.analyzeThread(thread, query));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
    }
    
    // Sort results by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Create a prompt for the LLM analysis
   */
  private createAnalysisPrompt(threadText: string, query: string): string {
    return `
Please analyze the following email thread and extract key information related to this query: "${query}"

${threadText}

Format your response as follows:
SUMMARY: Provide a brief 1-2 sentence summary of the thread.
TOPICS: List 3-5 main topics discussed in the thread, comma-separated.
RELEVANCE_SCORE: Provide a score from 0-100 indicating how relevant this thread is to the query.
SENTIMENT: Provide a brief assessment of the overall sentiment (positive, negative, neutral).
KEY_INSIGHTS: List 3-5 key insights from this thread related to the query, each on a new line starting with "-".
`;
  }

  /**
   * Parse the LLM response into a structured format
   */
  private parseAnalysisResponse(
    analysisText: string,
    thread: EmailThread
  ): ThreadAnalysisResult {
    // Extract the summary
    const summaryMatch = analysisText.match(/SUMMARY:(.*?)(?:TOPICS:|$)/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    
    // Extract the topics
    const topicsMatch = analysisText.match(/TOPICS:(.*?)(?:RELEVANCE_SCORE:|$)/s);
    const topicsStr = topicsMatch ? topicsMatch[1].trim() : '';
    const topics = topicsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    // Extract the relevance score
    const relevanceMatch = analysisText.match(/RELEVANCE_SCORE:(.*?)(?:SENTIMENT:|$)/s);
    const relevanceStr = relevanceMatch ? relevanceMatch[1].trim() : '0';
    const relevanceScore = parseInt(relevanceStr, 10) || 0;
    
    // Extract the sentiment
    const sentimentMatch = analysisText.match(/SENTIMENT:(.*?)(?:KEY_INSIGHTS:|$)/s);
    const sentiment = sentimentMatch ? sentimentMatch[1].trim() : '';
    
    // Map sentiment to a score
    let sentimentScore: number | undefined;
    if (sentiment.toLowerCase().includes('positive')) {
      sentimentScore = 1;
    } else if (sentiment.toLowerCase().includes('negative')) {
      sentimentScore = -1;
    } else if (sentiment.toLowerCase().includes('neutral')) {
      sentimentScore = 0;
    }
    
    // Extract key insights
    const insightsMatch = analysisText.match(/KEY_INSIGHTS:(.*?)$/s);
    const insightsStr = insightsMatch ? insightsMatch[1].trim() : '';
    const keyInsights = insightsStr
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return {
      threadId: thread.threadId,
      subject: thread.subject,
      summary,
      topics,
      relevanceScore,
      sentimentScore,
      keyInsights,
    };
  }
}
