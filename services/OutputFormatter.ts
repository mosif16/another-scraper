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
    
    // Extract URLs from the response
    const urls = this.extractURLs(fullResponse);
    
    // Format sections
    const sections = this.extractSections(fullResponse);
    
    // Build output
    let output = this.formatStatusHeader(searchStatus) + '\n\n';
    
    if (directAnswer) {
      output += `${this.cleanupSection(directAnswer)}\n\n`;
    }

    // Add sections with proper formatting
    sections.forEach(section => {
      if (section.title && section.content) {
        output += `### ${section.title}\n${this.cleanupSection(section.content)}\n\n`;
      }
    });

    if (urls.length > 0) {
      output += `### Sources\n`;
      urls.forEach((url, index) => {
        output += `[${index + 1}] ${url}\n`;
      });
    }
    
    return this.cleanupResponse(output);
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

  private static extractURLs(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private static extractSections(text: string): Array<{title: string, content: string}> {
    const sections: Array<{title: string, content: string}> = [];
    
    // Split by markdown headers or bullet points
    const parts = text.split(/(?=###\s|•\s|-\s)/);
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) {
        if (trimmed.startsWith('###')) {
          const [title, ...content] = trimmed.split('\n');
          sections.push({
            title: title.replace('###', '').trim(),
            content: content.join('\n').trim()
          });
        } else {
          // Group bullet points under a common section if no header
          const existingBullets = sections.find(s => s.title === 'Key Points');
          if (existingBullets) {
            existingBullets.content += '\n' + trimmed;
          } else {
            sections.push({
              title: 'Key Points',
              content: trimmed
            });
          }
        }
      }
    });
    
    return sections;
  }

  private static cleanupSection(text: string): string {
    return text
      // Fix bullet points
      .replace(/^[•-]\s*/gm, '• ')
      .replace(/(?:\n\s*[•-]\s*)+/g, '\n• ')
      // Remove extra spaces around bullet points
      .replace(/\n{2,}\s*•\s*/g, '\n• ')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static formatStatusHeader(status: SearchStatus): string {
    return [
      'Search Sources Used:',
      `${status.perplexica} Perplexica`,
      `${status.ddg} DuckDuckGo`,
      `${status.brave} Brave Search`
    ].join('\n');
  }

  static cleanupResponse(text: string): string {
    return text
      // Remove multiple newlines
      .replace(/\n{4,}/g, '\n\n')
      .replace(/\n{3}/g, '\n\n')
      // Fix section headers spacing
      .replace(/\n### /g, '\n\n### ')
      // Remove trailing spaces
      .replace(/[ \t]+$/gm, '')
      // Fix bullet point formatting
      .replace(/•\s+/g, '• ')
      // Remove extra spaces around colons
      .replace(/\s*:\s*/g, ': ')
      // Fix spacing after periods
      .replace(/\.\s+/g, '. ')
      // Remove empty bullet points
      .replace(/^•\s*$/gm, '')
      .replace(/\n+•\s*\n+/g, '\n')
      // Ensure proper spacing between sections
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
