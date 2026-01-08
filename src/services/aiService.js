
export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Generating with Nano Banana AI (Google Gemini):", { prompt, settings });

    if (!apiKey) {
        throw new Error("API Key is missing. Please set your Nano Banana API Key.");
    }

    try {
        // Official Google Gemini API (Imagen 3 via Gemini 2.0 Flash Exp)
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent

        // Construct the parts array
        const parts = [
            { text: `Generate an image of ${prompt}` }
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
                            prompt: prompt
                        });
                    }
                });
            } else if (candidate.finishReason && candidate.finishReason !== "STOP") {
                console.warn("Generation stopped due to:", candidate.finishReason);
                // We'll throw if no images were generated at the end, but knowing the reason helps
            }
        });

        if (generatedImages.length > 0) {
            return generatedImages;
        } else {
            // Check for specific safety failure in the first candidate
            const firstReason = candidates[0]?.finishReason;
            const firstContent = candidates[0]?.content?.parts?.[0]?.text;

            if (firstReason === "SAFETY") {
                throw new Error("Generation blocked by safety settings. (Reason: SAFETY). Please try a different prompt.");
            } else if (firstContent) {
                // The model returned text instead of an image (likely a refusal or explanation)
                console.warn("Model returned text instead of image:", firstContent);
                throw new Error(`Generation failed. The model responded: "${firstContent.slice(0, 200)}..."`);
            } else if (firstReason) {
                throw new Error(`Generation failed. Reason: ${firstReason}`);
            }
            console.error("No image found in response. Raw Data:", JSON.stringify(data, null, 2));
            throw new Error(`No image returned. Raw response: ${JSON.stringify(data).slice(0, 500)}`);
        }

    } catch (error) {
        console.error("Generation Failed:", error);
        throw error;
    }
}
