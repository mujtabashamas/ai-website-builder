'use client'
import { useEffect } from 'react';
import sdk from '@stackblitz/sdk';

export default function NextPreview() {
  useEffect(() => {
    sdk.embedProject(
      'stackblitz-container',
      {
        template: 'javascript',
        files: {
          'app/page.js': {
            content: `export default function Page() { return <h1>Hello Next.js!</h1>; }`,
          },
          'app/layout.js': {
            content: `export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }`,
          },
          'app/globals.css': { content: `@tailwind base; @tailwind components; @tailwind utilities;` },
          'tailwind.config.js': {
            content: `module.exports = { content:['./app/**/*.{js,ts,jsx,tsx}'], theme:{extend:{}}, plugins:[] }`,
          },
          'package.json': {
            content: JSON.stringify({
              dependencies: {
                next: '^14.0.0',
                react: '^18.0.0',
                'react-dom': '^18.0.0',
                tailwindcss: '^3.4.1',
                postcss: '^8',
                autoprefixer: '^10.0.0',
              },
              scripts: { dev: 'next dev --port 3000' },
            }),
          },
        },
        openFile: 'app/page.js',
      },
      { height: 600, host: document.getElementById('stackblitz-container') }
    );
  }, []);

  return <div id="stackblitz-container" style={{ width: '100%' }} />;
}
