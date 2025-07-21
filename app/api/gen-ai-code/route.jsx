import { GenAiCode } from '@/configs/AiModel';
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import mongoConnect from '@/lib/mongoConnect';
import Job from '@/models/Job';

// Set dynamic rendering for Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Maximum tokens to process in a single request
const MAX_TOKENS = 30000;

// Step 1: Initialize job and start the AI code generation process
export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const jobId = randomUUID();

    // Connect to database and create job record
    await mongoConnect();
    await Job.create({ _id: jobId, prompt, status: 'pending' });

    // Start the AI processing in the background
    // This allows us to return quickly to the client
    processAiRequest(jobId, prompt).catch(async (error) => {
      console.error("Background processing error:", error);
      try {
        await mongoConnect();
        await Job.findByIdAndUpdate(jobId, {
          status: 'error',
          error: error.message || "Unknown error in background processing",
          completed: new Date()
        });
      } catch (dbError) {
        console.error("Failed to record background error in database:", dbError);
      }
    });

    // Return immediately with the job ID
    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'AI code generation started. Use the status endpoint to check status.'
    });

  } catch (e) {
    console.error("Error in AI code generation initialization:", e);

    // Create a job ID for the failed request if we don't have one yet
    const jobId = e.jobId || randomUUID();

    try {
      // Try to update the database with the error
      await mongoConnect();
      await Job.findByIdAndUpdate(jobId, {
        status: 'error',
        error: e.message || "Unknown error",
        completed: new Date()
      }, { upsert: true });
    } catch (dbError) {
      console.error("Failed to record error in database:", dbError);
    }

    return NextResponse.json(
      {
        jobId,
        status: 'error',
        message: e.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper function to try parsing JSON
function tryParseJson(text) {
  // Remove leading/trailing whitespace
  let cleaned = text.trim();
  // Remove leading 'json' token if present
  if (cleaned.startsWith('json')) {
    cleaned = cleaned.slice(4).trim();
  }
  // Handle markdown code block (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    // Remove the opening triple backticks and optional 'json'
    cleaned = cleaned.replace(/^```json|^```/, '').trim();
    // Remove the closing triple backticks if present
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3).trim();
    }
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Background processing function
// Helper function to check if a response is complete based on its structure
function isResponseComplete(response) {
  // Must be a non-null object
  if (typeof response !== 'object' || response === null) return false;

  // projectTitle: non-empty string
  if (typeof response.projectTitle !== 'string' || !response.projectTitle.trim()) return false;

  // explanation: non-empty string
  if (typeof response.explanation !== 'string' || !response.explanation.trim()) return false;

  // files: non-empty object, each value must have a non-empty 'code' string
  if (!response.files || typeof response.files !== 'object' || Array.isArray(response.files)) return false;
  const fileKeys = Object.keys(response.files);
  if (fileKeys.length === 0) return false;
  for (const key of fileKeys) {
    if (!response.files[key] || typeof response.files[key].code !== 'string' || !response.files[key].code.trim()) {
      return false;
    }
  }

  // generatedFiles: non-empty array of strings, each must be a key in files
  if (!Array.isArray(response.generatedFiles) || response.generatedFiles.length === 0) return false;
  for (const file of response.generatedFiles) {
    if (typeof file !== 'string' || !fileKeys.includes(file)) return false;
  }

  // If all checks pass, the response is complete
  return true;
}

// Helper function to combine results
function combineResults(first, second) {
  // If either result is not an object or has an error, return what we have
  if (typeof first !== 'object' || first.error) {
    return first;
  }
  if (typeof second !== 'object' || second.error) {
    return first;
  }

  // If both are objects, merge them
  const combined = { ...first };

  // Handle special case for files property which is an object of file paths to code
  if (first.files && second.files) {
    combined.files = { ...first.files, ...second.files };
  }

  // Handle special case for generatedFiles property which is an array
  if (Array.isArray(first.generatedFiles) && Array.isArray(second.generatedFiles)) {
    // Combine arrays without duplicates
    const allFiles = [...first.generatedFiles];
    second.generatedFiles.forEach(file => {
      if (!allFiles.includes(file)) {
        allFiles.push(file);
      }
    });
    combined.generatedFiles = allFiles;
  }

  // For any other properties in second that don't exist in first, add them
  Object.keys(second).forEach(key => {
    if (key !== 'files' && key !== 'generatedFiles' && !combined.hasOwnProperty(key)) {
      combined[key] = second[key];
    }
  });

  return combined;
}

async function processAiRequest(jobId, prompt) {
  try {
    // Update status to processing
    await mongoConnect();
    await Job.findByIdAndUpdate(jobId, { status: 'pending' });

    // First call to the AI model
    console.log("Making first AI model call...");
    let firstResult = await GenAiCode.sendMessage(prompt);
    let firstResponse = firstResult.response.raw.choices[0].message.content;
    console.log("First response received:");
    console.log(firstResponse);

    // Parse the first response using tryParseJson to handle code blocks
    let firstParsedResult = tryParseJson(firstResponse);
    console.log(firstParsedResult);

    // If we couldn't parse it as JSON properly, it's definitely incomplete
    if (!firstParsedResult) {
      console.log("\nFirst response couldn't be parsed as proper JSON, assuming incomplete.");
      
      // Update job with error
      await Job.findByIdAndUpdate(jobId, {
        status: 'error',
        error: "Couldn't parse response as JSON",
        completed: new Date()
      });
      
      return;
    }

    let isComplete = isResponseComplete(firstParsedResult);
    console.log(`\nIs the first response complete? ${isComplete ? 'YES' : 'NO'}`);

    let finalResult = firstParsedResult;

    // Only make a second call if the response is incomplete
    if (!isComplete) {
      console.log("\nResponse is incomplete. Making second API call...");
      const secondPrompt = `${prompt}\n\nContinue generating the response from where you left off`;

      const secondResult = await GenAiCode.sendMessage(secondPrompt);
      const secondResponse = secondResult.response.raw.choices[0].message.content;
      console.log("Second response received:");
      console.log(secondResponse);

      // Parse and combine results
      const secondParsedResult = tryParseJson(secondResponse);
      if (!secondParsedResult) {
        console.log("Second response couldn't be parsed as proper JSON, assuming incomplete.");
        
        // Update job with error
        await Job.findByIdAndUpdate(jobId, {
          status: 'error',
          error: "Couldn't parse second response as JSON",
          completed: new Date()
        });
        
        return;
      }

      let isComplete = isResponseComplete(secondParsedResult);
      console.log(`\nIs the second response complete? ${isComplete ? 'YES' : 'NO'}`);

      finalResult = combineResults(firstParsedResult, secondParsedResult);
    } else {
      console.log("\nFirst response is complete. No need for additional calls.");
      finalResult = firstParsedResult;
    }

    console.log("\n=== Final Result ===\n");
    console.log(JSON.stringify(finalResult, null, 2)); // Show first 1000 chars

    // Update job with results
    await Job.findByIdAndUpdate(jobId, {
      status: 'done',
      result: finalResult,
      completed: new Date()
    });

    return finalResult;
  } catch (error) {
    console.error("Error in AI processing:", error);
    throw error;
  }
}