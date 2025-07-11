import { NextResponse } from "next/server";
import { getJob } from "../jobStore";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  // Validate job ID
  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }
  
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  
  // Return appropriate response based on job status
  if (job.status === "pending") {
    return NextResponse.json({ status: "pending" });
  } else if (job.status === "done") {
    // Return the result, ensuring it's properly formatted
    try {
      return NextResponse.json({
        status: "done",
        result: job.result
      });
    } catch (error) {
      console.error("Error returning job result:", error);
      return NextResponse.json(
        { status: "error", error: "Error processing result" },
        { status: 500 }
      );
    }
  } else if (job.status === "error") {
    return NextResponse.json({ status: "error", error: job.error });
  }
  
  return NextResponse.json({ error: "Unknown job status" }, { status: 500 });
}
