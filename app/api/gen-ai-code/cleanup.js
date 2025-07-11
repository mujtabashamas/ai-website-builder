import { cleanupOldJobs } from './jobStore';

/**
 * This module provides utilities for cleaning up old job data
 * to prevent memory leaks in the in-memory job store
 */

// Default cleanup interval in milliseconds (10 minutes)
const DEFAULT_CLEANUP_INTERVAL = 10 * 60 * 1000;

// Default max age for completed jobs in minutes (60 minutes)
const DEFAULT_MAX_AGE_MINUTES = 60;

let cleanupInterval = null;

/**
 * Start the automatic cleanup process for old jobs
 */
export function startJobCleanup(intervalMs = DEFAULT_CLEANUP_INTERVAL, maxAgeMinutes = DEFAULT_MAX_AGE_MINUTES) {
  // Clear any existing interval first
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  // Run cleanup immediately once
  cleanupOldJobs(maxAgeMinutes);
  
  // Set up periodic cleanup
  cleanupInterval = setInterval(() => {
    console.log('[JobStore] Running scheduled cleanup of old jobs');
    cleanupOldJobs(maxAgeMinutes);
  }, intervalMs);
  
  console.log(`[JobStore] Automatic cleanup scheduled every ${intervalMs / 1000} seconds`);
  return cleanupInterval;
}

/**
 * Stop the automatic cleanup process
 */
export function stopJobCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[JobStore] Automatic cleanup stopped');
  }
}
