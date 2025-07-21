let response = 'json{"projectTitle":"Web3 Domain Provider Landing Page","generatedFiles":["/app/layout.tsx","/app/globals.css","/app/page.tsx","/components/Header.tsx","/components/Hero.tsx","/components/Features.tsx","/components/Pricing.tsx","/components/Testimonials.tsx","/components/CTA.tsx","/components/Footer.tsx"]}'

// Helper function to try parsing JSON
function tryParseJson(text) {
    // Only accept strict, valid JSON (no markdown, no code blocks, no extra text)
    try {
        // Must be a string that parses directly to an object
				//remove json
        const parsed = JSON.parse(text.replace('json', ''));
				// console.log(parsed);
        return parsed;
    } catch (e) {
			console.error(e);
        return null;
    }
}

(async () => {
    const result = await tryParseJson(response);
    console.log(result);
})();