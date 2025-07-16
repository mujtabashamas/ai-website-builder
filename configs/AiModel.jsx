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
    max_tokens: 256000,
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
        this.apiKey = process.env.V0_API_KEY || ''; // API key should be set in environment variables
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
        content: "You are an expert Next.js developer with advanced Tailwind CSS skills. Generate code based on the user's request in proper JSON format. Follow these guidelines for all UI components:\n\n1. Use sophisticated Tailwind CSS designs with advanced utility classes\n2. Implement responsive designs that work on mobile, tablet, and desktop\n3. Use gradients, shadows, animations, and transitions for visual appeal\n4. Include hover/focus states and interactive elements\n5. Use modern UI patterns like cards, modals, dropdowns when appropriate\n6. Implement proper spacing, typography hierarchy, and color theory\n7. Use Tailwind's dark mode utilities when appropriate\n8. Incorporate micro-interactions and subtle animations\n9. Use container queries and modern layout techniques\n10. Ensure accessibility with proper ARIA attributes and keyboard navigation\n11. Use Next.js 13+ app directory structure with TypeScript and Tailwind CSS."
    },
    {
        role: "user",
        content: "Create a modern, visually stunning to-do app: Generate a Project in Next.js (app directory, TypeScript, Tailwind CSS) with sophisticated UI. Create multiple components, organizing them in a folder structure.\n\nReturn the response in JSON format with the following schema:\n{\n  \"projectTitle\": \"\",\n  \"explanation\": \"\",\n  \"files\": {\n    \"/app/page.tsx\": { \"code\": \"\" },\n    ...\n  },\n  \"generatedFiles\": []\n}\n\nGenerate a fully structured Next.js 13+ app directory project using TypeScript and Tailwind CSS.\n- Use /app/page.tsx as the main entry point.\n- Add a minimal /app/layout.tsx if missing.\n- Organize components in /components, utilities in /lib, and global styles in /app/globals.css.\n- Include reusable components like buttons, cards, and forms where applicable.\n- Use lucide-react icons if needed for UI enhancement.\n- Do not use Vite, CRA, or src folder.\n\nEnsure the files field contains all the created files, and the generatedFiles field contains the list of generated files.\n\nAdditionally, include an explanation of the project's structure, purpose, and additional instructions:\n- For placeholder images, please use https://archive.org/download/\n- Add Emoji icons whenever needed to give a good user experience\n- The lucide-react library is also available to be imported for modern icons and UI elements\n- Include a theme switcher for light/dark mode if appropriate"
    },
    {
        role: "assistant",
        content: "{\n  \"projectTitle\": \"Next.js To-Do App\",\n  \"explanation\": \"This project creates a modern to-do application using Next.js (app directory, TypeScript) and Tailwind CSS. The application is structured with components organized into a dedicated 'components' folder, and global styles in /app/globals.css. The application allows users to add tasks, mark them as complete, and remove them. Emoji icons are included to enhance the user experience, and lucide-react icons can be used for modern UI elements. Placeholder images can be used from https://archive.org/download/ if needed.\",\n  \"files\": {\n    \"/app/page.tsx\": {\n      \"code\": \"import TodoList from '../components/TodoList';\\nimport AddTodo from '../components/AddTodo';\\n\\nexport default function Page() {\\n  return (\\n    <main className=\\\"flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8\\\">\\n      <h1 className=\\\"text-3xl font-bold mb-4\\\">To-Do List 📝</h1>\\n      <div className=\\\"bg-white p-6 rounded-md shadow-md w-full max-w-md\\\">\\n          <AddTodo />\\n          <TodoList />\\n      </div>\\n    </main>\\n  );\\n}\"\n    },\n    \"/app/layout.tsx\": {\n      \"code\": \"import './globals.css';\\nimport type { ReactNode } from 'react';\\n\\nexport default function RootLayout({ children }: { children: ReactNode }) {\\n  return (\\n    <html lang=\\\"en\\\">\\n      <body>{children}</body>\\n    </html>\\n  );\\n}\"\n    },\n    \"/app/globals.css\": {\n      \"code\": \"@tailwind base;\\n@tailwind components;\\n@tailwind utilities;\"\n    },\n    \"/components/TodoList.tsx\": {\n      \"code\": \"import React, { useState } from 'react';\\n\\ntype Todo = { id: number; text: string; completed: boolean };\\n\\nexport default function TodoList() {\\n  const [todos, setTodos] = useState<Todo[]>([]);\\n\\n  const toggleComplete = (id: number) => {\\n    setTodos(todos.map(todo =>\\n      todo.id === id ? { ...todo, completed: !todo.completed } : todo\\n    ));\\n  };\\n\\n  const removeTodo = (id: number) => {\\n    setTodos(todos.filter(todo => todo.id !== id));\\n  };\\n\\n  return (\\n    <ul className=\\\"mt-4\\\">\\n      {todos.map(todo => (\\n        <li key={todo.id} className=\\\"flex justify-between items-center py-2 border-b border-gray-200\\\">\\n          <span onClick={() => toggleComplete(todo.id)} className={\\\`cursor-pointer flex-1 \\\${todo.completed ? 'line-through text-gray-500' : ''}\\\`}>{todo.text}</span>\\n          <button onClick={() => removeTodo(todo.id)} className=\\\"ml-2 text-red-500 hover:text-red-700 focus:outline-none\\\">❌</button>\\n        </li>\\n      ))}\\n    </ul>\\n  );\\n}\"\n    },\n    \"/components/AddTodo.tsx\": {\n      \"code\": \"import React, { useState } from 'react';\\n\\nexport default function AddTodo() {\\n  const [text, setText] = useState('');\\n  const [todos, setTodos] = useState(() => {\\n    if (typeof window !== 'undefined') {\\n      const savedTodos = localStorage.getItem('todos');\\n      return savedTodos ? JSON.parse(savedTodos) : [];\\n    }\\n    return [];\\n  });\\n\\n  const handleSubmit = (e: React.FormEvent) => {\\n    e.preventDefault();\\n    if(text.trim() === '') return;\\n    const newTodo = { id: Date.now(), text: text, completed: false };\\n    setTodos([...todos, newTodo]);\\n    setText('');\\n  };\\n\\n  return (\\n    <form onSubmit={handleSubmit} className=\\\"flex\\\">\\n      <input\\n        type=\\\"text\\\"\\n        placeholder=\\\"Add a todo...\\\"        value={text}\\n        onChange={(e) => setText(e.target.value)}\\n        className=\\\"border p-2 rounded-l-md flex-1 focus:outline-none focus:ring focus:border-blue-300\\\"\\n      />\\n      <button type=\\\"submit\\\" className=\\\"bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none\\\">➕</button>\\n    </form>\\n  );\\n}\"\n    }\n  },\n  \"generatedFiles\": [\n      \"/app/page.tsx\",\n      \"/app/layout.tsx\",\n      \"/app/globals.css\",\n      \"/components/TodoList.tsx\",\n      \"/components/AddTodo.tsx\"\n  ]\n}"
    }
]);

// Create enhance prompt session
export const enhancePromptSession = new ChatSession(EnhancePromptConfig, [
    {
        role: "system",
        content: "You are an expert at enhancing user prompts to generate better results. Format your responses as JSON. When enhancing prompts for UI generation, emphasize the need for sophisticated Tailwind CSS designs with animations, gradients, responsive layouts, and modern UI patterns. Encourage the use of advanced Tailwind features like group-hover, dark mode, and custom animations."
    }
]);