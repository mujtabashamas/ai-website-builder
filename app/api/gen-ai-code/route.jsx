import { NextResponse } from "next/server";
import { GenAiCode } from '@/configs/AiModel';
import { randomUUID } from "crypto";
import mongoConnect from '@/lib/mongoConnect';
import Job from '@/models/Job';

export async function POST(req) {
  const { prompt } = await req.json();
  const jobId = randomUUID();
  await mongoConnect();
  await Job.create({ _id: jobId, prompt, status: 'pending' });

  // Start background processing
  (async () => {
    try {
      const result = await GenAiCode.sendMessage(prompt);
      const responseText = result.response.text();

      // Handle potential JSON parsing issues
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
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
      await Job.findByIdAndUpdate(jobId, {
        status: 'done',
        result: parsedResult,
        completed: new Date()
      });
    } catch (e) {
      console.error("Error in AI code generation:", e);
      await Job.findByIdAndUpdate(jobId, {
        status: 'error',
        error: e.message || "Unknown error",
        completed: new Date()
      });
    }
  })();

  return NextResponse.json({ jobId });
}