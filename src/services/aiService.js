
export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Generating with Pollinations.ai:", { prompt, settings });

    // Pollinations.ai doesn't need an API key. 
    // We ignore the apiKey argument.

    const width = settings.width || 640;
    const height = settings.height || 480;
    const count = 3; // Generate 3 variations
    const model = 'flux'; // High quality model

    // Construct the request URLs with random seeds for variety
    const requests = Array.from({ length: count }).map(async (_, index) => {
        const seed = Math.floor(Math.random() * 1000000);
        // Add nologo=true to avoid watermarks if possible, though Pollinations might add them.
        // enhance=true can be added for auto-prompt enhancement
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Pollinations API Error: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({
                    id: Date.now() + index,
                    url: reader.result, // base64 string
                    prompt: prompt
                });
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Failed to generate image variant ${index}:`, error);
            // Return null for failed requests to filter them out later
            return null;
        }
    });

    try {
        const results = await Promise.all(requests);
        const generatedImages = results.filter(img => img !== null);

        if (generatedImages.length > 0) {
            return generatedImages;
        } else {
            throw new Error("Failed to generate any images. Please try again.");
        }

    } catch (error) {
        console.error("Generation Failed:", error);
        throw error;
    }
}
