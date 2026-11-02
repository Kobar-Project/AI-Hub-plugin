import { usePluginChatStore } from './usePluginChatStore';
import { getTranslation } from './translations';
import { MODELS, PROVIDERS, DEFAULT_MODEL, providerOf, providerLabel, isKnownModel, modelLabel } from './models';

export const SettingsPanel = () => {
    const React = window.React;
    const { useState, useEffect } = React;
    const useAppStore = window.useAppStore;
    const currentLang = useAppStore(state => state.language);
    
    // We bind to the plugin's local store
    const apiKeys = usePluginChatStore(state => state.apiKeys);
    const setApiKeys = usePluginChatStore(state => state.setApiKeys);

    const t = (key) => getTranslation(currentLang, key);

    const fg1 = 'var(--kb-fg-1, #f1f5f9)';
    const fg2 = 'var(--kb-fg-2, #94a3b8)';
    const field = { width: '100%', background: 'var(--kb-bg-inset, rgba(0,0,0,0.4))', color: fg1, borderRadius: 16, padding: '10px 14px', fontSize: 14, border: 'none', outline: 'none' };
    const label = { fontSize: 12, color: fg2 };
    const card = { background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 };
    const title = { fontSize: 15, fontWeight: 600, color: fg1, fontFamily: 'var(--kb-font-display, inherit)', margin: 0 };
    const group = { display: 'flex', flexDirection: 'column', gap: 8 };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: fg1 }}>
            <section style={card}>
                <h3 style={title}>{t('modelDefaults')}</h3>
                <div style={group}>
                    <label style={label}>{t('defaultModel')}</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={apiKeys.defaultModel || DEFAULT_MODEL}
                            onChange={(e) => setApiKeys({ defaultModel: e.target.value })}
                            aria-label={t('defaultModel')}
                            style={{ ...field, appearance: 'none', WebkitAppearance: 'none', borderRadius: 999, padding: '10px 40px 10px 16px', fontWeight: 500, cursor: 'pointer' }}
                        >
                            {apiKeys.defaultModel && !isKnownModel(apiKeys.defaultModel) && <option value={apiKeys.defaultModel}>{`${apiKeys.defaultModel} (${t('legacy')})`}</option>}
                            {PROVIDERS.map(pr => (
                                <optgroup key={pr.id} label={providerLabel(pr.id, t)}>
                                    {MODELS.filter(m => providerOf(m.id) === pr.id).map(m => <option key={m.id} value={m.id}>{modelLabel(m, t)}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ position: 'absolute', right: 12, fontSize: 20, color: fg2, pointerEvents: 'none' }}>expand_more</span>
                    </div>
                </div>
            </section>

            <section style={card}>
                <h3 style={title}>{t('apiKeysProviders')}</h3>
                {[['anthropic', 'anthropicKeyLabel', 'sk-ant-...', 'keyHintAnthropic'], ['openai', 'openaiKeyLabel', 'sk-...', 'keyHintOpenai'], ['gemini', 'geminiKeyLabel', 'AIza...', 'keyHintGemini']].map(([k, lbl, ph, hint]) => (
                    <div key={k} style={group}>
                        <label style={label}>{t(lbl)}</label>
                        <input type="password" value={apiKeys[k] || ''} onChange={(e) => setApiKeys({ [k]: e.target.value })} placeholder={ph} style={field} />
                        <span style={{ fontSize: 11, color: fg2, opacity: 0.8 }}>{t(hint)}</span>
                    </div>
                ))}
                <div style={group}>
                    <label style={label}>{t('localUrlLabel')} (Ollama / LM Studio)</label>
                    <input type="text" value={apiKeys.localUrl || ''} onChange={(e) => setApiKeys({ localUrl: e.target.value })} placeholder="http://localhost:11434" style={field} />
                </div>
            </section>

            <section style={card}>
                <h3 style={title}>{t('promptCustomization')}</h3>
                <div style={group}>
                    <label style={label}>{t('systemMessageLabel')}</label>
                    <textarea value={apiKeys.systemMessage || ''} onChange={(e) => setApiKeys({ systemMessage: e.target.value })} placeholder="You are a helpful AI assistant..." className="custom-scrollbar" style={{ ...field, minHeight: 88, resize: 'vertical' }} />
                </div>
                <div style={group}>
                    <label style={label}>{t('customInstructionsLabel')}</label>
                    <textarea value={apiKeys.customInstructions || ''} onChange={(e) => setApiKeys({ customInstructions: e.target.value })} placeholder="User preferences..." className="custom-scrollbar" style={{ ...field, minHeight: 88, resize: 'vertical' }} />
                </div>
            </section>
        </div>
    );
};
