# AI-Powered Telegram Chat Bot

A Telegram bot that combines Ollama's local AI models with Perplexica's web search capabilities for enhanced conversational responses.

## Features

- 🤖 Local AI model integration via Ollama
- 🔍 Web search capabilities using Perplexica
- 💬 Telegram bot interface
- 🧵 Conversation history management
- 🌐 Real-time web search integration
- 🔐 Environment-based configuration

## Prerequisites

- Node.js >= 18.0.0
- Docker (for Perplexica)
- Ollama installed locally
- A Telegram Bot Token

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <your-repo-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```properties
BOT_TOKEN=your_telegram_bot_token_here
ALLOWED_CHAT_ID=your_telegram_chat_id
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=mistral-small:24b-instruct-2501-q4_K_M
PERPLEXICA_BASE_URL=http://localhost:3001
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

## Project Structure

```
.
├── .env                 # Environment variables
├── .env.example        # Example environment file
├── server.ts           # Main bot server
├── PerplexicaSearch.ts # Perplexica integration
├── client.ts           # Web client (optional)
└── package.json        # Project dependencies
```

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
