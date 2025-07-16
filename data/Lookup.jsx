export default {
  SUGGSTIONS: [
    'Create a landing page for web3 domain server provider',
    'Create Todo App',
    'Create a Budget Track App',
    'Create a Login and Signup page',
    "Develop a Task Management App",
    "Create a Fully Responsive Blog Platform",
    "Design a Minimalistic Note-Taking App",
    "Develop a Customizable Landing Page",
    "Develop a Recipe Sharing Platform",
    "Create a Fitness Tracking App",
    "Develop a Personal Finance Management Tool",
    "Create a Language Learning App",
    "Build a Virtual Event Platform",
    "Create a Music Streaming Service"
  ],

  DEFAULT_FILE: {
    '/app/page.tsx': {
      code: `export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-4">Welcome to your Next.js App</h1>
      <p className="text-gray-600">Start building your amazing project!</p>
    </main>
  );
}`
    },
    '/app/layout.tsx': {
      code: `import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
    },
    '/app/globals.css': {
      code: `@tailwind base;
@tailwind components;
@tailwind utilities;`
    },
    '/tailwind.config.js': {
      code: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
}`
    },
    '/postcss.config.js': {
      code: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
};`
    }
  },

  DEPENDANCY: {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.0.0",
    "lucide-react": "latest",
    "@headlessui/react": "^1.7.17",
    "framer-motion": "^10.0.0",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7"
  }
}