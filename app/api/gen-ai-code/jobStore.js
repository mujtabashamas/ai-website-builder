/**
 * In-memory job store for AI code generation tasks
 * Stores and manages jobs with their status, results, and errors
 */
const jobs = {};

/**
 * Create a new job with the given ID and prompt
 */
export function createJob(id, prompt) {
  if (!id) {
    throw new Error('Job ID is required');
  }
  
  jobs[id] = { 
    status: 'pending', 
    prompt, 
    result: null, 
    error: null,
    created: new Date().toISOString() 
  };
}

/**
 * Set the result of a job to mark it as completed
 */
export function setJobResult(id, result) {
  if (!jobs[id]) {
    console.error(`Attempted to set result for non-existent job: ${id}`);
    return;
  }
  
  try {
    jobs[id].status = 'done';
    jobs[id].result = result;
    jobs[id].completed = new Date().toISOString();
  } catch (error) {
    console.error(`Error setting job result for ${id}:`, error);
    setJobError(id, 'Failed to save job result');
  }
}

/**
 * Set an error for a job that failed
 */
export function setJobError(id, error) {
  if (!jobs[id]) {
    console.error(`Attempted to set error for non-existent job: ${id}`);
    return;
  }
  
  jobs[id].status = 'error';
  jobs[id].error = error;
  jobs[id].completed = new Date().toISOString();
}

/**
 * Get a job by its ID
 */
export function getJob(id) {
  return jobs[id];
}

/**
 * Check if a job exists
 */
export function jobExists(id) {
  return !!jobs[id];
}

/**
 * Clear old jobs to prevent memory leaks
 * Should be called periodically
 */
export function cleanupOldJobs(maxAgeMinutes = 60) {
  const now = new Date();
  
  Object.keys(jobs).forEach(id => {
    const job = jobs[id];
    if (job.completed) {
      const completedDate = new Date(job.completed);
      const ageMinutes = (now - completedDate) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        delete jobs[id];
      }
    }
  });
}
