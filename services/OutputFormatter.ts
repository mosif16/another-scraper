export interface SearchStatus {
  perplexica: '✅' | '❌' | '⏳' | '⚠️';
  ddg: '✅' | '❌' | '⏳' | '⚠️';
  brave: '✅' | '❌' | '⏳' | '⚠️';
  ollama: '✅' | '❌' | '⏳' | '⚠️';
}

export class OutputFormatter {
  private static readonly THINK_MARKER = '</think>';
  private static readonly ANSWER_MARKER = '**Answer:**';

  static formatResponse(
    responseText: string,
    searchStatus: SearchStatus,
    includeThinking = false
  ): string {
    // Split thinking and response
    const [thinking, response] = this.splitThinkingAndResponse(responseText);
    
    // Extract direct answer if present
    const [fullResponse, directAnswer] = this.extractDirectAnswer(response);
    
    // Build status header
    const statusHeader = this.formatStatusHeader(searchStatus);
    
    // Compose final output
    let output = statusHeader + '\n\n';
    
    if (includeThinking && thinking) {
      output += `Thinking Process:\n${thinking.trim()}\n\n`;
    }
    
    if (directAnswer) {
      // If there's a direct answer, show it first, then full context
      output += `TL;DR: ${directAnswer.trim()}\n\n`;
      output += `Full Context:\n${fullResponse.trim()}`;
    } else {
      // Otherwise just show the response
      output += fullResponse.trim();
    }
    
    return output;
  }

  private static splitThinkingAndResponse(text: string): [string, string] {
    const parts = text.split(this.THINK_MARKER);
    return parts.length > 1 ? 
      [parts[0].trim(), parts[1].trim()] : 
      ['', text.trim()];
  }

  private static extractDirectAnswer(text: string): [string, string] {
    const parts = text.split(this.ANSWER_MARKER);
    return parts.length > 1 ? 
      [parts[0].trim(), parts[1].trim()] : 
      [text.trim(), ''];
  }

  private static formatStatusHeader(status: SearchStatus): string {
    return `Search Sources Used:
${status.perplexica} Perplexica
${status.ddg} DuckDuckGo
${status.brave} Brave Search`;
  }

  static cleanupResponse(text: string): string {
    return text
      // Remove multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up bullet points
      .replace(/\s*•\s*/g, '\n• ')
      // Clean up URLs
      .replace(/URL:\s+/g, 'URL: ')
      // Clean up markdown
      .replace(/\*\*/g, '')
      .trim();
  }
}
