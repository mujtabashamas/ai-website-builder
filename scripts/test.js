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


runAiStreamingDemo("Create a landing page for a web3 product").then(() => {
  console.log(`full : ${full}`)
  process.exit(0)
});