"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowRight, Link, Loader2Icon, Send } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import Prompt from '@/context/Prompt';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useJob } from '@/context/JobContext';

function ChatView() {
    const { id } = useParams();

    const { messages, setMessages } = useContext(MessagesContext);
    const [userInput, setUserInput] = useState();
    const [loading, setLoading] = useState(false);


    // Use the shared job context
    const { jobId, status, result, error, isPolling, createJob } = useJob();





    // Handle direct AI chat responses (not through job polling)
    useEffect(() => {
        if (messages?.length > 0 && !jobId && !isPolling) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GetAiResponse();
            }
        }
    }, [messages, jobId, isPolling]);

    const GetAiResponse = async () => {
        setLoading(true);
        const PROMPT = JSON.stringify(messages) + Prompt.CHAT_PROMPT;
        try {
            const result = await axios.post('/api/ai-chat', {
                prompt: PROMPT
            });

            const aiResp = {
                role: 'ai',
                content: result.data.result
            };

            setMessages(prev => [...prev, aiResp]);
            const currentMessages = Array.isArray(messages) ? messages : [];
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorResp = {
                role: 'ai',
                content: `Error: ${error.message || 'Failed to get response'}`
            };
            setMessages(prev => [...prev, errorResp]);
        } finally {
            setLoading(false);
        }
    };

    // Process job result when status changes to 'done' or 'error'
    useEffect(() => {
        if (status === 'done' && result) {
            console.log('ChatView: Job completed with result:', result);
            let content = '';

            if (typeof result === 'string') {
                content = result;
            } else if (result.error) {
                content = `Error: ${result.error}`;
            } else if (typeof result === 'object') {
                try {
                    // For code generation, we want to show the explanation in chat
                    if (result.explanation) {
                        content = result.explanation;
                    } else if (result.files) {
                        content = `Generated ${Object.keys(result.files).length} files successfully.`;
                    } else {
                        content = JSON.stringify(result, null, 2);
                    }
                } catch (e) {
                    content = 'Error parsing result';
                }
            }

            const aiResp = {
                role: 'ai',
                content: content
            };

            setMessages(prev => [...prev, aiResp]);
            try {
                // Get the current messages from state to ensure we have the latest
                const currentMessages = Array.isArray(messages) ? messages : [];
            } catch (e) {
                console.error('Error updating workspace messages:', e);
            }
        } else if (status === 'error' && error) {
            console.error('ChatView: Job error:', error);
            const errorResp = {
                role: 'ai',
                content: `Error: ${error}`
            };

            setMessages(prev => [...prev, errorResp]);
            try {
                const currentMessages = Array.isArray(messages) ? messages : [];
            } catch (e) {
                console.error('Error updating workspace messages:', e);
            }
        }
    }, [status, result, error]);

    // Submit user prompt and add user message
    const onGenerate = (input) => {
        // Add user message to chat
        const userMessage = {
            role: 'user',
            content: input
        };

        // Get current messages safely
        const currentMessages = Array.isArray(messages) ? messages : [];
        const updatedMessages = [...currentMessages, userMessage];

        setMessages(updatedMessages);
        setUserInput('');

        // For code generation, create a job
        const prompt = JSON.stringify(updatedMessages) + Prompt.CHAT_PROMPT;
        createJob(prompt);
    }

    return (
        <div className="relative h-[85vh] flex flex-col bg-gray-900">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {Array.isArray(messages) && messages?.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-lg ${msg.role === 'user'
                                ? 'bg-gray-800/50 border border-gray-700'
                                : 'bg-gray-800/30 border border-gray-700'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${msg.role === 'user'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-purple-500/20 text-purple-400'
                                    }`}>
                                    {msg.role === 'user' ? 'You' : 'AI'}
                                </div>
                                <ReactMarkdown className="prose prose-invert flex-1 overflow-auto">
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {(loading || isPolling || status === 'pending') && (
                        <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                            <div className="flex items-center gap-3 text-gray-400">
                                <Loader2Icon className="animate-spin h-5 w-5" />
                                <p className="font-medium">Generating response...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex gap-3">
                            <textarea
                                placeholder="Type your message here..."
                                value={userInput}
                                onChange={(event) => setUserInput(event.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none h-32"
                            />
                            {userInput && (
                                <button
                                    onClick={() => onGenerate(userInput)}
                                    className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl px-4 transition-all duration-200"
                                >
                                    <Send className="h-6 w-6 text-white" />
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end mt-3">
                            <Link className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;