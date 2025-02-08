import axios from 'axios';

interface BraveSearchOptions {
  country?: string;
  safesearch?: 'strict' | 'moderate' | 'off';
  freshness?: 'past_day' | 'past_week' | 'past_month' | 'past_year';
}

export class BraveSearchService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async search(query: string, options: BraveSearchOptions = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
        },
        params: {
          q: query,
          freshness: 'past_week', // Default to last week
          ...options
        }
      });

      return this.formatResults(response.data);
    } catch (error) {
      console.error('Brave search error:', error);
      throw error;
    }
  }

  async searchNews(query: string) {
    return this.search(query, { 
      freshness: 'past_day' // News should be very recent
    });
  }

  private formatResults(data: any) {
    if (!data.web?.results) return 'No results found.';

    return data.web.results
      .slice(0, 5)
      .map((result: any) => `
• ${result.title}
  ${result.description}
  URL: ${result.url}
  ${result.age ? `Published: ${result.age}` : ''}
  ${result.freshness ? `Freshness: ${result.freshness}` : ''}
`).join('\n');
  }
}
