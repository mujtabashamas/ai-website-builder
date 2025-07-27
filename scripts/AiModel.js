import axios from 'axios';
import { createParser } from 'eventsource-parser';

// Configuration for general chat
const generationConfig = {
    model: "v0-1.5-md", // Model for everyday tasks and UI generation
    // temperature: 1,
    // top_p: 0.95,
    // max_tokens: 32000,/
};

// Configuration for code generation
const CodeGenerationConfig = {
    model: "v0-1.5-lg", // Updated to use the large model for advanced reasoning and code generation
    temperature: 0.8, // Slightly lower temperature for more focused outputs
    top_p: 0.95,
    max_tokens: 32000,
    response_format: { type: "json_object" }
};

// Configuration for enhancing prompts
const EnhancePromptConfig = {
    model: "v0-1.5-md",
    // temperature: 0.7,
    // top_p: 0.8,
    // max_tokens: 1000,
    response_format: { type: "json_object" }
};

// Create a chat session wrapper that works with v0 API
class ChatSession {
    constructor(config, history = []) {
        this.config = config;
        this.history = history;
        this.apiKey = 'v1:JrFXTArn07QTGAcIWTyDAIko:Rj1kTPLLjeyPRy97IgdV5HGo'; // API key should be set in environment variables
        this.apiUrl = 'https://api.v0.dev/v1/chat/completions';
    }

    async sendMessage(message, options = {}) {
        try {
            console.log("send");
            // Prepare messages array for the API request
            let messages = [...this.history];

            // Add the user message to history and messages array
            const userMessage = {
                role: "user",
                content: message
            };

            this.history.push(userMessage);
            messages.push(userMessage);

            // Prepare the request payload
            const payload = {
                model: this.config.model,
                messages: messages,
                temperature: this.config.temperature,
                top_p: this.config.top_p,
                max_tokens: this.config.max_tokens,
                stream: options.stream || false
            };

            // Add response format if specified
            if (this.config.response_format) {
                payload.response_format = this.config.response_format;
            }

            // Add tools if provided
            if (options.tools) {
                payload.tools = options.tools;
            }

            // Add tool_choice if provided
            if (options.tool_choice) {
                payload.tool_choice = options.tool_choice;
            }

            // console.log(payload);

            // Make the API request using axios
            const response = await axios({
                method: 'POST',
                url: this.apiUrl,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                data: payload,
                responseType: options.stream ? 'stream' : 'json'
            });

            // If streaming is requested, return the response for stream processing
            if (options.stream) {
                return response;
            }

            // Handle regular response
            const data = response.data;

            // Add the assistant's response to history
            if (data.choices && data.choices[0] && data.choices[0].message) {
                this.history.push(data.choices[0].message);
            }

            // Return in the expected format for compatibility
            return {
                response: {
                    text: () => data.choices[0]?.message?.content || '',
                    raw: data // Return the full response object for advanced usage
                }
            };
        } catch (error) {
            console.error("Error in v0 API request:", error);
            throw error;
        }
    }

    /**
     * Streams a message to the model and processes the response incrementally.
     * @param {string} message - The message to send
     * @param {Object} options - Stream handling options
     * @param {Function} options.onToken - Callback for each token received
     * @param {Function} options.onDone - Callback when stream is complete
     * @param {Array} options.tools - Optional tools array
     * @param {Object} options.tool_choice - Optional tool choice
     */
    async streamMessage(message, { onToken, onDone, tools, tool_choice }) {
        // 1. Get streaming response with axios
        console.log("Stream")
        const response = await this.sendMessage(message, {
            stream: true,
            tools,
            tool_choice,
        });

        // console.log(response);
        // console.log(response.data);
        console.log("starting")

        // Set up timeout handling
        let timeoutId;
        let lastEventTime = Date.now();
        const TIMEOUT_MS = 15000; // 15 seconds timeout

        // Function to reset the timeout
        const resetTimeout = () => {
            lastEventTime = Date.now();
            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                console.log(`No events received in ${TIMEOUT_MS / 1000} seconds, ending stream`);
                if (onDone) onDone(collected);
                // Add to history
                this.history.push({ role: "assistant", content: collected });
                // Force end the stream
                response.data.destroy();
            }, TIMEOUT_MS);
        };

        // 2. Parse the incoming stream
        const decoder = new TextDecoder();
        const parser = createParser({
            onEvent: (event) => {
                // Reset timeout on each event
                resetTimeout();

                // console.log(event.type);
                // console.log(event.data);
                // if (event.type !== "event") return;               // ignore comments
                // if (event.data === "[DONE]") {                    // graceful finish
                //     if (onDone) onDone(collected);
                //     // push full assistant message into history
                //     this.history.push({ role: "assistant", content: collected });
                //     return;
                // }
                try {
                    const json = JSON.parse(event.data);
                    const finish = json.choices[0]?.finish_reason || false;
                    if (finish) {
                        console.log(`Finish Reason: ${finish}`);
                        if (onDone) onDone(collected);
                        this.history.push({ role: "assistant", content: collected });
                        clearTimeout(timeoutId);
                        return;
                    }
                    const text = json.choices?.[0]?.delta?.content ?? "";
                    if (text !== "" && text) {
                        console.log(text);
                        collected += text;
                        onToken(text);
                    }
                } catch (e) {
                    console.error("Error parsing SSE data:", e);
                    console.error("Raw event data:", event.data);
                }
            }
        });

        let collected = "";
        // Start the initial timeout
        resetTimeout();

        // Process the axios stream response
        response.data.on('data', (chunk) => {
            parser.feed(decoder.decode(chunk, { stream: true }));
        });

        // Return a promise that resolves when the stream ends
        return new Promise((resolve, reject) => {
            response.data.on('end', () => {
                clearTimeout(timeoutId);
                if (collected && onDone) onDone(collected);
                resolve();
            });
            response.data.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }
}

