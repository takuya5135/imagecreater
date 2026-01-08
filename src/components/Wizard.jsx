import React, { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import SettingsForm from './SettingsForm';
import ImageGallery from './ImageGallery';
import RefineInput from './RefineInput';
import { generateImages } from '../services/aiService';

const Wizard = () => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // API Key State - Pre-filled with environment variable if available
    const DEFAULT_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || "";
    const [apiKey, setApiKey] = useState(localStorage.getItem('GOOGLE_AI_API_KEY') || DEFAULT_KEY);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // State
    const [benchmarkImage, setBenchmarkImage] = useState(null);
    const [settings, setSettings] = useState({
        style: 'photo',
        width: 640,
        height: 480,
        context: [],
    });
    const [generatedImages, setGeneratedImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [refinementText, setRefinementText] = useState("");

    const [userPrompt, setUserPrompt] = useState("");

    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('GOOGLE_AI_API_KEY', key);
        setShowApiKeyInput(false);
    };

    // Handlers
    const handleImageUpload = (imgData) => {
        setBenchmarkImage(imgData);
        // Removed auto-advance to allow prompt input
        // setStep(2); 
    };

    const handleGenerate = async () => {
        if (!apiKey) {
            alert("Nano Banana AI を使用するにはAPIキーが必要です。");
            setShowApiKeyInput(true);
            return;
        }

        setStep(3);
        setIsLoading(true);
        try {
            // Prompt construction
            const contextStr = settings.context.join(", ");
            // Combine userPrompt (main) + context + refinement
            const finalPrompt = `${userPrompt}. A ${settings.style} of food, context: ${contextStr}. ${refinementText}. (No people, food photography, close-up)`;

            const images = await generateImages(apiKey, finalPrompt, benchmarkImage, settings);
            setGeneratedImages(images);
        } catch (err) {
            console.error(err);
            alert("画像の生成に失敗しました。APIキーまたはネットワークを確認してください。\\nError: " + err.message);
            setStep(2);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (img) => {
        setSelectedImage(img);
        setStep(4);
    };

    const handleDownload = (img) => {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = `generated-${img.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefine = () => {
        // Treat selected image as new benchmark (conceptually) or just keep context
        // For now, we loop back to generation with new refinement text
        handleGenerate();
    };

    const resetToHome = () => {
        setStep(1);
        setUserPrompt("");
        setBenchmarkImage(null);
        setGeneratedImages([]);
        setSelectedImage(null);
        setRefinementText("");
    };

    return (
        <div className="wizard-container">
            <div className="api-key-section" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="home-btn-container">
                    <button onClick={resetToHome} style={{ background: 'transparent', border: '1px solid #666', color: '#fff', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        🏠 Home
                    </button>
                </div>

                <div className="api-key-input-container" style={{ textAlign: 'right' }}>
                    {!showApiKeyInput ? (
                        <button className="btn-small" onClick={() => setShowApiKeyInput(true)} style={{ fontSize: '0.8rem', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: '4px', cursor: 'pointer' }}>
                            🔑 APIキー設定 (Nano Banana)
                        </button>
                    ) : (
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', display: 'flex', gap: '8px' }}>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Nano Banana API Key"
                                style={{ flex: 1, padding: '4px' }}
                            />
                            <button onClick={() => saveApiKey(apiKey)} className="btn-select" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>保存</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="steps-indicator">
                Step {step} / 4
            </div>

            {step === 1 && (
                <div className="step-content">
                    <h2>新しい制作を始める</h2>

                    <div className="input-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            生成したい画像を指示してください:
                        </label>
                        <textarea
                            className="prompt-textarea"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="例：新鮮な魚介を使った海鮮丼、シズル感たっぷりに..."
                            rows={3}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff' }}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#ccc' }}>
                            (任意) ベンチマークがある場合はアップロードしてください:
                        </label>
                        <ImageUploader onImageUpload={handleImageUpload} />
                        {benchmarkImage && <p style={{ color: '#4caf50', fontSize: '0.9rem', marginTop: '5px' }}>✓ 画像が選択されました</p>}
                    </div>

                    <button
                        className="btn-primary"
                        onClick={() => setStep(2)}
                        disabled={!userPrompt && !benchmarkImage}
                        style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
                    >
                        次へ進む
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="step-content">
                    <h2>詳細設定</h2>
                    <div className="preview-benchmark">
                        <img src={benchmarkImage} alt="Benchmark" style={{ height: '100px', borderRadius: '4px' }} />
                    </div>
                    <SettingsForm settings={settings} setSettings={setSettings} />
                    <button className="btn-primary" onClick={handleGenerate}>
                        画像を生成する
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="step-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>最高の料理画像を調理中... (Nano Banana AI)</p>
                        </div>
                    ) : (
                        <ImageGallery
                            images={generatedImages}
                            onSelect={handleSelect}
                            onDownload={handleDownload}
                        />
                    )}
                </div>
            )}

            {step === 4 && (
                <div className="step-content">
                    <h2>改善 (Refine)</h2>
                    <RefineInput
                        selectedImage={selectedImage}
                        refinementText={refinementText}
                        setRefinementText={setRefinementText}
                        onRefine={handleRefine}
                    />
                </div>
            )}
        </div>
    );
};

export default Wizard;
