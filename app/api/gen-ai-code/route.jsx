import { NextResponse } from "next/server";
import { GenAiCode } from '@/configs/AiModel';
import { createJob, setJobResult, setJobError } from "./jobStore";
import { randomUUID } from "crypto";

export async function POST(req) {
  const { prompt } = await req.json();
  const jobId = randomUUID();
  createJob(jobId, prompt);

  // Start background processing
  (async () => {
    try {
      const result = await GenAiCode.sendMessage(prompt);
      const responseText = result.response.text();
      
      // Handle potential JSON parsing issues
      let parsedResult;
      try {
        // Try to parse the response as JSON
        parsedResult = JSON.parse(responseText);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from markdown code blocks
        // This handles cases where the response might include ```json tags
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            parsedResult = JSON.parse(jsonMatch[1].trim());
          } catch (extractError) {
            throw new Error(`Could not parse JSON response: ${responseText.substring(0, 100)}...`);
          }
        } else {
          throw new Error(`Could not extract JSON from response: ${responseText.substring(0, 100)}...`);
        }
      }
      
      setJobResult(jobId, parsedResult);
    } catch (e) {
      console.error("Error in AI code generation:", e);
      setJobError(jobId, e.message || "Unknown error");
    }
  })();

  return NextResponse.json({ jobId });
}