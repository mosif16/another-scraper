// client.ts (browser-side example)
export {};  // Makes this file a module

class OllamaClient {
    private baseUrl: string;
    private chatId?: string;
  
    constructor(baseUrl: string = 'http://localhost:3005') {
      this.baseUrl = baseUrl;
    }
  
    async webSearch(url: string): Promise<string> {
      const response = await fetch(`${this.baseUrl}/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
  
      if (!response.ok) {
        throw new Error('Web search failed');
      }
  
      const data = await response.json();
      return data.content;
    }
  
    async* sendMessage(message: string): AsyncGenerator<string> {
      try {
        const response = await fetch(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, chatId: this.chatId }),
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Chat request failed');
        }
    
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to read stream');
    
        const textDecoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = textDecoder.decode(value);
          yield chunk;
        }
      } catch (error) {
        console.error('Chat error:', error);
        throw error;
      }
    }
  }
  
  // Browser usage example:
  declare global {
    interface Window { ollamaClient: OllamaClient; }
  }
  
  window.ollamaClient = new OllamaClient();
  
  // Example UI integration:
  async function handleMessageSend() {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const output = document.getElementById('chat-output');
    if (!input || !output) return;
  
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    input.disabled = true;
  
    const responseDiv = document.createElement('div');
    try {
      const div = document.createElement('div');
      div.textContent = `You: ${message}`;
      output.appendChild(div);
    
      responseDiv.textContent = 'Assistant: ';
      output.appendChild(responseDiv);
    
      try {
        const stream = window.ollamaClient.sendMessage(message);
        for await (const chunk of stream) {
          responseDiv.textContent += chunk;
        }
      } catch (error) {
        responseDiv.textContent += ` [Error: ${(error as Error).message}]`;
      }
    } catch (error) {
      console.error('Chat error:', error);
      responseDiv.textContent += ` [Error: ${(error as Error).message}]`;
    } finally {
      input.disabled = false;
    }
  }
  
  async function handleWebSearch() {
    const urlInput = document.getElementById('url-input') as HTMLInputElement;
    const output = document.getElementById('web-output');
    
    if (urlInput && output) {
      try {
        const content = await window.ollamaClient.webSearch(urlInput.value);
        output.textContent = `Web Content: ${content.substring(0, 500)}...`;
      } catch (error) {
        output.textContent = `Error: ${(error as Error).message}`;
      }
    }
  }