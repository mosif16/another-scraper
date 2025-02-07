import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { PerplexicaSearch } from './PerplexicaSearch.js';

// Load environment variables
config();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_CHAT_ID = Number(process.env.ALLOWED_CHAT_ID);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'mistral-small:24b-instruct-2501-q4_K_M';

// Validate required environment variables
if (!BOT_TOKEN || !ALLOWED_CHAT_ID) {
  console.error('Missing required environment variables. Please check your .env file');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);
const perplexicaSearch = new PerplexicaSearch(process.env.PERPLEXICA_BASE_URL);

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

    // Get context from Perplexica with history
    let searchContext = '';
    try {
      const searchResult = await perplexicaSearch.search(messageText, {
        focusMode: 'webSearch',
        history: perplexicaHistory
      });

      searchContext = `
WEB SEARCH RESULTS:
${searchResult.message}

RELEVANT SOURCES:
${searchResult.sources.map((source, i) => 
  `[${i + 1}] ${source.metadata.title}\n    URL: ${source.metadata.url}`
).join('\n\n')}`;
    } catch (error) {
      console.warn('Perplexica search failed:', error);
      searchContext = '(Web search unavailable. Using base knowledge and conversation history.)';
    }

    // Prepare the prompt with context and history
    const historyContext = session.history
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
Previous conversation:
${historyContext}

${searchContext}

User Query: ${messageText}

Provide a helpful response using both the conversation history and available information:`;

    // Get response from Ollama
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant with access to web search.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      options: {
        temperature: 0.15,
        top_k: 50,
        top_p: 0.95,
        num_ctx: 16384  // Increased from 4096 to 16384
      }
    });

    const responseText = response.data?.message?.content || 'Sorry, I could not generate a response.';

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

  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply('Sorry, I encountered an error while processing your message. Please try again.');
  }
});

// Handle errors
bot.catch((err: unknown, ctx) => {
  console.error('Bot error:', err);
});

// Start bot
bot.launch().then(() => {
  console.log('Bot is running...');
}).catch((error) => {
  console.error('Failed to start bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));