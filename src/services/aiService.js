
// Helper to generate a single image with retries
async function generateSingleImage(apiKey, prompt, benchmarkImage, settings) {
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    let currentPrompt = prompt;

    // Use the confirmed available model
    const MODEL_ID = 'imagen-4.0-ultra-generate-001';

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
            let response;

            if (MODEL_ID.includes('imagen')) {
                // Imagen Model (Predict API)
                const payload = {
                    instances: [
                        {
                            prompt: currentPrompt
                        }
                    ],
                    parameters: {
                        sampleCount: 1
                    }
                };

                // Add benchmark image if available (Image-to-Image)
                // Note: Exact format for Imagen on Gemini API might vary, but standard Vertex is:
                // instances[0].image = { bytesBase64Encoded: ... }
                if (benchmarkImage && attempts < MAX_ATTEMPTS) {
                    const partsData = benchmarkImage.split(',');
                    if (partsData.length === 2) {
                        const base64Data = partsData[1];
                        payload.instances[0].image = {
                            bytesBase64Encoded: base64Data
                        };
                    }
                }

                // Add Aspect Ratio if settings allows (Imagen specific param)
                // converting generic width/height to closest standard aspect ratio string is complex,
                // for now we rely on the prompt or default. 
                // Alternatively, we could add "aspectRatio": "3:4" etc if we calculated it.

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:predict?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    }
                );

            } else {
                // Gemini Model (GenerateContent API)
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

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: parts
                            }],
                            generationConfig: {},
                            safetySettings: [
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                            ]
                        }),
                    }
                );
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json();

            // PARSE RESPONSE (Normalize between Predict and GenerateContent)

            // 1. Imagen Predict Response
            if (data.predictions && data.predictions.length > 0) {
                const prediction = data.predictions[0];
                // Prediction can be { bytesBase64Encoded: "..." } or { mimeType: "...", bytesBase64Encoded: "..." }
                const b64 = prediction.bytesBase64Encoded || prediction; // Handle potential wrapper
                const mime = prediction.mimeType || "image/png"; // Default to png if not specified, though usually jpeg/png

                // If prediction is just a string (rare but possible in some legacy APIs), handle it? 
                // Standard new Imagen is object.

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
                // If we get here for Gemini, check for failures to retry
                const firstContent = data.candidates[0]?.content?.parts?.[0]?.text;
                if (firstContent && attempts < MAX_ATTEMPTS) continue; // Retry on text
                if (data.candidates.length === 0 && attempts < MAX_ATTEMPTS) continue; // Retry on empty
            }

            // If we are here, we failed to find an image in the success response
            // For Imagen, empty predictions? For Gemini, valid response but no image?
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
