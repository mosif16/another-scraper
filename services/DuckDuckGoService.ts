import * as DDG from 'duck-duck-scrape';
import { SafeSearchType } from 'duck-duck-scrape';

// Update type definitions to match duck-duck-scrape options
interface ExtendedSearchOptions extends DDG.SearchOptions {
  time?: 'd' | 'w' | 'm' | 'y';
}

export class DuckDuckGoService {
  private safeSearch: SafeSearchType = SafeSearchType.MODERATE;

  async regularSearch(query: string) {
    const results = await DDG.search(query, { 
      safeSearch: this.safeSearch,
      time: 'w'  // Last week results
    });
    return this.formatSearchResults(results);
  }

  async imageSearch(query: string) {
    // Use separate image search method
    const results = await DDG.searchImages(query, { 
      safeSearch: this.safeSearch 
    });
    return this.formatImageResults(results);
  }

  async videoSearch(query: string) {
    // Use separate video search method
    const results = await DDG.searchVideos(query, {
      safeSearch: this.safeSearch
    });
    return this.formatVideoResults(results);
  }

  async newsSearch(query: string) {
    // Use regular search with time parameter
    const results = await DDG.search(query, {
      safeSearch: this.safeSearch,
      time: 'd'  // Last day for news
    });
    return this.formatNewsResults(results);
  }

  async getTimeForLocation(location: string) {
    const time = await DDG.time(location);
    return this.formatTimeResult(time);
  }

  async getWeatherForecast(location: string) {
    const forecast = await DDG.forecast(location);
    return this.formatForecastResult(forecast);
  }

  async getDictionaryInfo(word: string) {
    const [definition, pronunciation, hyphenation] = await Promise.all([
      DDG.dictionaryDefinition(word),
      DDG.dictionaryAudio(word),
      DDG.dictionaryHyphenation(word)
    ]);
    return this.formatDictionaryResult(definition, pronunciation, hyphenation);
  }

  async getStockInfo(symbol: string) {
    try {
      const stockInfo = await DDG.stocks(symbol);
      return this.formatStockInfo(stockInfo);
    } catch (error) {
      console.error('DDG stock info error:', error);
      throw error;
    }
  }

  async getCurrencyConversion(from: string, to: string, amount: number) {
    try {
      const conversion = await DDG.currency(from, to, amount);
      return this.formatCurrencyConversion(conversion);
    } catch (error) {
      console.error('DDG currency conversion error:', error);
      throw error;
    }
  }

  async getDefinition(word: string) {
    try {
      const definition = await DDG.dictionaryDefinition(word);
      return this.formatDefinition(definition);
    } catch (error) {
      console.error('DDG definition error:', error);
      throw error;
    }
  }

  async findVideoContent(query: string) {
    try {
      // First try video search with recent results
      const videoResults = await DDG.search(query + ' video', {
        safeSearch: this.safeSearch,
        time: 'w' // Last week
      });

      // Then try regular search with time filter
      const webResults = await DDG.search(query + ' official video', {
        safeSearch: this.safeSearch,
        time: 'm' // Last month for broader coverage
      });

      return this.formatVideoContentResults(videoResults, webResults);
    } catch (error) {
      console.error('Video content search error:', error);
      throw error;
    }
  }

  private formatSearchResults(results: any) {
    if (results.noResults) return 'No results found.';
    return results.results
      ?.slice(0, 5)
      ?.map((r: any) => `• ${r.title}\n  ${r.description}\n  URL: ${r.url}`)
      .join('\n\n') || 'No results available';
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

    // Helper to extract YouTube/video URLs
    const extractVideoUrls = (text: string) => {
      const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]+)/i;
      const matches = text.match(youtubeRegex);
      return matches ? matches[0] : null;
    };

    // Process video results
    if (videoResults?.results) {
      for (const result of videoResults.results) {
        const videoUrl = extractVideoUrls(result.url || result.description || '');
        if (videoUrl && !seenUrls.has(videoUrl)) {
          seenUrls.add(videoUrl);
          results.push(`🎥 ${result.title}\nURL: ${videoUrl}`);
        }
      }
    }

    // Process web results
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
