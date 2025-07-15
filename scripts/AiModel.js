// Import required libraries
import axios from 'axios';
import { createParser } from 'eventsource-parser';

// Configuration for general chat
const generationConfig = {
    model: "v0-1.5-md", // Model for everyday tasks and UI generation
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
};

// Configuration for code generation
const CodeGenerationConfig = {
    model: "v0-1.5-lg", // Updated to use the large model for advanced reasoning and code generation
    temperature: 0.8, // Slightly lower temperature for more focused outputs
    top_p: 0.95,
    max_tokens: 20000,
    response_format: { type: "json_object" }
};

// Configuration for enhancing prompts
const EnhancePromptConfig = {
    model: "v0-1.5-md",
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 1000,
    response_format: { type: "json_object" }
};

// Create a chat session wrapper that works with v0 API
class ChatSession {
    constructor(config, history = []) {
        this.config = config;
        this.history = history;
        this.apiKey = process.env.V0_API_KEY || 'v1:JrFXTArn07QTGAcIWTyDAIko:Rj1kTPLLjeyPRy97IgdV5HGo'; // API key should be set in environment variables
        this.apiUrl = 'https://api.v0.dev/v1/chat/completions';
    }

    async sendMessage(message, options = {}) {
        try {
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

            // Make the API request using axios
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Handle streaming response
            if (options.stream) {
                // For streaming, use the streamMessage method
                return await this.streamMessage(message, options);
            }

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
     * Stream a chat completion response from the v0 API.
     * @param {string|object} message - The user message (string or multimodal array)
     * @param {object} options - Optional: tools, tool_choice, and other API options
     * @returns {Promise<Response>} - A Response object with a ReadableStream of the streamed content
     */
    async streamMessage(message, options = {}) {
        // Prepare messages array for the API request
        let messages = [...this.history];
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
            stream: true // Always stream
        };
        if (this.config.response_format) {
            payload.response_format = this.config.response_format;
        }
        if (options.tools) {
            payload.tools = options.tools;
        }
        if (options.tool_choice) {
            payload.tool_choice = options.tool_choice;
        }
        // Make the API request using axios with responseType: 'stream'
        const response = await axios({
            method: 'post',
            url: this.apiUrl,
            data: payload,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const parser = createParser({
                    onEvent(event) {
                        if (event.type === 'event') {
                            try {
                                console.log(event);
                                const data = JSON.parse(event.data);
                                const text = data.choices[0]?.delta?.content || '';
                                if (text) {
                                    controller.enqueue(encoder.encode(text));
                                }
                            } catch (e) {/* Ignore parse errors */ }
                        }
                    }
                });
                for await (const chunk of response.data) {
                    parser.feed(chunk.toString());
                }
                controller.close();
            }
        });
        return new Response(stream);
    }
}


// Create chat sessions with different configurations
export const chatSession = new ChatSession(generationConfig);

