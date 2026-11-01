import { usePluginChatStore } from './usePluginChatStore';
import { getTranslation } from './translations';

const MODELS = [
    { id: 'anthropic:claude-sonnet-4-6', label: 'Claude 4.6 Sonnet (Anthropic - Best)' },
    { id: 'anthropic:claude-opus-4-6', label: 'Claude 4.6 Opus (Anthropic - Heavy)' },
    { id: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku (Anthropic - Fast)' },
    { id: 'local:llama3', label: 'Local Default (Ollama / LM Studio)' },
    { id: 'local:llava', label: 'Local Vision (Ollama - LLaVA)' }
];

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
                            value={apiKeys.defaultModel}
                            onChange={(e) => setApiKeys({ defaultModel: e.target.value })}
                            aria-label={t('defaultModel')}
                            style={{ ...field, appearance: 'none', WebkitAppearance: 'none', borderRadius: 999, padding: '10px 40px 10px 16px', fontWeight: 500, cursor: 'pointer' }}
                        >
                            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ position: 'absolute', right: 12, fontSize: 20, color: fg2, pointerEvents: 'none' }}>expand_more</span>
                    </div>
                </div>
            </section>

            <section style={card}>
                <h3 style={title}>{t('apiKeysProviders')}</h3>
                <div style={group}>
                    <label style={label}>{t('anthropicKeyLabel')}</label>
                    <input type="password" value={apiKeys.anthropic || ''} onChange={(e) => setApiKeys({ anthropic: e.target.value })} placeholder="sk-ant-..." style={field} />
                </div>
                <div style={{ ...group, opacity: 0.5 }}>
                    <label style={label}>{t('openaiKeyLabel')}</label>
                    <input disabled type="password" placeholder={t('comingSoon')} style={{ ...field, cursor: 'not-allowed' }} />
                </div>
                <div style={{ ...group, opacity: 0.5 }}>
                    <label style={label}>{t('geminiKeyLabel')}</label>
                    <input disabled type="password" placeholder={t('comingSoon')} style={{ ...field, cursor: 'not-allowed' }} />
                </div>
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
