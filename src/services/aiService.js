
export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Generating with Nano Banana AI (Imagen 3):", { prompt, settings });

    if (!apiKey) {
        throw new Error("API Key is missing. Please set your Nano Banana API Key.");
    }

    try {
        // Use Imagen 3 explicitly
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    instances: [
                        { prompt: prompt }
                    ],
                    parameters: {
                        sampleCount: 1,
                        // You can add aspectRatio here if needed, e.g., "1:1" (default)
                        aspectRatio: "1:1"
                    }
                }),
            }
        );

        if (!response.ok) {
            const errData = await response.json();
            console.error("Imagen API Error:", errData);
            throw new Error(
                `Nano Banana API Error (Imagen): ${errData.error?.message || response.statusText}`
            );
        }

        const data = await response.json();
        const predictions = data.predictions || [];

        if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
            const base64Image = predictions[0].bytesBase64Encoded;
            // Imagen 3 normally produces PNG. We can assume image/png.
            const mimeType = predictions[0].mimeType || 'image/png';

            return [{
                id: Date.now(),
                url: `data:${mimeType};base64,${base64Image}`,
                prompt: prompt
            }];
        }

        console.error("No image found in Imagen response:", JSON.stringify(data, null, 2));
        throw new Error("No image returned. The model returned an empty prediction.");

    } catch (error) {
        console.error("Generation Failed:", error);
        throw error;
    }
}
