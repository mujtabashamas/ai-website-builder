/**
 * In-memory job store for AI code generation tasks
 * Stores and manages jobs with their status, results, and errors
 */
// Proxy to MongoDB-based job store
import {
  createJob,
  setJobResult,
  setJobError,
  getJob,
  jobExists,
} from '../../../lib/jobStore.mongo.js';

// Re-export for compatibility
export { createJob, setJobResult, setJobError, getJob, jobExists };
