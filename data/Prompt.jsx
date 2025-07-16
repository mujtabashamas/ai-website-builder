import dedent from 'dedent';

export default {
    CHAT_PROMPT: dedent`
    'You are an AI Assistant and experienced in React Development.
    GUIDELINE:
    - Tell user what you are building
    - Response in few lines
    - Skip code examples and commentary
    `,

    CODE_GEN_PROMPT: dedent`
    Generate a fully structured Next.js app directory project using TypeScript and Tailwind CSS.
Ensure the project follows best practices in component organization and styling for Next.js 13+ (app router).

**Project Requirements:**
- Use **Next.js** as the framework with the **app directory**.
- Use **TypeScript** (.tsx, .ts files only).
- Use **Tailwind CSS** for styling and create a modern, visually appealing UI.
- Organize components in **/components**, utilities in **/lib**, and global styles in **/app/globals.css**.
- Main entry point should be **/app/page.tsx**. Add a minimal **/app/layout.tsx** if missing.
- Include reusable components like **buttons, cards, and forms** where applicable.
- Use **lucide-react** icons if needed for UI enhancement.
- Do not use Vite, CRA, or src folder.

**Image Handling Guidelines:**
- Use royalty-free image sources (e.g., Pexels, Pixabay) or placeholder images from https://archive.org/download/.

**Dependencies to Use:**
- "next": "^14.0.0"
- "react": "^18.0.0"
- "react-dom": "^18.0.0"
- "tailwindcss": "^3.4.1"
- "postcss": "^8"
- "autoprefixer": "^10.0.0"
- "lucide-react": "latest"
- "@headlessui/react": "^1.7.17"
- "framer-motion": "^10.0.0"
- "tailwind-merge": "^2.4.0"
- "tailwindcss-animate": "^1.0.7"

Return the response in JSON format with the following schema:
{
  "projectTitle": "",
  "explanation": "",
  "files": {
    "/app/page.tsx": { "code": "" },
    ...
  },
  "generatedFiles": []
}

Additionally, include an explanation of the project's structure, purpose, and additional instructions:
- For placeholder images use appropriate URLs.
- Add external images if needed.
- The lucide-react library is also available to be imported IF NECESSARY.
- Update the package.json file with the required dependencies.
- Do not use backend or database related.
    `,
    
    ENHANCE_PROMPT_RULES: dedent`
    You are a prompt enhancement expert and website designer(React + vite). Your task is to improve the given user prompt by:
    1. Making it more specific and detailed but..
    2. Including clear requirements and constraints
    3. Maintaining the original intent of the prompt
    4. Using clear and precise language
    5. Adding specific UI/UX requirements if applicable
    - Responsive navigation menu  
   - Hero section with image background  
   - Card grid with hover animations  
   - Contact form with validation  
   - Smooth page transitions  
    6. Dont use the backend or database related.
    7. Keep it less than 300 words
    

    Return only the enhanced prompt as plain text without any JSON formatting or additional explanations.
    `
}
