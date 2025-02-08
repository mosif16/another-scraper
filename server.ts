import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { PerplexicaSearch, SearchResponse } from './PerplexicaSearch.js';
import { DuckDuckGoService } from './services/DuckDuckGoService.js';

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
const ddg = new DuckDuckGoService();

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

// Add new commands
bot.command('stocks', async (ctx) => {
  const symbol = ctx.message.text.split(' ')[1];
  if (!symbol) {
    await ctx.reply('Please provide a stock symbol. Example: /stocks AAPL');
    return;
  }
  
  try {
    const stockInfo = await ddg.getStockInfo(symbol);
    await ctx.reply(stockInfo);
  } catch (error) {
    await ctx.reply('Error fetching stock information.');
  }
});

bot.command('convert', async (ctx) => {
  const [, from, to, amount] = ctx.message.text.split(' ');
  if (!from || !to || !amount) {
    await ctx.reply('Please use format: /convert USD EUR 100');
    return;
  }
  
  try {
    const conversion = await ddg.getCurrencyConversion(from, to, Number(amount));
    await ctx.reply(conversion);
  } catch (error) {
    await ctx.reply('Error converting currency.');
  }
});

bot.command('define', async (ctx) => {
  const word = ctx.message.text.split(' ')[1];
  if (!word) {
    await ctx.reply('Please provide a word to define. Example: /define happy');
    return;
  }
  
  try {
    const definition = await ddg.getDefinition(word);
    await ctx.reply(definition);
  } catch (error) {
    await ctx.reply('Error fetching definition.');
  }
});

bot.command('image', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) {
    await ctx.reply('Please provide a search term. Example: /image cute cats');
    return;
  }
  try {
    const results = await ddg.imageSearch(query);
    await ctx.reply(results);
  } catch (error) {
    await ctx.reply('Error searching for images.');
  }
});

bot.command('video', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) {
    await ctx.reply('Please provide a search term. Example: /video cooking tutorial');
    return;
  }
  try {
    const results = await ddg.videoSearch(query);
    await ctx.reply(results);
  } catch (error) {
    await ctx.reply('Error searching for videos.');
  }
});

bot.command('news', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) {
    await ctx.reply('Please provide a search term. Example: /news technology');
    return;
  }
  try {
    const results = await ddg.newsSearch(query);
    await ctx.reply(results);
  } catch (error) {
    await ctx.reply('Error searching news.');
  }
});

bot.command('time', async (ctx) => {
  const location = ctx.message.text.split(' ').slice(1).join(' ');
  if (!location) {
    await ctx.reply('Please provide a location. Example: /time New York');
    return;
  }
  try {
    const timeInfo = await ddg.getTimeForLocation(location);
    await ctx.reply(timeInfo);
  } catch (error) {
    await ctx.reply('Error getting time information.');
  }
});

bot.command('weather', async (ctx) => {
  const location = ctx.message.text.split(' ').slice(1).join(' ');
  if (!location) {
    await ctx.reply('Please provide a location. Example: /weather London');
    return;
  }
  try {
    const forecast = await ddg.getWeatherForecast(location);
    await ctx.reply(forecast);
  } catch (error) {
    await ctx.reply('Error getting weather forecast.');
  }
});

bot.command('dict', async (ctx) => {
  const word = ctx.message.text.split(' ')[1];
  if (!word) {
    await ctx.reply('Please provide a word. Example: /dict happiness');
    return;
  }
  try {
    const wordInfo = await ddg.getDictionaryInfo(word);
    await ctx.reply(wordInfo);
  } catch (error) {
    await ctx.reply('Error getting word information.');
  }
});

bot.command('find_video', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) {
    await ctx.reply('Please provide what video you are looking for. Example: /find_video battlefield 2024 pre alpha footage');
    return;
  }
  
  try {
    const results = await ddg.findVideoContent(query);
    await ctx.reply(results);
  } catch (error) {
    await ctx.reply('Error searching for video content.');
  }
});

// Add helper function at the top level
function isVideoSearchQuery(text: string): boolean {
  const videoKeywords = [
    'video', 'footage', 'trailer', 'teaser', 'preview',
    'gameplay', 'stream', 'watch', 'clip', 'show me'
  ];
  return videoKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

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

    // Get search contexts
    let searchContext = '';
    let ddgSearchContext = '';
    let videoContext = '';

    try {
      // Check if this might be a video-related query
      if (isVideoSearchQuery(messageText)) {
        const videoResults = await ddg.findVideoContent(messageText);
        videoContext = `\nVIDEO SEARCH RESULTS:\n${videoResults}\n`;
      }

      // Get Perplexica results
      const searchResult: SearchResponse = await perplexicaSearch.search(messageText, {
        focusMode: 'webSearch',
        history: perplexicaHistory
      });

      // Build context from search results with safe property access
      searchContext = `
WEB SEARCH OVERVIEW:
${searchResult.message || 'No overview available'}

DETAILED SOURCES:
${searchResult.sources?.map((source: any, i: number) => {
  const title = source?.metadata?.title || 'No title';
  const url = source?.metadata?.url || 'No URL';
  const content = source?.content || 'No content available';
  
  return `
[${i + 1}] ${title}
URL: ${url}
CONTENT: ${content.length > 500 ? content.substring(0, 500) + '...' : content}`;
}).join('\n') || 'No sources available'}`;

      // Get DDG results
      const ddgResults = await ddg.regularSearch(messageText);
      ddgSearchContext = `
DUCKDUCKGO SEARCH RESULTS:
${ddgResults}
`;

    } catch (error: any) {
      console.warn('Search failed:', error.message);
      searchContext = '(Web search unavailable. Using base knowledge and conversation history.)';
    }

    // Prepare the prompt with all contexts
    const historyContext = session.history
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
You are an AI assistant with access to web search results from multiple sources.
Use this information to provide accurate, well-informed responses.
If the user is asking about videos, focus on providing direct video links when available.

Previous conversation:
${historyContext}

${searchContext}

${ddgSearchContext}

${videoContext}

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