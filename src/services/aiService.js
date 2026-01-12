
// Helper to generate a single image with retries
async function generateSingleImage(apiKey, prompt, benchmarkImage, settings) {
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    let currentPrompt = prompt;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
            // Construct the parts array
            const parts = [
                { text: `Generate an image of ${currentPrompt}. Do not include any text, words, letters, or numbers in the image. Pure visual representation only.` }
            ];

            // Add benchmark image unless it's the final fallback attempt
            if (benchmarkImage && attempts < MAX_ATTEMPTS) {
                const partsData = benchmarkImage.split(',');
                if (partsData.length === 2) {
                    const [meta, base64Data] = partsData;
                    const mimeType = meta.split(':')[1].split(';')[0];

                    parts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    });
                }
            } else if (benchmarkImage && attempts === MAX_ATTEMPTS) {
                // Fallback to text only
            }

            // Map aspect ratio or keep null to let model default
            // For gemini-2.5-flash-image, standard generateContent usually doesn't strictly need aspect ratio in config if prompt handles it, 
            // but we can try to leave it out for the parallel approach to be safe, or check valid params.
            // Previous working parallel version didn't pass strict aspect ratio in config, so let's stick to that for stability.

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: parts
                        }],
                        generationConfig: {
                            // candidateCount: 1 is default
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
                    }),
                }
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json();
            const candidates = data.candidates || [];

            for (const candidate of candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            return {
                                id: Date.now() + Math.random(),
                                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                prompt: currentPrompt
                            };
                        }
                    }
                }
            }

            // If we get here, check for failures to retry
            const firstContent = candidates[0]?.content?.parts?.[0]?.text;
            if (firstContent && attempts < MAX_ATTEMPTS) continue; // Retry on text
            if (candidates.length === 0 && attempts < MAX_ATTEMPTS) continue; // Retry on empty

        } catch (error) {
            console.warn(`Generation attempt ${attempts} failed:`, error);
            if (attempts < MAX_ATTEMPTS) continue;
        }
    }
    return null; // Failed after all retries
}

export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Generating 3 variations with Nano Banana AI (Imagen 4 Ultra)...");

    if (!apiKey) {
        throw new Error("API Key is missing. Please set your Nano Banana API Key.");
    }

    // Define 3 explicit variations to ensure diversity
    // Variation 1: Balanced / Standard (The user's direct intent)
    // Variation 2: Overhead View / Flat Lay (Focus on composition & layout)
    // Variation 3: Macro / Cinematic (Focus on texture, depth offered, and dramatic lighting)

    const variations = [
        "", // Standard (Base prompt)
        " (Overhead view, flat lay composition, organized layout, commercial food photography style)",
        " (Macro close-up, highly detailed texture, shallow depth of field, dramatic cinematic lighting, side angle)"
    ];

    // Run 3 generation requests in parallel with different prompt suffixes
    const promises = variations.map(suffix =>
        generateSingleImage(apiKey, prompt + suffix, benchmarkImage, settings)
    );

    const results = await Promise.all(promises);
    const validImages = results.filter(img => img !== null);

    if (validImages.length === 0) {
        throw new Error("Failed to generate any images after multiple attempts.");
    }

    return validImages;
}
