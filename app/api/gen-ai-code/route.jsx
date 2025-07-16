import { GenAiCode } from '@/configs/AiModel';
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import mongoConnect from '@/lib/mongoConnect';
import Job from '@/models/Job';

// These are required for streaming in Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  const { prompt } = await req.json();
  const jobId = randomUUID();

  // Create a transform stream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial headers and job ID
  writer.write(
    encoder.encode(`data: ${JSON.stringify({ type: 'init', jobId })}

`)
  );

  // Start processing in the background
  (async () => {
    try {
      await mongoConnect();
      await Job.create({ _id: jobId, prompt, status: 'pending' });

      // Update status to client
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'processing' })}

`)
      );

      let collected = "";

      // Stream the AI response
      await GenAiCode.streamMessage(prompt, {
        onToken: (token) => {
          collected += token;
          writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: 'token', content: token })}

`)
          );
        },
        onDone: async (completeText) => {
          // Handle potential JSON parsing issues
          let parsedResult;
          try {
            parsedResult = JSON.parse(completeText);
          } catch (parseError) {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = completeText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                parsedResult = JSON.parse(jsonMatch[1].trim());
              } catch (extractError) {
                console.log("JSON extraction error:", extractError);
              }
            } else {
              console.log("Could not extract JSON from response");
            }
          }

          // Save to database
          await Job.findByIdAndUpdate(jobId, {
            status: 'done',
            result: parsedResult,
            completed: new Date()
          });

          // Send completion message
          writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', status: 'complete' })}

`)
          );

          // Close the stream
          writer.close();
        }
      });
    } catch (e) {
      console.error("Error in AI code generation:", e);

      // Update database with error
      await Job.findByIdAndUpdate(jobId, {
        status: 'error',
        error: e.message || "Unknown error",
        completed: new Date()
      });

      // Send error to client
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: e.message || "Unknown error" })}

`)
      );

      // Close the stream
      writer.close();
    }
  })();

  return NextResponse.json({ jobId });
}