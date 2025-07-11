"use client"
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create context
const JobContext = createContext();

// Provider component
export function JobProvider({ children, initialJobId }) {
  const [jobId, setJobId] = useState(initialJobId || null);
  const [status, setStatus] = useState('idle'); // idle, pending, done, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(!!initialJobId);

  // Poll for job status
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    setIsPolling(true);
    setStatus('pending');

    const poll = async () => {
      // Check status immediately on first load
      try {
        const statusResp = await axios.get('/api/gen-ai-code/status', { params: { id: jobId } });
        const currentStatus = statusResp.data.status;

        setStatus(currentStatus);

        if (currentStatus === 'done') {
          setResult(statusResp.data.result);
          setIsPolling(false);
        } else if (currentStatus === 'error') {
          setError(statusResp.data.error || 'An error occurred');
          setStatus('error');
          setIsPolling(false);
        } else if (currentStatus === 'pending' && !cancelled) {
          // Continue polling if still pending
          const pollInterval = setInterval(async () => {
            try {
              const resp = await axios.get('/api/gen-ai-code/status', { params: { id: jobId } });
              const newStatus = resp.data.status;

              setStatus(newStatus);

              if (newStatus === 'done') {
                setResult(resp.data.result);
                setIsPolling(false);
                clearInterval(pollInterval);
              } else if (newStatus === 'error') {
                setError(resp.data.error || 'An error occurred');
                setStatus('error');
                setIsPolling(false);
                clearInterval(pollInterval);
              }
            } catch (e) {
              console.error('Error polling job status:', e);
              setError(e?.response?.data?.error || e.message);
              setStatus('error');
              setIsPolling(false);
              clearInterval(pollInterval);
            }
          }, 3000);

          return () => {
            clearInterval(pollInterval);
          };
        }
      } catch (e) {
        console.error('Error checking initial job status:', e);
        setError(e?.response?.data?.error || e.message);
        setStatus('error');
        setIsPolling(false);
      }
    };

    const cleanup = poll();
    return () => {
      cancelled = true;
      // if (cleanup) cleanup();
    };
  }, [jobId]);

  // Create a new job
  const createJob = async (prompt, callback) => {
    try {
      const response = await axios.post('/api/gen-ai-code', { prompt });
      const newJobId = response.data.jobId;
      setJobId(newJobId);
      if (callback) callback(newJobId);
      return newJobId;
    } catch (error) {
      console.error('Error creating job:', error);
      setError(error?.response?.data?.error || error.message);
      setStatus('error');
      return null;
    }
  };

  // Reset job state
  const resetJob = () => {
    setJobId(null);
    setStatus('idle');
    setResult(null);
    setError(null);
    setIsPolling(false);
  };

  return (
    <JobContext.Provider
      value={{
        jobId,
        setJobId,
        status,
        result,
        error,
        isPolling,
        createJob,
        resetJob
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

// Custom hook to use the job context
export function useJob() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
}
