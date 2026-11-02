// Model catalogue shared by the chat panel and the settings panel.
// `hint` is a translation key (one word); ids keep the "provider:model" format.
export const DEFAULT_MODEL = 'anthropic:claude-sonnet-5-5';

export const PROVIDERS = [
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'gemini', label: 'Google Gemini' },
    { id: 'local', label: null }
];

export const MODELS = [
    { id: 'anthropic:claude-opus-5-5', name: 'Claude Opus 5.5', hint: 'mhHeavy' },
    { id: 'anthropic:claude-sonnet-5-5', name: 'Claude Sonnet 5.5', hint: 'mhBalanced' },
    { id: 'anthropic:claude-haiku-5-5', name: 'Claude Haiku 5.5', hint: 'mhFast' },
    { id: 'anthropic:claude-fable-5-1', name: 'Claude Fable 5.1', hint: 'mhCreative' },
    { id: 'openai:gpt-6-astra', name: 'GPT-6 Astra', hint: 'mhFlagship' },
    { id: 'openai:gpt-6.1-sol', name: 'GPT-6.1 Sol', hint: 'mhBalanced' },
    { id: 'openai:gpt-6-luna', name: 'GPT-6 Luna', hint: 'mhFast' },
    { id: 'openai:gpt-6.1-terra', name: 'GPT-6.1 Terra', hint: 'mhVision' },
    { id: 'gemini:gemini-4-argon', name: 'Gemini 4 Argon', hint: 'mhFlagship' },
    { id: 'gemini:gemini-3.8-flash', name: 'Gemini 3.8 Flash', hint: 'mhFast' },
    { id: 'gemini:gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', hint: 'mhLight' },
    { id: 'local:llama3', name: 'Llama 3', hint: 'mhLocal' },
    { id: 'local:llava', name: 'LLaVA', hint: 'mhVision' }
];

export const providerOf = (modelId) => String(modelId || '').split(':')[0];
export const providerLabel = (providerId, t) => {
    const p = PROVIDERS.find((x) => x.id === providerId);
    return p ? (p.label || t('providerLocal')) : providerId;
};
export const isKnownModel = (id) => MODELS.some((m) => m.id === id);
export const modelLabel = (m, t) => `${m.name} · ${t(m.hint)}`;
export const shortModel = (id, t) => {
    const m = MODELS.find((x) => x.id === id);
    return m ? m.name : `${id} (${t('legacy')})`;
};
