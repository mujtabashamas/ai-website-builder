import { GenAiCode } from "./AiModel.js";

(async () => {
  const prompt = "Create a landing page for a web3 product";
  try {
    const response = await GenAiCode.streamMessage(prompt);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done, value;
    let data = ""; // <--- This will accumulate the streamed text

    while (true) {
      ({ done, value } = await reader.read());
      if (done) break;
      const chunk = decoder.decode(value);
      process.stdout.write(chunk); // Streamed output
      data += chunk; // <--- Collecting the streamed data
      console.log(chunk)
    }

    console.log("\n--- Streaming complete ---");
    console.log(data);
    // Now you can use `data` as a string containing the full streamed response
    // For example, parse as JSON if the response is JSON:
    // const parsed = JSON.parse(data);
    // console.log(parsed);

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();