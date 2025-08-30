# LLM Agent Proof-of-Concept: Browser-Based Multi-Tool Reasoning

A minimal JavaScript-based LLM agent that demonstrates how modern AI can dynamically use external tools to accomplish complex tasks. This proof-of-concept runs entirely in the browser and showcases the power of function calling with iterative reasoning loops.

## 🎯 What This Does

This agent can:
- Take user input and understand complex requests
- Automatically decide which tools to use based on context
- Search the web for current information
- Execute JavaScript code safely in the browser
- Use AI workflows through proxy APIs
- Chain multiple tools together to solve complex problems
- Maintain conversation context throughout the entire interaction

## 🚀 Live Demo

The application is deployed and ready to use - just open it in any modern web browser and configure your LLM provider to get started.

## 🏗️ Core Architecture

### The Agent Loop

The heart of this system is the iterative reasoning loop, translated from Python to JavaScript:

```python
# Original Python concept
def loop(llm):
    msg = [user_input()]  # Start with user input
    while True:
        output, tool_calls = llm(msg, tools)  # Send conversation + tools to LLM
        print("Agent: ", output)  # Display LLM response
        if tool_calls:  # If LLM wants to use tools
            msg += [handle_tool_call(tc) for tc in tool_calls]  # Execute tools
        else:
            msg.append(user_input())  # Get next user input
```

### JavaScript Implementation

```javascript
async function agentLoop() {
    while (true) {
        // Send conversation + available tools to LLM
        const response = await this.callLLM(this.conversation, this.tools);
        
        if (response.tool_calls && response.tool_calls.length > 0) {
            // Execute tool calls and add results to conversation
            for (const toolCall of response.tool_calls) {
                const result = await this.executeToolCall(toolCall);
                this.conversation.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            }
            // Continue loop with updated conversation
        } else {
            // Display response and wait for user input
            this.displayMessage(response.content, 'assistant');
            break;
        }
    }
}
```

## 🛠️ Tool Integrations

### 1. Web Search (`search_web`)
```javascript
{
    name: "search_web",
    description: "Search the web using Google Custom Search API",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query to find relevant web content"
            }
        },
        required: ["query"]
    }
}
```

**Implementation**: Uses Google Custom Search JSON API to fetch real-time web results.

### 2. AI Workflows (`ai_pipe`)
```javascript
{
    name: "ai_pipe",
    description: "Use AI Pipe proxy for flexible AI workflows",
    parameters: {
        type: "object",
        properties: {
            workflow: {
                type: "string", 
                description: "Description of the AI workflow to execute"
            }
        },
        required: ["workflow"]
    }
}
```

**Implementation**: Connects to aipipe.org proxy for advanced AI processing workflows.

### 3. Code Execution (`execute_js`)
```javascript
{
    name: "execute_js",
    description: "Execute JavaScript code safely in browser",
    parameters: {
        type: "object",
        properties: {
            code: {
                type: "string",
                description: "JavaScript code to execute"
            }
        },
        required: ["code"]
    }
}
```

**Implementation**: Uses `eval()` with try-catch for basic sandboxing and error handling.

## 📁 Project Structure

```
llm-agent-poc/
├── index.html          # Main HTML structure
├── style.css           # High-contrast CSS styling
├── app.js              # Core agent logic and UI
└── README.md          # This documentation
```

### Key Components

**LLMAgent Class**: Main orchestrator that handles conversation flow, tool execution, and UI updates.

**Tool System**: OpenAI-compatible function calling interface that allows the LLM to dynamically choose and use tools.

**UI Components**: Bootstrap-based interface with conversation display, model selection, and error handling.

## 🔧 Setup Instructions

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- LLM API access (OpenAI, OpenRouter, Ollama, etc.)

### Quick Start

1. **Open the Application**: Load `index.html` in your browser
2. **Configure LLM Provider**: Click "Configure LLM" and select your provider
3. **Enter API Details**: Add your API key and choose a model
4. **Start Chatting**: Type a message that requires tool usage

### API Keys Required

- **Google Custom Search**: For web search functionality
  - Get API key from Google Cloud Console
  - Create Custom Search Engine ID
- **LLM Provider**: OpenAI, OpenRouter, or other compatible service
- **AI Pipe**: Optional for advanced AI workflows

### Environment Setup