// Create code generation session with initial prompt
export const GenAiCode = new ChatSession(CodeGenerationConfig, [
    {
        role: "system",
        content: "You are an expert React developer with advanced Tailwind CSS skills. Generate code based on the user's request in proper JSON format. Follow these guidelines for all UI components:\n\n1. Use sophisticated Tailwind CSS designs with advanced utility classes\n2. Implement responsive designs that work on mobile, tablet, and desktop\n3. Use gradients, shadows, animations, and transitions for visual appeal\n4. Include hover/focus states and interactive elements\n5. Use modern UI patterns like cards, modals, dropdowns when appropriate\n6. Implement proper spacing, typography hierarchy, and color theory\n7. Use Tailwind's dark mode utilities when appropriate\n8. Incorporate micro-interactions and subtle animations\n9. Use container queries and modern layout techniques\n10. Ensure accessibility with proper ARIA attributes and keyboard navigation"
    },
    {
        role: "user",
        content: "Create a modern, visually stunning to-do app: Generate a Project in React with sophisticated UI. Create multiple components, organizing them in a folder structure.\n\n    Return the response in JSON format with the following schema:\n    {\n      \"projectTitle\": \"\",\n      \"explanation\": \"\",\n      \"files\": {\n        \"/App.js\": {\n          \"code\": \"\"\n        },\n        ...\n      },\n      \"generatedFiles\": []\n    }\n\n    Generate a programming code structure for a React project using Vite.\n    Do not create a App.jsx file. There is a App.js file in the project structure, rewrite it.\n    Use Tailwind CSS for styling with these advanced requirements:\n\n    1. Create a visually stunning UI with gradient backgrounds, shadows, and animations\n    2. Implement responsive design that works on mobile, tablet, and desktop\n    3. Use advanced Tailwind features like group-hover, dark mode, and custom animations\n    4. Add micro-interactions for better user experience (hover effects, transitions, etc.)\n    5. Implement a modern card-based design with proper spacing and typography\n    6. Use a sophisticated color palette with proper contrast and visual hierarchy\n    7. Add loading states and transitions between UI states\n    8. Implement proper form validation with visual feedback\n    9. Use container queries and modern layout techniques\n    10. Ensure accessibility with proper ARIA attributes\n\n    Return the response in JSON format with the following schema:\n\n    {\n      \"projectTitle\": \"\",\n      \"explanation\": \"\",\n      \"files\": {\n        \"/App.js\": {\n          \"code\": \"\"\n        },\n        ...\n      },\n      \"generatedFiles\": []\n    }\n\n    Ensure the files field contains all the created files, and the generatedFiles field contains the list of generated files.\n    \n    Additionally, include an explanation of the project's structure, purpose, and additional instructions:\n    - For placeholder images, please use https://archive.org/download/\n    - Add Emoji icons whenever needed to give a good user experience\n    - The lucide-react library is also available to be imported for modern icons and UI elements\n    - Include a theme switcher for light/dark mode if appropriate"
    },
    {
        role: "assistant",
        content: "{\n  \"projectTitle\": \"React To-Do App\",\n  \"explanation\": \"This project creates a simple to-do application using React and Tailwind CSS. The application is structured with components organized into a dedicated 'components' folder. This structure promotes code reusability and maintainability. The application will allow users to add tasks to a list, mark them as complete, and remove them. Emoji icons are included to enhance the user experience, but lucide-react icons are not needed for this implementation. The placeholder images will be used for user profile for example (not this case).\",\n  \"files\": {\n    \"/App.js\": {\n      \"code\": \"import React from 'react';\\nimport TodoList from './components/TodoList';\\nimport AddTodo from './components/AddTodo';\\n\\nfunction App() {\\n  return (\\n    <div className=\\\"bg-gray-100 min-h-screen flex flex-col items-center\\\">\\n      <h1 className=\\\"text-3xl font-bold text-center mt-8 mb-4\\\">To-Do List 📝</h1>\\n      <div className=\\\"bg-white p-6 rounded-md shadow-md w-full max-w-md\\\">\\n          <AddTodo />\\n          <TodoList />\\n      </div>\\n    </div>\\n  );\\n}\\n\\nexport default App;\"\n    },\n    \"/components/TodoList.js\": {\n      \"code\": \"import React, { useState, useEffect } from 'react';\\n\\nfunction TodoList() {\\n  const [todos, setTodos] = useState(() => {\\n    const savedTodos = localStorage.getItem('todos');\\n    return savedTodos ? JSON.parse(savedTodos) : [];\\n  });\\n\\n  useEffect(() => {\\n    localStorage.setItem('todos', JSON.stringify(todos));\\n  }, [todos]);\\n\\n  const toggleComplete = (id) => {\\n    setTodos(todos.map(todo =>\\n      todo.id === id ? { ...todo, completed: !todo.completed } : todo\\n    ));\\n  };\\n\\n  const removeTodo = (id) => {\\n    setTodos(todos.filter(todo => todo.id !== id));\\n  };\\n\\n  return (\\n    <ul className=\\\"mt-4\\\">\\n      {todos.map(todo => (\\n        <li key={todo.id} className={`flex justify-between items-center py-2 border-b border-gray-200 ${todo.completed ? 'line-through text-gray-500' : ''}`}>\\n          <span onClick={() => toggleComplete(todo.id)} className=\\\"cursor-pointer flex-1\\\">{todo.text}</span>\\n          <div>\\n            <button onClick={() => removeTodo(todo.id)} className=\\\"ml-2 text-red-500 hover:text-red-700 focus:outline-none\\\">❌</button>\\n          </div>\\n        </li>\\n      ))}\\n    </ul>\\n  );\\n}\\n\\nexport default TodoList;\"\n    },\n    \"/components/AddTodo.js\": {\n      \"code\": \"import React, { useState } from 'react';\\n\\nfunction AddTodo() {\\n  const [text, setText] = useState('');\\n  const [todos, setTodos] = useState(() => {\\n    const savedTodos = localStorage.getItem('todos');\\n    return savedTodos ? JSON.parse(savedTodos) : [];\\n  });\\n\\n  const handleSubmit = (e) => {\\n    e.preventDefault();\\n    if(text.trim() === '') return;\\n    const newTodo = { id: Date.now(), text: text, completed: false };\\n    setTodos([...todos, newTodo]);\\n    setText('');\\n  };\\n\\n  return (\\n    <form onSubmit={handleSubmit} className=\\\"flex\\\">\\n      <input\\n        type=\\\"text\\\"\\n        placeholder=\\\"Add a todo...\\\"        value={text}\\n        onChange={(e) => setText(e.target.value)}\\n        className=\\\"border p-2 rounded-l-md flex-1 focus:outline-none focus:ring focus:border-blue-300\\\"\\n      />\\n      <button type=\\\"submit\\\" className=\\\"bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none\\\">➕</button>\\n    </form>\\n  );\\n}\\n\\nexport default AddTodo;\"\n    }\n  },\n  \"generatedFiles\": [\n      \"/App.js\",\n      \"/components/TodoList.js\",\n      \"/components/AddTodo.js\"\n  ]\n}"
    }
]);

