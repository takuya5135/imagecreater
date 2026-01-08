import React from 'react';

const ImageGallery = ({ images, onSelect, onDownload }) => {
    if (!images || images.length === 0) return null;

    return (
        <div className="image-gallery">
            <h3>お気に入りの画像を選択</h3>
            <div className="gallery-grid">
                {images.map((img) => (
                    <div key={img.id} className="gallery-item">
                        <img src={img.url} alt={`Generated ${img.id}`} />
                        <div className="overlay">
                            <button
                                className="btn-select"
                                onClick={() => onSelect(img)}
                            >
                                これを選択
                            </button>
                            <button
                                className="btn-download"
                                onClick={() => onDownload(img)}
                            >
                                ダウンロード
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageGallery;
