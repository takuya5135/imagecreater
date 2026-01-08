
export async function generateImages(apiKey, prompt, benchmarkImage, settings) {
    console.log("Checking available models...");

    if (!apiKey) {
        throw new Error("API Key is missing.");
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();
        const models = data.models || [];

        // Filter for relevant models
        const relevant = models
            .filter(m => m.name.includes("gemini") || m.name.includes("imagen") || m.name.includes("image"))
            .map(m => m.name.replace("models/", ""))
            .join("\n");

        alert("Available Models:\n" + relevant);
        console.log("All Models:", models);

        // Throw an error to stop the wizard flow but keep the logic "successful" in terms of diagnosis
        throw new Error("Model list check complete. Please report the models shown in the alert.");
    } catch (error) {
        console.error("List Models Failed:", error);
        throw error;
    }
}
