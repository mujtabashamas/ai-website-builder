import OpenAI from "openai";

// Initialize OpenAI client
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: apiKey,
});

// Configuration for general chat
const generationConfig = {
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
};

// Configuration for code generation
const CodeGenerationConfig = {
    temperature: 0.8, // Slightly lower temperature for more focused outputs
    top_p: 0.95,
    max_tokens: 10192,
    response_format: { type: "json_object" }
};

// Configuration for enhancing prompts
const EnhancePromptConfig = {
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 1000,
    response_format: { type: "json_object" }
};

// Create a chat session wrapper that mimics the Gemini API interface
class ChatSession {
    constructor(config, history = []) {
        this.config = config;
        this.history = history;
    }

    async sendMessage(message) {
        try {
            const messages = [...this.history];
            
            // Handle different message formats
            if (Array.isArray(message)) {
                // If message is an array, join it into a single string
                const joinedMessage = message.join('\n\n');
                messages.push({
                    role: "user",
                    content: joinedMessage
                });
            } else {
                // Normal string message
                messages.push({
                    role: "user",
                    content: message
                });
            }

            const response = await openai.chat.completions.create({
                model: "gpt-4o", // Use gpt-4o (OpenAI's latest, sometimes referred to as gpt-4.1)
                messages,
                temperature: this.config.temperature,
                top_p: this.config.top_p,
                max_tokens: this.config.max_tokens,
                ...(this.config.response_format && { response_format: this.config.response_format })
            });

            // Add the assistant's response to the history
            const assistantMessage = {
                role: "assistant",
                content: response.choices[0].message.content
            };

            this.history.push({
                role: "user",
                content: message
            });

            this.history.push(assistantMessage);

            // Create a response object that matches the Gemini API interface
            return {
                response: {
                    text: () => response.choices[0].message.content
                }
            };
        } catch (error) {
            console.error("Error in OpenAI request:", error);
            console.error(error?.response?.data);
            throw error;
        }
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
// const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
// console.log(result.response.text());
