// LLM Agent POC - Multi-Tool Reasoning
class LLMAgent {
    constructor() {
        this.conversation = [];
        this.llmConfig = null;
        this.isProcessing = false;
        this.tools = this.initializeTools();
        
        this.initializeUI();
        this.bindEvents();
    }

    initializeTools() {
        return [
            {
                type: "function",
                function: {
                    name: "search_web",
                    description: "Search the web using Google Custom Search API to find current information",
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
            },
            {
                type: "function",
                function: {
                    name: "ai_pipe",
                    description: "Use AI Pipe proxy for flexible AI workflows and data processing",
                    parameters: {
                        type: "object",
                        properties: {
                            workflow: {
                                type: "string",
                                description: "Description of the AI workflow or task to execute"
                            },
                            data: {
                                type: "string",
                                description: "Input data for the AI workflow (optional)"
                            }
                        },
                        required: ["workflow"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "execute_js",
                    description: "Execute JavaScript code safely in the browser environment",
                    parameters: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                description: "JavaScript code to execute (use console.log for output)"
                            }
                        },
                        required: ["code"]
                    }
                }
            }
        ];
    }

    initializeUI() {
        this.elements = {
            messagesContainer: document.getElementById('messages-container'),
            messageInput: document.getElementById('message-input'),
            messageForm: document.getElementById('message-form'),
            sendBtn: document.getElementById('send-btn'),
            configureLlmBtn: document.getElementById('configure-llm-btn'),
            clearChatBtn: document.getElementById('clear-chat-btn'),
            statusBar: document.getElementById('status-bar'),
            modelStatus: document.getElementById('model-status'),
            llmConfigModal: document.getElementById('llm-config-modal'),
            saveConfigBtn: document.getElementById('save-config-btn'),
            llmProviderContainer: document.getElementById('llm-provider-container'),
            alertContainer: document.getElementById('alert-container')
        };
    }

