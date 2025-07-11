"use client"
import ChatView from '@/components/custom/ChatView';
import CodeView from '@/components/custom/CodeView';
import React, { useState } from 'react';
import axios from 'axios';

const Workspace = () => {
    const [jobId, setJobId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Handler to create a new AI job and set jobId
    const handleGenAiJob = async (prompt) => {
        setLoading(true);
        try {
            const resp = await axios.post('/api/gen-ai-code', { prompt });
            console.log(resp.data);
            setJobId(resp.data.jobId);
        } catch (err) {
            // Optionally handle error
            console.log(err);
            setJobId(null);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-950 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_400px_at_50%_300px,#3b82f625,transparent)]" />
            </div>

            {/* Content */}
            <div className='relative z-10 p-10'>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-10'>
                    <ChatView jobId={jobId} onPrompt={handleGenAiJob} loading={loading} />
                    <div className='col-span-3'>
                        <CodeView jobId={jobId} loading={loading} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;