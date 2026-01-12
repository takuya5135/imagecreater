
// Helper to analyze image using Gemini Vision and extract prompt keywords
async function analyzeImage(apiKey, base64Image) {
    try {
        const partsData = base64Image.split(',');
        if (partsData.length !== 2) return "";
        const [meta, data] = partsData;
        const mimeType = meta.split(':')[1].split(';')[0];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Describe the visual style, lighting, composition, and color palette of this food image in potential prompt keywords. Focus on the artistic aspects. Be concise. Output format: 'Style: ..., Lighting: ..., Composition: ...'" },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: data
                                }
                            }
                        ]
                    }]
                })
            }
        );

        if (!response.ok) return "";
        const resData = await response.json();
        const description = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Image Analysis:", description);
        return description;
    } catch (e) {
        console.warn("Failed to analyze image:", e);
        return "";
    }
}

// Helper to generate a single image with retries
async function generateSingleImage(apiKey, prompt, benchmarkImage, settings) {
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    let currentPrompt = prompt;

    // Use the confirmed available model
    const MODEL_ID = 'imagen-4.0-ultra-generate-001';

    // If we have a benchmark image, we only analyze it ONCE per batch usually, 
    // but here we are inside the single image function. 
    // Note: To be efficient, we should analyze once outside, but for simplicity/parallelism refactor 
    // we can do it here or pass the analysis in. 
    // *However*, since `generateImages` calls this, let's allow `prompt` to already contain the analysis if possible,
    // OR handled inside `generateImages`.
    // Actually, `generateImages` is better place to do the analysis once.
    // So `generateSingleImage` just takes the final prompt.
    // BUT, the existing signature is (apiKey, prompt, benchmarkImage, settings).
    // I will modify `generateImages` to do the analysis and append it to `prompt` BEFORE calling this.
    // So `benchmarkImage` param here might be unused for Imagen logic, but kept for signature compatibility 
    // or if we switch back to a model that supports it natively.

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
            let response;

            if (MODEL_ID.includes('imagen')) {
                // Imagen Model (Predict API)
                // Vision-Enhanced Prompting: The prompt should already include the description from generateImages

                const payload = {
                    instances: [
                        {
                            prompt: currentPrompt
                        }
                    ],
                    parameters: {
                        sampleCount: 1,
                        // aspect_ratio: "4:3" // Optional: could infer from settings
                    }
                };

                // Note: We are NOT sending the image bytes to Imagen anymore, relying on the prompt description.

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:predict?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    }
                );

            } else {
                // Gemini Model (GenerateContent API) - Legacy/Fallback path
                const parts = [
                    { text: `Generate an image of ${currentPrompt}.` }
                ];

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
                }

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [{ parts: parts }]
                        }),
                    }
                );
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json();

            // PARSE RESPONSE
            // 1. Imagen Predict Response
            if (data.predictions && data.predictions.length > 0) {
                const prediction = data.predictions[0];
                const b64 = prediction.bytesBase64Encoded || prediction;
                const mime = prediction.mimeType || "image/png";

                if (b64) {
                    return {
                        id: Date.now() + Math.random(),
                        url: `data:${mime};base64,${b64}`,
                        prompt: currentPrompt
                    };
                }
            }

            // 2. Gemini GenerateContent Response
            if (data.candidates) {
                for (const candidate of data.candidates) {
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
            }

            throw new Error("No image data found in response");

        } catch (error) {
            console.warn(`Generation attempt ${attempts} failed:`, error);
            if (attempts < MAX_ATTEMPTS) continue;
        }
    }
    return null; // Failed after all retries
}

export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    const MODEL_DISPLAY_NAME = "Imagen 4 Ultra";
    console.log(`Generating 3 variations with Nano Banana AI (${MODEL_DISPLAY_NAME})...`);

    if (!apiKey) {
        throw new Error("API Key is missing. Please set your Nano Banana API Key.");
    }

    let enhancedPromptBase = prompt;

    // STEP 1: VISION ANALYSIS (Vision-Enhanced Prompting)
    if (benchmarkImage) {
        console.log("Analyzing benchmark image...");
        const analysis = await analyzeImage(apiKey, benchmarkImage);
        if (analysis) {
            console.log("Analysis result:", analysis);
            // Append analysis to the prompt
            enhancedPromptBase = `${prompt}. Visual Reference Style: ${analysis}`;
        }
    }

    // Define 3 explicit variations
    const variations = [
        "", // Standard
        " (Overhead view, flat lay composition, organized layout, commercial food photography style)",
        " (Macro close-up, highly detailed texture, shallow depth of field, dramatic cinematic lighting, side angle)"
    ];

    // Run 3 generation requests in parallel
    // Note: We pass 'null' for benchmarkImage to generateSingleImage because we've already "consumed" it 
    // via the enhanced prompt. This prevents double-handling or sending invalid payloads to Imagen.
    const promises = variations.map(suffix =>
        generateSingleImage(apiKey, enhancedPromptBase + suffix, null, settings)
    );

    const results = await Promise.all(promises);
    const validImages = results.filter(img => img !== null);

    if (validImages.length === 0) {
        throw new Error("Failed to generate any images after multiple attempts.");
    }

    return validImages;
}
