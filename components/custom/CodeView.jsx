"use client"
import React, { use, useContext } from 'react';
import { useState } from 'react';
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    SandpackFileExplorer
} from "@codesandbox/sandpack-react";
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import axios from 'axios';
import Prompt from '@/context/Prompt';
import { useEffect } from 'react';
import { useJob } from '@/context/JobContext';


import { Loader2Icon, Download } from 'lucide-react';
import JSZip from 'jszip';

function CodeView() {

    const [activeTab, setActiveTab] = useState('code');
    const [files, setFiles] = useState(Lookup?.DEFAULT_FILE);

    const { messages, setMessages } = useContext(MessagesContext);


    // Use the shared job context
    const { jobId, status, result, error, isPolling } = useJob();



    const GetFiles = async () => {
        const mergedFiles = { ...Lookup.DEFAULT_FILE };
        setFiles(mergedFiles);
    };

    // Add file preprocessing function
    const preprocessFiles = (files) => {
        const processed = {};
        Object.entries(files).forEach(([path, content]) => {
            // Ensure the file has proper content structure
            if (typeof content === 'string') {
                processed[path] = { code: content };
            } else if (content && typeof content === 'object') {
                if (!content.code && typeof content === 'object') {
                    processed[path] = { code: JSON.stringify(content, null, 2) };
                } else {
                    processed[path] = content;
                }
            }
        });
        return processed;
    }

    // Process job result when status changes to 'done'
    useEffect(() => {
        if (status === 'done' && result) {
            console.log('CodeView: Job completed with result:', result);

            // Only update files if result has files
            if (result.files) {
                const processedAiFiles = preprocessFiles(result.files || {});
                const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedAiFiles };
                setFiles(mergedFiles);
            }
        } else if (status === 'error') {
            console.error('CodeView: Job error:', error);
        }
    }, [status, result, error]);

    const downloadFiles = async () => {
        try {
            // Create a new JSZip instance
            const zip = new JSZip();

            // Add each file to the zip
            Object.entries(files).forEach(([filename, content]) => {
                // Handle the file content based on its structure
                let fileContent;
                if (typeof content === 'string') {
                    fileContent = content;
                } else if (content && typeof content === 'object') {
                    if (content.code) {
                        fileContent = content.code;
                    } else {
                        // If it's an object without code property, stringify it
                        fileContent = JSON.stringify(content, null, 2);
                    }
                }

                // Only add the file if we have content
                if (fileContent) {
                    // Remove leading slash if present
                    const cleanFileName = filename.startsWith('/') ? filename.slice(1) : filename;
                    zip.file(cleanFileName, fileContent);
                }
            });

            // Add package.json with dependencies
            const packageJson = {
                name: "generated-project",
                version: "1.0.0",
                private: true,
                dependencies: Lookup.DEPENDANCY,
                scripts: {
                    "dev": "vite",
                    "build": "vite build",
                    "preview": "vite preview"
                }
            };
            zip.file("package.json", JSON.stringify(packageJson, null, 2));

            // Generate the zip file
            const blob = await zip.generateAsync({ type: "blob" });

            // Create download link and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project-files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading files:', error);
        }
    };

    return (
        <div className='relative'>
            <div className='bg-[#181818] w-full p-2 border'>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`px-4 py-2 rounded-lg ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                            Code Editor
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-4 py-2 rounded-lg ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                        >
                            Preview
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPolling && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Loader2Icon className="animate-spin h-4 w-4" />
                                <span>Generating code...</span>
                            </div>
                        )}
                        <button
                            onClick={downloadFiles}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </button>
                    </div>
                </div>
            </div>
            <SandpackProvider
                files={files}
                template="nextjs"
                theme={'dark'}
                customSetup={{
                    dependencies: {
                        ...Lookup.DEPENDANCY
                    },
                    entry: '/app/page.tsx'
                }}
                options={{
                    externalResources: ['https://cdn.tailwindcss.com'],
                    bundlerTimeoutSecs: 120,
                    recompileMode: "immediate",
                    recompileDelay: 300
                }}
            >
                <div className="relative">
                    <SandpackLayout>
                        {activeTab == 'code' ? <>
                            <SandpackFileExplorer style={{ height: '80vh' }} />
                            <SandpackCodeEditor
                                style={{ height: '80vh' }}
                                showTabs
                                showLineNumbers
                                showInlineErrors
                                wrapContent />
                        </> :
                            <>
                                <SandpackPreview
                                    style={{ height: '80vh' }}
                                    showNavigator={true}
                                    showOpenInCodeSandbox={false}
                                    showRefreshButton={true}
                                />
                            </>}
                    </SandpackLayout>
                </div>
            </SandpackProvider>
        </div>
    );
}

export default CodeView;