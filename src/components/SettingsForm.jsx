import React from 'react';

const SettingsForm = ({ settings, setSettings }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="settings-form">
            <h3>画像設定</h3>

            <div className="form-group">
                <label>スタイル:</label>
                <div className="style-options">
                    <button
                        className={settings.style === 'photo' ? 'active' : ''}
                        onClick={() => setSettings(prev => ({ ...prev, style: 'photo' }))}
                    >
                        写真 (Photo)
                    </button>
                    <button
                        className={settings.style === 'illustration' ? 'active' : ''}
                        onClick={() => setSettings(prev => ({ ...prev, style: 'illustration' }))}
                    >
                        イラスト (Illustration)
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>人物の描画 (Person Inclusion):</label>
                <div className="style-options">
                    <button
                        className={!settings.allowPeople ? 'active' : ''}
                        onClick={() => setSettings(prev => ({ ...prev, allowPeople: false }))}
                        title="人物、人体の生成を禁止します"
                    >
                        禁止 (Not Allowed)
                    </button>
                    <button
                        className={settings.allowPeople ? 'active' : ''}
                        onClick={() => setSettings(prev => ({ ...prev, allowPeople: true }))}
                        title="人物の生成を許容します"
                    >
                        許可 (Allowed)
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label>サイズ (px):</label>
                <div className="dimension-inputs">
                    <input
                        type="number"
                        name="width"
                        value={settings.width}
                        onChange={handleChange}
                        placeholder="幅"
                    />
                    <span>x</span>
                    <input
                        type="number"
                        name="height"
                        value={settings.height}
                        onChange={handleChange}
                        placeholder="高さ"
                    />
                </div>
            </div>

            <div className="form-group">
                <label>コンテキスト (場面・詳細):</label>
                <div className="context-chips">
                    {['レストラン', '家庭料理', 'ピクニック', 'フレンチ', '和食', 'ディナー', 'ランチ', '高級感', '湯気'].map(tag => (
                        <span
                            key={tag}
                            className={`chip ${settings.context.includes(tag) ? 'active' : ''}`}
                            onClick={() => {
                                const newContext = settings.context.includes(tag)
                                    ? settings.context.filter(c => c !== tag)
                                    : [...settings.context, tag];
                                setSettings(prev => ({ ...prev, context: newContext }));
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                    {/* Custom tags added by user */}
                    {settings.context.filter(t => !['レストラン', '家庭料理', 'ピクニック', 'フレンチ', '和食', 'ディナー', 'ランチ', '高級感', '湯気'].includes(t)).map(tag => (
                        <span
                            key={tag}
                            className="chip active custom-chip"
                            onClick={() => {
                                // Remove custom tag
                                setSettings(prev => ({ ...prev, context: prev.context.filter(c => c !== tag) }));
                            }}
                        >
                            {tag} ×
                        </span>
                    ))}
                </div>

                <div className="custom-context-input" style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="その他、自由に追加 (例: 朝食, 木製テーブル)"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.target.value.trim();
                                if (val && !settings.context.includes(val)) {
                                    setSettings(prev => ({ ...prev, context: [...prev.context, val] }));
                                    e.target.value = "";
                                }
                            }
                        }}
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
                    />
                    <button
                        className="btn-small"
                        onClick={(e) => {
                            const input = e.target.previousSibling;
                            const val = input.value.trim();
                            if (val && !settings.context.includes(val)) {
                                setSettings(prev => ({ ...prev, context: [...prev.context, val] }));
                                input.value = "";
                            }
                        }}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        追加
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsForm;
