import React from 'react';

const RefineInput = ({ selectedImage, refinementText, setRefinementText, onRefine }) => {
    return (
        <div className="refine-step">
            <div className="selected-preview">
                <h4>選択したベース画像</h4>
                <img src={selectedImage.url} alt="Selected Base" style={{ maxHeight: '200px' }} />
            </div>

            <div className="refine-controls">
                <label>どこを改善しますか？</label>
                <textarea
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder="例：お皿を木製のプレートに変えて、湯気を追加して、照明を暖かくして..."
                    rows={4}
                />
                <button className="btn-primary" onClick={onRefine}>
                    改善案を生成 (Re-Generate)
                </button>
            </div>
        </div>
    );
};

export default RefineInput;
