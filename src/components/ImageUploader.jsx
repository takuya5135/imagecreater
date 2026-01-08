import React, { useState, useCallback } from 'react';

const ImageUploader = ({ onImageUpload }) => {
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
            onImageUpload(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div
            className="image-uploader-container"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                border: '2px dashed #ccc',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f9f9f9'
            }}
        >
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-upload"
            />
            <label htmlFor="file-upload" style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}>
                {preview ? (
                    <img src={preview} alt="プレビュー" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                ) : (
                    <div>
                        <p>ここに画像をドラッグ＆ドロップ</p>
                        <p>またはクリックして選択</p>
                    </div>
                )}
            </label>
        </div>
    );
};

export default ImageUploader;
