import axios from 'axios';
import { FirecrawlResponse, FirecrawlResult, FirecrawlJobResponse, FirecrawlJobStatus } from './types.js';

export class FirecrawlService {
  private baseUrl: string;
  private readonly POLL_INTERVAL = 2000; // 2 seconds
  private readonly MAX_RETRIES = 15; // 30 seconds total

  constructor(baseUrl: string = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
  }

  private async createScrapeJob(url: string): Promise<string> {
    const response = await axios.post<FirecrawlJobResponse>(
      `${this.baseUrl}/v0/scrape`,
      {
        url,
        formats: ['extract', 'markdown'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                extract: { selector: 'h1, .article-title, meta[property="og:title"]', attribute: 'content' }
              },
              content: {
                type: 'string',
                extract: { selector: 'article, .article-content, .post-content', type: 'text' }
              },
              summary: {
                type: 'string',
                extract: { selector: 'meta[name="description"]', attribute: 'content' }
              },
              keyPoints: {
                type: 'array',
                items: { type: 'string' },
                extract: { selector: 'h2, h3', limit: 5 }
              }
            },
            required: ['content']
          }
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    if (!response.data.jobId) {
      throw new Error('No job ID received');
    }
    return response.data.jobId;
  }

  private async checkJobStatus(jobId: string): Promise<FirecrawlJobStatus> {
    const response = await axios.get<FirecrawlJobStatus>(
      `${this.baseUrl}/v0/jobs/${jobId}`
    );
    return response.data;
  }

  private async waitForJobCompletion(jobId: string): Promise<FirecrawlResult> {
    let retries = 0;
    
    while (retries < this.MAX_RETRIES) {
      const status = await this.checkJobStatus(jobId);
      
      switch (status.status) {
        case 'completed':
          if (!status.result?.formats.extract) {
            throw new Error('No extraction results in completed job');
          }
          const result = status.result.formats.extract;
          return {
            title: result.title,
            content: result.content || 'No content found',
            summary: result.summary || 'No summary available',
            keyPoints: result.keyPoints || [],
            author: result.author,
            publishDate: result.publishDate
          };
          
        case 'failed':
          throw new Error(`Job failed: ${status.error || 'Unknown error'}`);
          
        case 'pending':
        case 'processing':
          await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
          retries++;
          break;
      }
    }
    
    throw new Error(`Job timed out after ${this.MAX_RETRIES * this.POLL_INTERVAL / 1000} seconds`);
  }

  async scrapeUrl(url: string): Promise<FirecrawlResult> {
    try {
      const jobId = await this.createScrapeJob(url);
      return await this.waitForJobCompletion(jobId);
    } catch (error: any) {
      console.error(`Firecrawl error for ${url}:`, error);
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }
}