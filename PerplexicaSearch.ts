import axios from 'axios';

interface ChatModel {
  provider: 'openai' | 'ollama';
  model: string;
  customOpenAIBaseURL?: string;
  customOpenAIKey?: string;
}

interface EmbeddingModel {
  provider: 'openai';
  model: string;
}

interface SearchSource {
  pageContent: string;
  metadata: {
    title: string;
    url: string;
    publishedDate?: string;
  };
}

export interface SearchResponse {
  message: string;
  sources: SearchSource[];
}

type FocusMode = 'webSearch' | 'academicSearch' | 'writingAssistant' | 
                 'wolframAlphaSearch' | 'youtubeSearch' | 'redditSearch';
type OptimizationMode = 'speed' | 'balanced';
type HistoryEntry = ['human' | 'assistant', string];

interface SearchRequest {
  chatModel?: ChatModel;
  embeddingModel?: EmbeddingModel;
  optimizationMode?: OptimizationMode;
  focusMode: FocusMode;
  query: string;
  history?: HistoryEntry[];
  searchDate?: string;
  recencyBoost?: boolean;
  maxAgeDays?: number;
}

export class PerplexicaSearch {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateRange(maxAgeDays: number = 30): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - maxAgeDays);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  async search(query: string, options: Omit<SearchRequest, 'query'>): Promise<SearchResponse> {
    try {
      const dateRange = this.getDateRange(options.maxAgeDays || 30);
      const response = await axios.post<SearchResponse>(`${this.baseUrl}/api/search`, {
        query,
        searchDate: this.getCurrentDate(),
        recencyBoost: true, // Always boost recent content
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        chatModel: options.chatModel || {
          provider: 'ollama',
          model: 'mistral-small:24b-instruct-2501-q4_K_M',
          temperature: 0.15
        },
        embeddingModel: options.embeddingModel || {
          provider: 'ollama',
          model: 'snowflake-arctic-embed2:latest'
        },
        focusMode: options.focusMode,
        optimizationMode: 'balanced', // Changed back to balanced
        searchOptions: {
          filterDuplicates: true,
          prioritizeRecent: true,
          minRelevanceScore: 0.6, // Adjusted for balanced approach
          maxResults: 8 // Increased results for better context
        },
        history: options.history || []
      });

      // Sort sources by date if available
      response.data.sources.sort((a, b) => {
        const dateA = a.metadata.publishedDate ? new Date(a.metadata.publishedDate) : new Date(0);
        const dateB = b.metadata.publishedDate ? new Date(b.metadata.publishedDate) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new Error('Invalid search request: ' + error.response.data.message);
        } else if (error.response?.status === 500) {
          throw new Error('Search server error: ' + error.response.data.message);
        }
        throw new Error(`Search failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getAvailableModels(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/models`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch available models');
    }
  }
}

export const createPerplexicaSearch = (baseUrl?: string): PerplexicaSearch => {
  return new PerplexicaSearch(baseUrl);
};
