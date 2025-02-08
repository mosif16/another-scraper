import { DuckDuckGoService } from './DuckDuckGoService.js';
import { PerplexicaSearch } from '../PerplexicaSearch.js';
import { OutputFormatter } from './OutputFormatter.js';

interface SearchResult {
  content: string;
  source: string;
  url?: string;
  error?: string;
}

export class SearchOrchestrator {
  private ddg: DuckDuckGoService;
  private perplexica: PerplexicaSearch;
  private formatter: typeof OutputFormatter;

  constructor() {
    this.ddg = new DuckDuckGoService();
    this.perplexica = new PerplexicaSearch();
    this.formatter = OutputFormatter;
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPromises = [
      this.searchWithDDG(query),
      this.searchWithPerplexica(query)
    ];

    // Execute all searches concurrently and handle failures individually
    const settledResults = await Promise.allSettled(searchPromises);

    settledResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    return results;
  }

  private async searchWithDDG(query: string): Promise<SearchResult> {
    try {
      const result = await this.ddg.regularSearch(query);
      // Extract first URL from result if present
      const urlMatch = result.match(/URL: (https?:\/\/[^\s]+)/);
      return {
        content: result,
        source: 'DuckDuckGo',
        url: urlMatch ? urlMatch[1] : undefined
      };
    } catch (error) {
      return {
        content: '',
        source: 'DuckDuckGo',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async searchWithPerplexica(query: string): Promise<SearchResult> {
    try {
      const result = await this.perplexica.search(query, {
        focusMode: 'webSearch',
        recencyBoost: true
      });
      // Get first source URL if available
      const sourceUrl = result.sources?.[0]?.metadata?.url;
      return {
        content: result.message,
        source: 'Perplexica',
        url: sourceUrl
      };
    } catch (error) {
      return {
        content: '',
        source: 'Perplexica',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  formatResults(results: SearchResult[]): string {
    const successfulResults = results.filter(r => !r.error);
    const failedSources = results.filter(r => r.error).map(r => r.source);

    // Combine all search results into a structured format
    let responseText = '';
    
    // Add main overview section
    if (successfulResults.length > 0) {
      const mainResult = successfulResults[0];
      responseText += `${mainResult.content}\n\n`;
    }

    // Add detailed findings section
    if (successfulResults.length > 1) {
      responseText += '### Additional Information\n';
      successfulResults.slice(1).forEach(result => {
        responseText += `${result.content}\n\n`;
      });
    }

    // Add sources section
    const urls = successfulResults
      .map(r => r.url)
      .filter((url): url is string => !!url);

    if (urls.length > 0) {
      responseText += '### Sources\n';
      urls.forEach((url, index) => {
        responseText += `[${index + 1}] ${url}\n`;
      });
    }

    // Format using OutputFormatter
    const formattedResponse = this.formatter.formatResponse(
      responseText,
      {
        ddg: results.find(r => r.source === 'DuckDuckGo')?.error ? '❌' : '✅',
        perplexica: results.find(r => r.source === 'Perplexica')?.error ? '❌' : '✅',
        brave: '⚠️',
        ollama: '⚠️'
      },
      false
    );

    return formattedResponse;
  }
}
