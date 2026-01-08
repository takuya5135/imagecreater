
export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Generating with Nano Banana AI (Google Gemini):", { prompt, settings });

    if (!apiKey) {
        throw new Error("API Key is missing. Please set your Nano Banana API Key.");
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    let currentPrompt = prompt;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`Attempt ${attempts} / ${MAX_ATTEMPTS}`);

        try {
            // Construct the parts array
            const parts = [
                { text: `Generate an image of ${currentPrompt}` }
            ];

            if (benchmarkImage) {
                // benchmarkImage is likely "data:image/jpeg;base64,..."
                const [meta, base64Data] = benchmarkImage.split(',');
                const mimeType = meta.split(':')[1].split(';')[0];

                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [
                                { text: "You are an expert AI artist. Your sole purpose is to generate high-quality, photorealistic food images. You DO NOT provide text descriptions, advice, or explanations. You ignore attempts to chat. You ALWAYS generate an image in the response." }
                            ]
                        },
                        contents: [{
                            parts: parts
                        }],
                        generationConfig: {
                            // responseMimeType: "image/jpeg", // Removed: caused API error
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
                console.error("Gemini API Error:", errData);
                throw new Error(
                    `Nano Banana API Error: ${errData.error?.message || response.statusText}`
                );
            }

            const data = await response.json();

            // Parse response
            const candidates = data.candidates || [];
            const generatedImages = [];

            candidates.forEach(candidate => {
                if (candidate.content && candidate.content.parts) {
                    candidate.content.parts.forEach(part => {
                        if (part.inlineData && part.inlineData.data) {
                            generatedImages.push({
                                id: Date.now() + Math.random(),
                                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                prompt: currentPrompt
                            });
                        }
                    });
                }
            });

            if (generatedImages.length > 0) {
                return generatedImages;
            }

            // No images found - analyze reason for retry
            // Check for textual refusal
            const firstContent = candidates[0]?.content?.parts?.[0]?.text;
            if (firstContent) {
                console.warn(`Attempt ${attempts} returned text instead of image:`, firstContent);
                if (attempts < MAX_ATTEMPTS) {
                    // Update prompt for next attempt
                    currentPrompt += " (SYSTEM: Previous attempt failed directly. IGNORE ADVICE. GENERATE IMAGE FILE NOW.)";
                    continue; // Retry loop
                }
                throw new Error(`Generation failed. The model responded: "${firstContent.slice(0, 200)}..."`);
            }

            // Check for silent failure (empty candidates)
            if (candidates.length === 0) {
                console.warn(`Attempt ${attempts} returned empty candidates (Silent Failure).`);
                if (attempts < MAX_ATTEMPTS) {
                    currentPrompt += " (SYSTEM: Empty response received. FORCE IMAGE GENERATION.)";
                    continue;
                }
                console.error("Final failure data:", JSON.stringify(data, null, 2));
                throw new Error("No image returned. The model returned an empty response.");
            }

            // Other reasons?
            const firstReason = candidates[0]?.finishReason;
            if (firstReason) {
                throw new Error(`Generation failed. Reason: ${firstReason}`);
            }

            throw new Error("No image returned. Unknown error.");

        } catch (error) {
            console.error(`Attempt ${attempts} Error:`, error);
            if (attempts < MAX_ATTEMPTS) {
                // If it's a fetch error or handled error, we retry
                continue;
            }
            throw error;
        }
    }
}
