import { GenAiCode } from "./AiModel.js";

let full = "";
export async function runAiStreamingDemo(prompt) {
  try {
    await GenAiCode.streamMessage(prompt, {
      onToken: (t) => {
        full += t;
        // push partials to your client with a TransformStream,
        // SSE, websockets, etc. (depends on your app)
        process.stdout.write(t); // Use process.stdout.write for streaming output without newlines
      },
      onDone: (completeText) => {
        console.log("\n--- Stream finished ---");
        console.log("Complete response:", completeText);
      }
    });
    return full;
  } catch (e) {
    console.error("Error in streaming demo:", e);
    throw e;
  }
}

// Function to test the adaptive calls approach - only makes additional calls if needed
export async function runDoubleCallsDemo(prompt) {
  try {
    console.log("\n=== Starting Adaptive Calls Demo ===\n");

    // First call to the AI model
    console.log("Making first AI model call...");
    let firstResult = await GenAiCode.sendMessage(prompt);
    let firstResponse = firstResult.response.raw.choices[0].message.content;
    console.log("First response received:");
    console.log(firstResponse);

    // Parse the first response using tryParseJson to handle code blocks
    let firstParsedResult = tryParseJson(firstResponse);
    console.log(firstParsedResult)

    // If we couldn't parse it as JSON properly, it's definitely incomplete
    if (!firstParsedResult) {
      console.log("\nFirst response couldn't be parsed as proper JSON, assuming incomplete.");
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

    return finalResult;
  } catch (e) {
    console.error("Error in double calls demo:", e);
    throw e;
  }
}

// Helper function to check if a response is complete based on its structure
function isResponseComplete(response) {
  // If it's not an object, it's definitely not complete
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  // Check for required fields in the response structure
  // For the AI website builder, we expect projectTitle, files, and generatedFiles
  if (!response.projectTitle || !response.files || !response.generatedFiles) {
    return false;
  }

  // Check if files object has content
  if (Object.keys(response.files).length === 0) {
    return false;
  }

  // Check if generatedFiles array has entries
  if (!Array.isArray(response.generatedFiles) || response.generatedFiles.length === 0) {
    return false;
  }

  // Check if the last file in the files object has code
  const lastFilePath = Object.keys(response.files).pop();
  if (!lastFilePath || !response.files[lastFilePath].code) {
    return false;
  }

  // Check if the last file in generatedFiles is also in the files object
  // This helps ensure we have all the files that were supposed to be generated
  const lastGeneratedFile = response.generatedFiles[response.generatedFiles.length - 1];
  const allFilePaths = Object.keys(response.files).map(path => path.toLowerCase());
  if (!allFilePaths.some(path => lastGeneratedFile.toLowerCase().includes(path.toLowerCase()) ||
    path.toLowerCase().includes(lastGeneratedFile.toLowerCase()))) {
    return false;
  }

  // If we've passed all checks, the response appears to be complete
  return true;
}

// Helper function to try parsing JSON
function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (extractError) {
        console.log("JSON extraction error:", extractError);
      }
    }
    return text;
  }
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

// Choose which demo to run
// Comment out one of these lines to run the other demo
// runAiStreamingDemo("Create a landing page for a web3 product").then(() => {
//   console.log(`full : ${full}`)
//   process.exit(0)
// });

// Run the double calls demo
runDoubleCallsDemo("Create a landing page for a web3 product, create pages home, about, contact").then(() => {
  console.log("\n=== Double Calls Demo Completed ===\n");
  process.exit(0);
});