// Create enhance prompt session
export const enhancePromptSession = new ChatSession(EnhancePromptConfig, [
    {
        role: "system",
        content: "You are an expert at enhancing user prompts to generate better results. Format your responses as JSON. When enhancing prompts for UI generation, emphasize the need for sophisticated Tailwind CSS designs with animations, gradients, responsive layouts, and modern UI patterns. Encourage the use of advanced Tailwind features like group-hover, dark mode, and custom animations."
    }
]);

// Example usage:

// Basic text completion
// const result = await chatSession.sendMessage("Create a landing page for a SaaS product");
// console.log(result.response.text());

// Using streaming for real-time responses
// const streamResponse = await chatSession.sendMessage("Generate a React component", { stream: true });
// For streaming, you would process the response like this:
// const reader = streamResponse.body.getReader();
// while (true) {
//   const { done, value } = await reader.read();
//   if (done) break;
//   const chunk = new TextDecoder().decode(value);
//   console.log(chunk); // Process each chunk of text as it arrives
// }

// Multimodal input (text + image)
// To send an image with text:
// const imageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZ..."; // Base64 encoded image
// const multimodalMessage = [
//   { type: "text", text: "What's in this image?" },
//   { type: "image_url", image_url: { url: imageBase64 } }
// ];
// const result = await chatSession.sendMessage(multimodalMessage);
// console.log(result.response.text());

// Using function/tool calls
// const tools = [
//   {
//     type: "function",
//     function: {
//       name: "get_weather",
//       description: "Get the current weather",
//       parameters: {
//         type: "object",
//         properties: {
//           location: { type: "string", description: "City name" },
//           unit: { type: "string", enum: ["celsius", "fahrenheit"] }
//         },
//         required: ["location"]
//       }
//     }
//   }
// ];
// const result = await chatSession.sendMessage("What's the weather in San Francisco?", { tools });
// console.log(result.response.raw); // Check for tool_calls in the response
