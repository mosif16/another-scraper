import * as DDG from 'duck-duck-scrape';
import { SafeSearchType } from 'duck-duck-scrape';
import { RateLimiter } from '../utils/RateLimiter.js';

// Update type definitions to match duck-duck-scrape options
interface ExtendedSearchOptions extends DDG.SearchOptions {
  time?: 'd' | 'w' | 'm' | 'y';
}

export class DuckDuckGoService {
  private safeSearchSetting: SafeSearchType = SafeSearchType.MODERATE;
  private rateLimiter: RateLimiter;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.rateLimiter = new RateLimiter(0.5); // 1 request per 2 seconds
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.retryCount
  ): Promise<T> {
    try {
      await this.rateLimiter.waitForNext();
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  async regularSearch(query: string): Promise<string> {
    try {
      const results = await this.executeWithRetry(() => 
        DDG.search(query, {
          safeSearch: this.safeSearchSetting,
          time: 'w'
        })
      );
      return this.formatSearchResults(results);
    } catch (error) {
      throw new Error(`DDG search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async imageSearch(query: string) {
    try {
      const results = await this.executeWithRetry(() => 
        DDG.searchImages(query, { 
          safeSearch: this.safeSearchSetting 
        })
      );
      return this.formatImageResults(results);
    } catch (error) {
      throw new Error(`DDG image search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async videoSearch(query: string) {
    try {
      const results = await this.executeWithRetry(() => 
        DDG.searchVideos(query, {
          safeSearch: this.safeSearchSetting
        })
      );
      return this.formatVideoResults(results);
    } catch (error) {
      throw new Error(`DDG video search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async newsSearch(query: string) {
    try {
      const results = await this.executeWithRetry(() => 
        DDG.search(query, {
          safeSearch: this.safeSearchSetting,
          time: 'd'  // Last day for news
        })
      );
      return this.formatNewsResults(results);
    } catch (error) {
      throw new Error(`DDG news search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTimeForLocation(location: string) {
    try {
      const time = await this.executeWithRetry(() => DDG.time(location));
      return this.formatTimeResult(time);
    } catch (error) {
      throw new Error(`DDG time retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWeatherForecast(location: string) {
    try {
      const forecast = await this.executeWithRetry(() => DDG.forecast(location));
      return this.formatForecastResult(forecast);
    } catch (error) {
      throw new Error(`DDG weather forecast retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDictionaryInfo(word: string) {
    try {
      const [definition, pronunciation, hyphenation] = await Promise.all([
        this.executeWithRetry(() => DDG.dictionaryDefinition(word)),
        this.executeWithRetry(() => DDG.dictionaryAudio(word)),
        this.executeWithRetry(() => DDG.dictionaryHyphenation(word))
      ]);
      return this.formatDictionaryResult(definition, pronunciation, hyphenation);
    } catch (error) {
      throw new Error(`DDG dictionary info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStockInfo(symbol: string) {
    try {
      const stockInfo = await this.executeWithRetry(() => DDG.stocks(symbol));
      return this.formatStockInfo(stockInfo);
    } catch (error) {
      throw new Error(`DDG stock info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrencyConversion(from: string, to: string, amount: number) {
    try {
      const conversion = await this.executeWithRetry(() => DDG.currency(from, to, amount));
      return this.formatCurrencyConversion(conversion);
    } catch (error) {
      throw new Error(`DDG currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDefinition(word: string) {
    try {
      const definition = await this.executeWithRetry(() => DDG.dictionaryDefinition(word));
      return this.formatDefinition(definition);
    } catch (error) {
      throw new Error(`DDG definition retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findVideoContent(query: string) {
    try {
      const videoResults = await this.executeWithRetry(() => 
        DDG.search(query + ' video', {
          safeSearch: this.safeSearchSetting,
          time: 'w' // Last week
        })
      );

      const webResults = await this.executeWithRetry(() => 
        DDG.search(query + ' official video', {
          safeSearch: this.safeSearchSetting,
          time: 'm' // Last month for broader coverage
        })
      );

      return this.formatVideoContentResults(videoResults, webResults);
    } catch (error) {
      throw new Error(`Video content search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatSearchResults(results: any): string {
    if (!results || results.noResults) return 'No results found.';
    try {
      return results.results
        ?.slice(0, 5)
        ?.map((r: any) => `• ${r.title}\n  ${r.description}\n  URL: ${r.url}`)
        .join('\n\n') || 'No results available';
    } catch (error) {
      console.error('Error formatting results:', error);
      return 'Error formatting search results';
    }
  }

  private formatImageResults(results: any) {
    if (!Array.isArray(results)) return 'No image results found.';
    return results
      .slice(0, 5)
      .map((img: any) => 
        `• ${img.title || 'Untitled'}\n  URL: ${img.url || img.image || 'No URL'}\n  Size: ${img.width || '?'}x${img.height || '?'}`
      )
      .join('\n\n');
  }

  private formatVideoResults(results: any) {
    if (!Array.isArray(results)) return 'No video results found.';
    return results
      .slice(0, 5)
      .map((video: any) => 
        `• ${video.title || 'Untitled'}\n  Duration: ${video.duration || 'Unknown'}\n  URL: ${video.url || 'No URL'}`
      )
      .join('\n\n');
  }

  private formatNewsResults(results: any) {
    if (!Array.isArray(results)) return 'No news results found.';
    return results
      .slice(0, 5)
      .map((news: any) => 
        `• ${news.title || 'Untitled'}\n  ${news.excerpt || 'No excerpt'}\n  Source: ${news.source || 'Unknown'}\n  Published: ${news.date || 'Unknown'}`
      )
      .join('\n\n');
  }

  private formatTimeResult(time: any) {
    return `Current Time: ${time.time}\nTimezone: ${time.timezone}\nDate: ${time.date}`;
  }

  private formatForecastResult(forecast: any) {
    return `
Weather Forecast:
Current: ${forecast.current.summary} ${forecast.current.temperature}°
Today: ${forecast.daily[0].summary}
Tomorrow: ${forecast.daily[1].summary}
    `.trim();
  }

  private formatDictionaryResult(definition: any, pronunciation: any, hyphenation: any) {
    return `
Word Information:
${definition.definitions.map((d: any, i: number) => `${i + 1}. ${d.definition}`).join('\n')}

Pronunciation: ${pronunciation?.pronunciation || 'N/A'}
Audio: ${pronunciation?.audioUrl || 'N/A'}
Hyphenation: ${hyphenation?.hyphenation?.join('-') || 'N/A'}
    `.trim();
  }

  private formatStockInfo(info: any) {
    return `
Stock Info for ${info.symbol}:
Price: ${info.price}
Change: ${info.change} (${info.changePercent}%)
Market Cap: ${info.marketCap}
`;
  }

  private formatCurrencyConversion(info: any) {
    return `${info.amount} ${info.from} = ${info.result} ${info.to}`;
  }

  private formatDefinition(info: any) {
    return info.definitions
      .map((def: any, index: number) => 
        `${index + 1}. ${def.definition}`
      )
      .join('\n');
  }

  private formatVideoContentResults(videoResults: any, webResults: any) {
    const results: string[] = [];
    const seenUrls = new Set<string>();

    const extractVideoUrls = (text: string) => {
      const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]+)/i;
      const matches = text.match(youtubeRegex);
      return matches ? matches[0] : null;
    };

    if (videoResults?.results) {
      for (const result of videoResults.results) {
        const videoUrl = extractVideoUrls(result.url || result.description || '');
        if (videoUrl && !seenUrls.has(videoUrl)) {
          seenUrls.add(videoUrl);
          results.push(`🎥 ${result.title}\nURL: ${videoUrl}`);
        }
      }
    }

    if (webResults?.results) {
      for (const result of webResults.results) {
        const videoUrl = extractVideoUrls(result.url || result.description || '');
        if (videoUrl && !seenUrls.has(videoUrl)) {
          seenUrls.add(videoUrl);
          results.push(`🌐 ${result.title}\nURL: ${videoUrl}`);
        }
      }
    }

    return results.length > 0 
      ? `Found Video Content:\n\n${results.slice(0, 3).join('\n\n')}`
      : 'No video content found. Try checking official channels or gaming news sites.';
  }
}
