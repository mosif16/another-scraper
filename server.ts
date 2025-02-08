import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { PerplexicaSearch, SearchResponse } from './PerplexicaSearch.js';
import { FirecrawlService } from './FirecrawlService.js';
import { FirecrawlResponse, FirecrawlResult } from './types.js';

// Load environment variables
config();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'deepseek-r1:14b';

// Validate required environment variables
if (!BOT_TOKEN || !ALLOWED_CHAT_ID) {
  console.error('Missing required environment variables. Please check your .env file');
  process.exit(1);
}

// Initialize bot and services
const bot = new Telegraf(BOT_TOKEN);
const perplexicaSearch = new PerplexicaSearch(process.env.PERPLEXICA_BASE_URL);
const firecrawl = new FirecrawlService('http://localhost:3002'); // Use local Docker instance

// Store active chats
const activeChats = new Set<number>();

// Add interfaces for type safety
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatSession {
  history: ChatMessage[];
  lastActive: number;
}

// Store chat histories
const chatSessions = new Map<number, ChatSession>();

// Cleanup function for old chat sessions
function cleanupOldSessions() {
  const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  
  for (const [chatId, session] of chatSessions.entries()) {
    if (now - session.lastActive > MAX_SESSION_AGE) {
      chatSessions.delete(chatId);
      activeChats.delete(chatId);
    }
  }
}

// Run cleanup every 6 hours
setInterval(cleanupOldSessions, 6 * 60 * 60 * 1000);

// Middleware to check if chat is allowed
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id;
  
  if (chatId !== ALLOWED_CHAT_ID) {
    await ctx.reply('This bot is not available in this chat.');
    return;
  }
  
  return next();
});

// Modify start chat command
bot.command('start_chat', async (ctx) => {
  const chatId = ctx.chat.id;
  
  if (activeChats.has(chatId)) {
    await ctx.reply('Chat is already active in this room.');
    return;
  }
  
  activeChats.add(chatId);
  chatSessions.set(chatId, {
    history: [{
      role: 'system',
      content: 'You are a helpful AI assistant with access to web search.',
      timestamp: Date.now()
    }],
    lastActive: Date.now()
  });
  
  await ctx.reply('Chat session started. You can now talk with the bot!');
});

// Modify stop chat command
bot.command('stop_chat', async (ctx) => {
  const chatId = ctx.chat.id;
  
  if (!activeChats.has(chatId)) {
    await ctx.reply('No active chat session to stop.');
    return;
  }
  
  activeChats.delete(chatId);
  chatSessions.delete(chatId);
  await ctx.reply('Chat session ended and history cleared.');
});

// Modify message handler
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;

  if (messageText.startsWith('/')) return;

  if (!activeChats.has(chatId)) {
    await ctx.reply('Please start a chat session with /start_chat first.');
    return;
  }

  try {
    await ctx.replyWithChatAction('typing');

    // Get or initialize chat session
    let session = chatSessions.get(chatId);
    if (!session) {
      session = {
        history: [{
          role: 'system',
          content: 'You are a helpful AI assistant with access to web search.',
          timestamp: Date.now()
        }],
        lastActive: Date.now()
      };
      chatSessions.set(chatId, session);
    }

    // Add user message to history
    session.history.push({
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    });

    // Format history for Perplexica
    const perplexicaHistory = session.history
      .filter(msg => msg.role !== 'system')
      .map(msg => [
        msg.role === 'user' ? 'human' : 'assistant',
        msg.content
      ] as ['human' | 'assistant', string]);

    // Get context from Perplexica and Firecrawl
    let searchContext = '';
    try {
      // 1. Get search results from Perplexica
      const searchResult: SearchResponse = await perplexicaSearch.search(messageText, {
        focusMode: 'webSearch',
        history: perplexicaHistory
      });

      // 2. Use Firecrawl to extract content from each URL
      const urlContents = await Promise.all(
        searchResult.sources.slice(0, 3).map(async (source: any) => {
          try {
            const content: FirecrawlResult = await firecrawl.scrapeUrl(source.metadata.url);
            return {
              url: source.metadata.url,
              ...content
            };
          } catch (error: any) {
            console.warn(`Failed to scrape ${source.metadata.url}:`, error.message);
            return null;
          }
        })
      );

      // 3. Build context from search results and scraped content
      const validContents = urlContents.filter(content => content !== null);
      
      searchContext = `
WEB SEARCH OVERVIEW:
${searchResult.message}

DETAILED SOURCES:
${validContents.map((content: any, i: number) => `
[${i + 1}] ${searchResult.sources[i].metadata.title}
URL: ${content?.url}
SUMMARY: ${content?.summary}
KEY POINTS:
${content?.keyPoints?.map((point: any) => `- ${point}`).join('\n') || 'No key points available'}
CONTENT EXCERPT: ${content?.content.substring(0, 500)}...
`).join('\n')}`;

    } catch (error: any) {
      console.warn('Search or scraping failed:', error.message);
      searchContext = '(Web search unavailable. Using base knowledge and conversation history.)';
    }

    // Prepare the prompt with context and history
    const historyContext = session.history
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
You are an AI assistant with access to web search results and their full content.
Use this information to provide accurate, well-informed responses.

Previous conversation:
${historyContext}

${searchContext}

User Query: ${messageText}

Think through the available information step by step, then provide your response after </think>.
Let's approach this step by step:`;

    // Get response from Ollama
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Always structure your responses with your thinking process first, followed by </think> and then your final response.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      options: {
        temperature: 0.6,
        top_k: 50,
        top_p: 0.95,
        num_ctx: 16384
      }
    });

    let responseText = response.data?.message?.content || 'Sorry, I could not generate a response.';

    // Extract only the content after </think>
    const thinkingSplit = responseText.split('</think>');
    if (thinkingSplit.length > 1) {
      responseText = thinkingSplit[1].trim();
    } else {
      // If no </think> tag is found, use the whole response but add a warning
      console.warn('No </think> tag found in response');
    }

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from Ollama');
    }

    // Add assistant response to history
    session.history.push({
      role: 'assistant',
      content: responseText,
      timestamp: Date.now()
    });
    session.lastActive = Date.now();

    // Send response in chunks if too long
    const maxLength = 4096;
    if (responseText.length <= maxLength) {
      await ctx.reply(responseText);
    } else {
      for (let i = 0; i < responseText.length; i += maxLength) {
        const chunk = responseText.substring(i, i + maxLength);
        await ctx.reply(chunk);
      }
    }

  } catch (error: any) {
    console.error('Error processing message:', error.message);
    await ctx.reply('Sorry, I encountered an error while processing your message. Please try again.');
  }
});

async function fetchFirecrawlContent(url: string): Promise<FirecrawlResult | null> {
  try {
    return await firecrawl.scrapeUrl(url);
  } catch (error: any) {
    console.warn(`Failed to fetch content from Firecrawl for ${url}:`, error.message);
    return null;
  }
}

// Handle errors
bot.catch((err: any, ctx) => {
  console.error('Bot error:', err.message);
});

// Start bot
bot.launch().then(() => {
  console.log('Bot is running...');
}).catch((error: any) => {
  console.error('Failed to start bot:', error.message);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));