    bindEvents() {
        // Message form submission
        this.elements.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserMessage();
        });

        // Enter key handling for textarea
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserMessage();
            }
        });

        // Configure LLM button
        this.elements.configureLlmBtn.addEventListener('click', () => {
            this.showLLMConfigModal();
        });

        // Save LLM configuration
        this.elements.saveConfigBtn.addEventListener('click', () => {
            this.saveLLMConfiguration();
        });

        // Clear chat button
        this.elements.clearChatBtn.addEventListener('click', () => {
            this.clearConversation();
        });
    }

    showLLMConfigModal() {
        // Initialize bootstrap-llm-provider
        this.elements.llmProviderContainer.innerHTML = '<div id="llm-provider"></div>';
        
        // Create LLM provider interface
        if (typeof bootstrapLLMProvider !== 'undefined') {
            bootstrapLLMProvider.create({
                container: '#llm-provider',
                providers: ['openai', 'openrouter', 'groq', 'anthropic'],
                defaultProvider: 'openai'
            });
        } else {
            this.elements.llmProviderContainer.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Note:</strong> Using simplified configuration. In production, use bootstrap-llm-provider.
                </div>
                <div class="mb-3">
                    <label class="form-label">Provider</label>
                    <select class="form-control" id="simple-provider">
                        <option value="openai">OpenAI</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">API Key</label>
                    <input type="password" class="form-control" id="simple-api-key" placeholder="Enter your API key">
                </div>
                <div class="mb-3">
                    <label class="form-label">Model</label>
                    <input type="text" class="form-control" id="simple-model" value="gpt-3.5-turbo" placeholder="Model name">
                </div>
            `;
        }

        // Show modal
        const modal = new bootstrap.Modal(this.elements.llmConfigModal);
        modal.show();
    }

    saveLLMConfiguration() {
        try {
            // Try bootstrap-llm-provider first
            if (typeof bootstrapLLMProvider !== 'undefined' && bootstrapLLMProvider.getConfig) {
                this.llmConfig = bootstrapLLMProvider.getConfig();
            } else {
                // Fallback to simple configuration
                const provider = document.getElementById('simple-provider').value;
                const apiKey = document.getElementById('simple-api-key').value;
                const model = document.getElementById('simple-model').value;

                if (!apiKey) {
                    this.showAlert('Please enter an API key', 'warning');
                    return;
                }

                this.llmConfig = {
                    provider,
                    apiKey,
                    model,
                    baseUrl: this.getBaseUrl(provider)
                };
            }

            this.elements.modelStatus.textContent = `${this.llmConfig.provider} - ${this.llmConfig.model}`;
            this.elements.statusBar.classList.remove('hidden');

            // Hide modal
            const modal = bootstrap.Modal.getInstance(this.elements.llmConfigModal);
            modal.hide();

            this.showAlert('LLM configuration saved successfully!', 'success');
        } catch (error) {
            this.showAlert(`Configuration error: ${error.message}`, 'danger');
        }
    }

    getBaseUrl(provider) {
        const urls = {
            'openai': 'https://api.openai.com/v1',
            'openrouter': 'https://openrouter.ai/api/v1',
            'groq': 'https://api.groq.com/openai/v1'
        };
        return urls[provider] || urls.openai;
    }

    async handleUserMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        if (!this.llmConfig) {
            this.showAlert('Please configure an LLM provider first', 'warning');
            return;
        }

        // Clear input and disable send button
        this.elements.messageInput.value = '';
        this.setProcessingState(true);

        // Add user message to conversation
        this.addMessage('user', message);
        this.conversation.push({ role: 'user', content: message });

        // Start the agent reasoning loop
        await this.agentLoop();
    }

    async agentLoop() {
        try {
            let needsUserInput = false;
            
            while (!needsUserInput) {
                // Call LLM with current conversation and tools
                const response = await this.callLLM(this.conversation, this.tools);
                
                if (response.content) {
                    this.addMessage('agent', response.content);
                }

                if (response.tool_calls && response.tool_calls.length > 0) {
                    // Execute tool calls
                    for (const toolCall of response.tool_calls) {
                        await this.handleToolCall(toolCall);
                    }
                } else {
                    // No tool calls, wait for user input
                    needsUserInput = true;
                }
            }
        } catch (error) {
            this.showAlert(`Agent error: ${error.message}`, 'danger');
            this.addMessage('system', `Error: ${error.message}`);
        } finally {
            this.setProcessingState(false);
        }
    }

    async callLLM(messages, tools) {
        this.showLoadingIndicator();

        const payload = {
            model: this.llmConfig.model,
            messages: messages,
            tools: tools,
            tool_choice: 'auto',
            max_tokens: 1500,
            temperature: 0.7
        };

        const response = await fetch(`${this.llmConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.llmConfig.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const message = data.choices[0].message;

        // Add assistant message to conversation
        this.conversation.push({
            role: 'assistant',
            content: message.content,
            tool_calls: message.tool_calls
        });

        this.hideLoadingIndicator();
        return message;
    }

    async handleToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        
        this.showToolCall(toolCall);
        
        try {
            let result;
            
            switch (name) {
                case 'search_web':
                    result = await this.searchWeb(JSON.parse(args));
                    break;
                case 'ai_pipe':
                    result = await this.aiPipe(JSON.parse(args));
                    break;
                case 'execute_js':
                    result = await this.executeJS(JSON.parse(args));
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            this.showToolResult(toolCall.id, result, false);
            
            // Add tool result to conversation
            this.conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
            });

        } catch (error) {
            const errorMsg = `Tool execution failed: ${error.message}`;
            this.showToolResult(toolCall.id, errorMsg, true);
            
            this.conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: errorMsg
            });
        }
    }

    async searchWeb({ query }) {
        // Simulate web search (in production, use actual Google Custom Search API)
        await this.delay(1000);
        
        return `Search results for "${query}":

1. **${query} - Official Website**
   Comprehensive information about ${query}, including history, services, and current developments.
   
2. **${query} News - Latest Updates** 
   Recent news and announcements related to ${query} from various sources.
   
3. **${query} Wikipedia**
   Detailed encyclopedia entry covering background, operations, and notable facts about ${query}.

*Note: This is a simulated search result. In production, integrate with Google Custom Search API.*`;
    }

    async aiPipe({ workflow, data = '' }) {
        // Simulate AI Pipe workflow (in production, use actual aipipe.org API)
        await this.delay(1500);
        
        return `AI Pipe Workflow: "${workflow}"
Input Data: ${data || 'None provided'}

Processed Result: This is a simulated AI workflow result. The system would normally process the request through various AI models and return structured data based on the workflow description.

*Note: This is a simulated result. In production, integrate with aipipe.org proxy API.*`;
    }

    async executeJS({ code }) {
        const outputElement = document.createElement('div');
        outputElement.className = 'code-output';
        
        // Capture console output
        const originalLog = console.log;
        let consoleOutput = '';
        
        console.log = (...args) => {
            consoleOutput += args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ') + '\n';
            originalLog.apply(console, args);
        };

        try {
            // Execute the code
            const result = eval(code);
            
            // Restore console.log
            console.log = originalLog;
            
            let output = '';
            if (consoleOutput) {
                output += `Console Output:\n${consoleOutput}`;
            }
            if (result !== undefined) {
                output += `${output ? '\n\n' : ''}Return Value:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
            }
            
            return output || 'Code executed successfully (no output)';
            
        } catch (error) {
            console.log = originalLog;
            throw new Error(`JavaScript execution error: ${error.message}`);
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${role}`;
        
        const avatar = role === 'user' ? 'U' : (role === 'agent' ? 'A' : 'S');
        const roleName = role === 'user' ? 'You' : (role === 'agent' ? 'Agent' : 'System');
        
        messageDiv.innerHTML = `
            <div class="message__header">
                <div class="message__avatar">${avatar}</div>
                <span>${roleName}</span>
                <small>${new Date().toLocaleTimeString()}</small>
            </div>
            <div class="message__content">
                ${this.formatMessageContent(content)}
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showToolCall(toolCall) {
        const toolDiv = document.createElement('div');
        toolDiv.className = 'tool-call';
        toolDiv.id = `tool-${toolCall.id}`;
        
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        let icon;
        switch (toolName) {
            case 'search_web': icon = '🔍'; break;
            case 'ai_pipe': icon = '🤖'; break;
            case 'execute_js': icon = '⚡'; break;
            default: icon = '🔧';
        }
        
        toolDiv.innerHTML = `
            <div class="tool-call__header">
                <span class="tool-call__icon">${icon}</span>
                <span class="tool-call__name">${toolName}</span>
            </div>
            <div class="tool-call__params">
                ${Object.entries(toolArgs).map(([key, value]) => 
                    `<strong>${key}:</strong> ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`
                ).join('<br>')}
            </div>
            <div class="loading-indicator">
                <span>Executing tool...</span>
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(toolDiv);
        this.scrollToBottom();
    }

    showToolResult(toolId, result, isError = false) {
        const toolDiv = document.getElementById(`tool-${toolId}`);
        if (!toolDiv) return;
        
        const loadingIndicator = toolDiv.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        const resultDiv = document.createElement('div');
        resultDiv.className = `tool-call__result ${isError ? 'tool-call__error' : ''}`;
        resultDiv.textContent = result;
        
        toolDiv.appendChild(resultDiv);
        this.scrollToBottom();
    }

    showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.id = 'agent-loading';
        loadingDiv.innerHTML = `
            <span>Agent is thinking...</span>
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
        
        this.elements.messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    hideLoadingIndicator() {
        const loadingDiv = document.getElementById('agent-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    formatMessageContent(content) {
        return content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        this.elements.sendBtn.disabled = processing;
        this.elements.messageInput.disabled = processing;
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            const conversationArea = document.getElementById('conversation-area');
            conversationArea.scrollTop = conversationArea.scrollHeight;
        });
    }

    clearConversation() {
        this.conversation = [];
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message card">
                <div class="card__body">
                    <h5 class="mb-3">Welcome to the LLM Agent POC!</h5>
                    <p class="mb-2">This agent can use multiple tools to help you:</p>
                    <ul class="mb-3">
                        <li><strong>Web Search:</strong> Find current information online</li>
                        <li><strong>AI Workflows:</strong> Process data through AI pipelines</li>
                        <li><strong>Code Execution:</strong> Run JavaScript code safely</li>
                    </ul>
                    <p class="mb-0">
                        <strong>Getting Started:</strong> Configure your LLM provider above, then ask me anything!
                    </p>
                </div>
            </div>
        `;
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        this.elements.alertContainer.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.llmAgent = new LLMAgent();
});