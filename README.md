# AI-Powered Telegram Chat Bot

A sophisticated Telegram bot that combines multiple search engines (DuckDuckGo, Perplexica, Brave Search) with Ollama's local AI models for enhanced, structured responses.

## Features

### Core Features
- 🤖 Local AI model integration via Ollama
- 🔍 Multi-engine web search capabilities:
  - Perplexica semantic search
  - DuckDuckGo web search
  - Brave Search integration
- 💬 Intelligent conversation management
- 📊 Structured response format
- 🔄 Automatic fallback between search engines

### Search Commands
- `/search` - Perform a comprehensive multi-engine search
- `/news` - Search recent news articles
- `/image` - Search for images
- `/video` - Search for videos
- `/find_video` - Advanced video content search

### Utility Commands
- `/stocks SYMBOL` - Get stock information
- `/convert FROM TO AMOUNT` - Currency conversion
- `/define WORD` - Word definitions
- `/dict WORD` - Detailed dictionary information
- `/time LOCATION` - Check time in different locations
- `/weather LOCATION` - Get weather forecasts

### Chat Management
- `/start_chat` - Begin a new chat session
- `/stop_chat` - End current chat session

## Response Format

The bot provides structured responses in the following format:

```
Search Sources Used:
✅ Perplexica
✅ DuckDuckGo
✅ Brave Search

[Direct Answer/Overview]

### Key Points
• Point 1
• Point 2
• Point 3

### Additional Information
[Detailed content]

### Sources
[1] https://source1.com
[2] https://source2.com
```

## Prerequisites

- Node.js >= 18.0.0
- Docker (for Perplexica)
- Ollama installed locally
- Telegram Bot Token
- Brave Search API key (optional)

## Installation

1. Clone and setup:
```bash
git clone <your-repo-url>
cd <your-repo-directory>
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Set up environment variables:
```properties
BOT_TOKEN=your_telegram_bot_token
ALLOWED_CHAT_ID=your_telegram_chat_id
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=mistral-small:24b-instruct-2501-q4_K_M
PERPLEXICA_BASE_URL=http://localhost:3001
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
```

## Setting up Perplexica

There are two ways to install Perplexica - With Docker (recommended) or Without Docker.

### Using Docker (Recommended)

1. Ensure Docker is installed and running on your system.

2. Clone the Perplexica repository:
```bash
git clone https://github.com/ItzCrazyKns/Perplexica.git
cd Perplexica
```

3. Configure Perplexica:
   - Rename `sample.config.toml` to `config.toml`
   - Fill in the following fields:
     ```toml
     OPENAI = "your-openai-api-key"  # Optional: Only if using OpenAI models
     OLLAMA = "http://host.docker.internal:11434"  # Required for Ollama integration
     GROQ = "your-groq-api-key"  # Optional: Only if using Groq models
     ANTHROPIC = "your-anthropic-api-key"  # Optional: Only if using Anthropic models
     ```
   Note: You can modify these settings later through the settings dialog.

4. Start Perplexica:
```bash
docker compose up -d
```

5. Access Perplexica at `http://localhost:3000` in your web browser.

Note: After initial setup, you can start/stop Perplexica directly from Docker Desktop.

## Setting up Ollama

1. Install Ollama from [ollama.ai](https://ollama.ai)

2. Pull the required model:
```bash
ollama pull mistral-small:24b-instruct-2501-q4_K_M
```

## Running the Bot

1. Development mode:
```bash
npm run dev
```

2. Production mode:
```bash
npm run build
npm start
```

## Bot Commands

- `/start_chat` - Start a new chat session
- `/stop_chat` - End the current chat session

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| BOT_TOKEN | Telegram Bot Token | Required |
| ALLOWED_CHAT_ID | Telegram Chat ID where bot is allowed | Required |
| OLLAMA_BASE_URL | Ollama API URL | http://localhost:11434 |
| DEFAULT_MODEL | Default Ollama model | mistral-small:24b-instruct-2501-q4_K_M |
| PERPLEXICA_BASE_URL | Perplexica API URL | http://localhost:3001 |
| BRAVE_SEARCH_API_KEY | Brave Search API Key | Optional |

## Project Structure

```
.
├── services/
│   ├── DuckDuckGoService.ts    # DuckDuckGo integration
│   ├── OutputFormatter.ts      # Response formatting
│   ├── SearchOrchestrator.ts  # Search orchestration
│   └── BraveSearchService.ts   # Brave Search integration
├── utils/
│   └── RateLimiter.ts         # Rate limiting utility
├── server.ts                   # Main bot server
├── PerplexicaSearch.ts        # Perplexica integration
└── package.json               # Project dependencies
```

## New Features

### Multi-Engine Search
- Automatic fallback between search engines
- Concurrent searches for faster responses
- Intelligent error handling
- Rate limiting protection

### Structured Output
- Clear section organization
- Automatic bullet point formatting
- Source URL extraction and listing
- Markdown formatting support

### Enhanced Error Handling
- Graceful degradation when services fail
- Clear error reporting
- Automatic retry mechanisms
- Rate limit awareness

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security Notes

- Never commit your `.env` file
- Keep your bot token secure
- Regularly update dependencies
- Monitor your Ollama and Perplexica instances

## Troubleshooting

### Common Issues

1. **Structured Output Issues:**
   - Check markdown formatting in responses
   - Verify section headers are properly formatted
   - Ensure URLs are properly extracted

2. **Search Engine Failures:**
   - Monitor individual search engine statuses
   - Check rate limits
   - Verify API keys and endpoints

3. **Response Formatting:**
   - Check message length limits
   - Verify markdown parsing
   - Monitor section splitting

1. **Bot not responding:**
   - Check if Ollama is running
   - Verify your BOT_TOKEN
   - Ensure correct ALLOWED_CHAT_ID

2. **Search not working:**
   - Verify Perplexica container is running
   - Check PERPLEXICA_BASE_URL
   - Look for connection errors in logs

3. **Model errors:**
   - Ensure the model is pulled in Ollama
   - Check model name in DEFAULT_MODEL
   - Verify Ollama API is accessible
