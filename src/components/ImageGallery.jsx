import React, { useState } from 'react';

const ImageGallery = ({ images, onSelect, onDownload }) => {
    const [zoomedImage, setZoomedImage] = useState(null);

    if (!images || images.length === 0) return null;

    const openZoom = (img) => {
        setZoomedImage(img);
    };

    const closeZoom = () => {
        setZoomedImage(null);
    };

    return (
        <div className="image-gallery">
            <h3>お気に入りの画像を選択</h3>
            <div className="gallery-grid">
                {images.map((img) => (
                    <div
                        key={img.id}
                        className="gallery-item"
                        onClick={() => openZoom(img)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={img.url} alt={`Generated ${img.id}`} />
                        {/* Removing old overlay with buttons, now clicking opens zoom */}
                    </div>
                ))}
            </div>

            {/* Zoom Modal */}
            {zoomedImage && (
                <div className="zoom-modal-overlay" onClick={closeZoom} style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '2rem',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="zoom-modal-content" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem',
                        position: 'relative'
                    }}>
                        <button onClick={closeZoom} style={{
                            position: 'absolute',
                            top: '-40px',
                            right: 0,
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '2rem',
                            cursor: 'pointer'
                        }}>×</button>

                        <img
                            src={zoomedImage.url}
                            alt="Zoomed"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '70vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                            }}
                        />

                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn-select"
                                onClick={() => {
                                    onSelect(zoomedImage);
                                    closeZoom();
                                }}
                                style={{ fontSize: '1.1rem', padding: '10px 30px' }}
                            >
                                これを選択
                            </button>
                            <button
                                className="btn-download"
                                onClick={() => onDownload(zoomedImage)}
                                style={{ fontSize: '1.1rem', padding: '10px 30px' }}
                            >
                                ダウンロード
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
