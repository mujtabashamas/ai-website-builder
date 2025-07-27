// import { Sandbox } from "@e2b/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import { GenAiCode } from "./AiModel.js";
import dotenv from "dotenv";
dotenv.config();

const tryParseJson = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith("json")) cleaned = cleaned.slice(4).trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json|^```/, "").trim();
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

export async function generateAndPreview(prompt) {
  try {
    if (!process.env.E2B_API_KEY) {
      throw new Error("E2B_API_KEY environment variable not set");
    }
    if (!process.env.V0_API_KEY) {
      console.warn(
        "V0_API_KEY not set – GenAiCode may fail unless the key is baked in AiModel.js",
      );
    }

    // 1) Call your model
    const firstResult = await GenAiCode.sendMessage(prompt);
    const rawText = firstResult.response.raw.choices[0].message.content;
    const json = tryParseJson(rawText);
    if (!json) throw new Error("Failed to parse JSON from v0 response");

    const files = json.files || {};
    if (Object.keys(files).length === 0) {
      throw new Error("No files returned from v0 API");
    }
    console.log(files);

    // 2) Create sandbox from your template
    const sandbox = await Sandbox.create("nextjs-template-v2");
    console.log(`Sandbox ${sandbox.sandboxId} created`);

    // 3) Write files
    await Promise.all(
      Object.entries(files).map(([path, { code }]) => {
        const fullPath = `/home/user${path.startsWith("/") ? path : "/" + path}`;
        return sandbox.files.write(fullPath, code);
      }),
    );
    console.log(`Wrote ${Object.keys(files).length} files to sandbox`);

    try {
      const pkgPath = "/home/user/package.json";
      const rawPkg = await sandbox.files.read(pkgPath).catch(() => null);
      if (!rawPkg) return;

      const pkg = JSON.parse(rawPkg.toString());
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      const missing = [];
      if (!deps.autoprefixer) missing.push("autoprefixer");
      if (!deps.postcss) missing.push("postcss");
      if (!deps.tailwindcss) missing.push("tailwindcss");

      if (missing.length) {
        // write back the updated package.json to be nice (optional)
        // or just install missing deps during compile_page.sh (below)
        pkg.devDependencies ??= {};
        for (const d of missing) pkg.devDependencies[d] = "latest";
        await sandbox.files.write(pkgPath, JSON.stringify(pkg, null, 2));
      }

      // Check if utils.ts exists via read()
      await sandbox.files.read('/home/user/lib/utils.ts').catch(async () => {
        await sandbox.files.write('/home/user/lib/utils.ts', `
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
    `.trim());
        console.log("Added missing /lib/utils.ts");
      });

      // Check/patch tsconfig.json
      const rawTsconfig = await sandbox.files.read('/home/user/tsconfig.json').catch(() => null);
      if (rawTsconfig) {
        const cfg = JSON.parse(rawTsconfig.toString());
        cfg.compilerOptions ??= {};
        cfg.compilerOptions.baseUrl = ".";
        cfg.compilerOptions.paths = { "@/*": ["./*"], ...(cfg.compilerOptions.paths || {}) };
        await sandbox.files.write('/home/user/tsconfig.json', JSON.stringify(cfg, null, 2));
        console.log("Updated tsconfig.json alias @/*");
      }
    } catch (err) {
      console.warn("Patch utils/tsconfig failed:", err);
    }


    const proc = await sandbox.commands.run('/bin/bash -lc "/compile_page.sh"', {
      background: true,
      onStdout: (c) => process.stdout.write(c),
      onStderr: (c) => process.stderr.write(c),
    });
    // 5) Build public URL
    const host = sandbox.getHost(3000); // <- REQUIRED
    const url = `https://${host}`;
    console.log("Preview running at:", url);

    // (Optional) poll the URL until it returns 200 before returning it
    return { url, sandboxId: sandbox.sandboxId, pid: proc.pid };
  } catch (error) {
    console.error("Error in generateAndPreview:", error);
    throw error;
  }
}

// CLI quick test
const prompt = process.argv[2];
generateAndPreview(prompt).catch(
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
