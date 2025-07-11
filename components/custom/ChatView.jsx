"use client"
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowRight, Link, Loader2Icon, Send } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useConvex } from 'convex/react';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import Prompt from '@/data/Prompt';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function ChatView({ initialJobId, onPrompt, loading }) {
    const { id } = useParams();
    const convex = useConvex();
    const { messages, setMessages } = useContext(MessagesContext);
    const [userInput, setUserInput] = useState();
    const [jobId, setJobId] = useState(initialJobId || null);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);

    useEffect(() => {
        id && GetWorkSpaceData();
    }, [id]);

    const GetWorkSpaceData = async () => {
        const result = await convex.query(api.workspace.GetWorkspace, {
            workspaceId: id
        });
        setMessages(result?.messages);
        console.log(result);
    };

    // Poll for AI job result when jobId changes
    useEffect(() => {
        if (!jobId) return;
        let cancelled = false;
        const poll = async () => {
            let status = 'pending';
            let result = null;
            while (status === 'pending') {
                await new Promise(res => setTimeout(res, 3000));
                try {
                    const statusResp = await axios.get('/api/gen-ai-code/status', { params: { id: jobId } });
                    status = statusResp.data.status;
                    if (status === 'done') {
                        result = statusResp.data.result;
                    }
                } catch (e) {
                    status = 'done';
                    result = { error: e?.response?.data?.error || e.message };
                }
                if (cancelled) return;
            }
            const aiResp = {
                role: 'ai',
                content: result
            };
            setMessages(prev => [...prev, aiResp]);
            await UpdateMessages({
                messages: [...messages, aiResp],
                workspaceId: id
            });
        };
        poll();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    // When initialJobId changes (first page load), set jobId
    useEffect(() => {
        if (initialJobId) setJobId(initialJobId);
    }, [initialJobId]);

    // Only submit user prompt and add user message
    const onGenerate = (input) => {
        setMessages(prev => [...prev, {
            role: 'user',
            content: input
        }]);
        setUserInput('');
        if (onPrompt) {
            const prompt = JSON.stringify([...messages, { role: 'user', content: input }]) + Prompt.CHAT_PROMPT;
            // Wrap onPrompt to set jobId when new job is created
            onPrompt(prompt, (newJobId) => {
                if (newJobId) setJobId(newJobId);
            });
        }
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

                    {loading && (
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