// Create chat sessions with different configurations
export const chatSession = new ChatSession(generationConfig);

// Create code generation session with initial prompt
export const GenAiCode = new ChatSession(CodeGenerationConfig, [
    {
        role: "system",
        content: `
  You are an expert Next.js (14/15) + TypeScript + Tailwind CSS engineer.
  You MUST return **only one valid JSON object** – no prose, no markdown fences.
  
  **Hard requirements:**
  1) Always include these files (with full, working code) inside "files": 
     - /package.json  (with scripts: dev, build, start, lint)
     - /tsconfig.json (must set: { "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./*"] } } })
     - /next.config.mjs
     - /postcss.config.mjs (or .js)
     - /tailwind.config.ts (or .js) with content paths: ./app/**/*.{ts,tsx}, ./components/**/*.{ts,tsx}, ./lib/**/*.{ts,tsx}
     - /app/globals.css  (must include @tailwind base; @tailwind components; @tailwind utilities;)
     - /lib/utils.ts exporting: cn(...inputs) using clsx + tailwind-merge
     - /app/layout.tsx
     - /app/page.tsx
     - /.eslintrc.json
     - /.gitignore
     - /README.md
  
  2) Dependencies in /package.json must include (at minimum):
     "next", "react", "react-dom", "tailwindcss", "postcss", "autoprefixer",
     "clsx", "tailwind-merge", "lucide-react"
     (plus any other deps you actually use, e.g. radix-ui, tailwindcss-animate, etc.)
  
  3) Tech rules:
     - Next.js **app directory**, **TypeScript**, **Tailwind CSS**
     - Use the **@/** path alias consistently
     - Organize UI in /components, utilities in /lib
     - Dark mode via Tailwind (class strategy) if theme switching is used
  
  4) **Output schema (strict)**:
  {
    "projectTitle": "",
    "explanation": "",
    "files": {
      "/path/file.ext": { "code": "..." }
    },
    "generatedFiles": [ "/path/file.ext", ... ]
  }
  
  5) Never include anything outside that JSON. If you forgot any required file, regenerate internally and output the full, correct JSON only.
  `
    },
    {
        role: "user",
        content: `
  Create a modern, visually stunning to-do app.
  
  **Return ONLY valid JSON** with this schema:
  {
    "projectTitle": "",
    "explanation": "",
    "files": {
      "/app/page.tsx": { "code": "" }
    },
    "generatedFiles": []
  }
  
  **Must include all mandatory files** listed in the system message:
  - /package.json, /tsconfig.json, /next.config.mjs, /postcss.config.mjs, /tailwind.config.ts|js,
    /app/globals.css, /lib/utils.ts (cn helper), /app/layout.tsx, /app/page.tsx, /.eslintrc.json,
    /.gitignore, /README.md
  
  **Style & UX:**
  - Sophisticated Tailwind UI (responsive, gradients, shadows, animations, hover/focus states, dark mode)
  - Use lucide-react icons when helpful
  - Add a theme switcher if appropriate
  - Use emojis where it improves UX
  - Placeholder images from https://archive.org/download/
  
  Return the **complete code** for every file in "files", and list them again in "generatedFiles".
  `
    }
]);


// Create enhance prompt session
export const enhancePromptSession = new ChatSession(EnhancePromptConfig, [
    {
        role: "system",
        content: "You are an expert at enhancing user prompts to generate better results. Format your responses as JSON. When enhancing prompts for UI generation, emphasize the need for sophisticated Tailwind CSS designs with animations, gradients, responsive layouts, and modern UI patterns. Encourage the use of advanced Tailwind features like group-hover, dark mode, and custom animations."
    }
]);