```javascript
// Example configuration
const config = {
    llm: {
        provider: "openai",
        apiKey: "your-api-key-here",
        model: "gpt-3.5-turbo"
    },
    googleSearch: {
        apiKey: "your-google-api-key",
        searchEngineId: "your-search-engine-id"
    }
};
```

## 🎨 Customization Guide

### Adding New Tools

1. **Define Tool Schema**:
```javascript
const newTool = {
    type: "function",
    function: {
        name: "my_custom_tool",
        description: "What this tool does",
        parameters: {
            type: "object",
            properties: {
                input: {
                    type: "string",
                    description: "Input parameter"
                }
            },
            required: ["input"]
        }
    }
};
```

2. **Implement Tool Handler**:
```javascript
async executeMyCustomTool(args) {
    try {
        // Your tool logic here
        const result = await processData(args.input);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

3. **Register Tool**: Add to `this.tools` array and tool execution switch statement.

### Styling Modifications

The CSS uses high-contrast colors for maximum readability. To customize:

```css
:root {
    --primary-bg: #ffffff;
    --text-color: #212529;
    --border-color: #dee2e6;
    --accent-color: #0d6efd;
}
```

### LLM Provider Integration

The app uses bootstrap-llm-provider for easy provider switching:

```javascript
// Supports multiple providers
const providers = [
    "openai",
    "openrouter", 
    "ollama",
    "anthropic",
    "google"
];
```

## 🔍 How It Works: Step by Step

### Example Conversation Flow

1. **User Input**: "Search for information about IBM and create a summary"

2. **LLM Analysis**: The model analyzes the request and decides to use the search tool

3. **Tool Call**: 
```json
{
    "name": "search_web",
    "arguments": {
        "query": "IBM company information history business"
    }
}
```

4. **Tool Execution**: Fetches real search results from Google

5. **Result Integration**: Search results are added to conversation context

6. **Final Response**: LLM generates comprehensive summary using search data

7. **Continuation**: User can ask follow-up questions with full context

## 🚧 Technical Considerations

### Security
- **Code Execution**: Basic sandboxing with try-catch (production apps need stronger isolation)
- **API Keys**: Stored in browser memory only (implement secure storage for production)
- **CORS**: May require proxy servers for some APIs

### Performance
- **Rate Limiting**: Implement delays between API calls
- **Caching**: Consider caching search results and tool outputs
- **Streaming**: LLM responses can be streamed for better UX

### Error Handling
```javascript
try {
    const result = await this.executeToolCall(toolCall);
    // Handle success
} catch (error) {
    this.showAlert(`Tool execution failed: ${error.message}`, 'danger');
    // Graceful degradation
}
```

## 🔮 Extension Ideas

### Additional Tools
- **File Upload/Analysis**: Process documents and images
- **Database Queries**: Connect to external databases
- **API Integrations**: Weather, news, social media APIs
- **Image Generation**: DALL-E, Midjourney integration
- **Email/Calendar**: Productivity tool integration

### Advanced Features
- **Conversation Persistence**: Save/load chat history
- **Multi-Agent Coordination**: Multiple specialized agents
- **Workflow Builder**: Visual tool for creating agent workflows
- **Plugin System**: Easy third-party tool integration
- **Voice Interface**: Speech-to-text and text-to-speech

### Production Enhancements
- **Authentication**: User accounts and API key management
- **Usage Analytics**: Track tool usage and costs
- **Rate Limiting**: Prevent API abuse
- **Monitoring**: Error tracking and performance metrics

## 🤝 Contributing

This is a minimal proof-of-concept designed for maximum hackability. Feel free to:
- Fork and extend the functionality
- Add new tools and integrations
- Improve the UI/UX
- Share your modifications and improvements

## 📚 Learning Resources

### OpenAI Function Calling
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Function Calling Best Practices](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models)

### Related Projects
- [LangChain Agents](https://python.langchain.com/docs/modules/agents/)
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)
- [AgentGPT](https://github.com/reworkd/AgentGPT)

### API Documentation
- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
- [Bootstrap 5 Components](https://getbootstrap.com/docs/5.3/components/)

## ⚖️ License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute as needed.

---

**Built with ❤️ for the AI community - demonstrating how simple, powerful agent architectures can be implemented in just a few hundred lines of code.**