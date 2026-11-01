import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { usePluginChatStore } from './usePluginChatStore';
import { getTranslation } from './translations';
import { setBarState } from './barState';

// ---- Shared design tokens (every token has a fallback so older hosts still render) ----
const fg1 = 'var(--kb-fg-1, #f1f5f9)';
const fg2 = 'var(--kb-fg-2, #94a3b8)';
const stroke = 'var(--kb-stroke-subtle, var(--theme-border))';
const accent = 'var(--kb-accent, var(--theme-primary))';
const tonal = { background: 'var(--kb-bg-container, var(--theme-accent-glow))', color: 'var(--kb-on-container, #fff)' };
const inset = 'var(--kb-bg-inset, rgba(0,0,0,0.4))';
const display = 'var(--kb-font-display, inherit)';
const mono = "var(--kb-font-mono, ui-monospace, 'Cascadia Code', Consolas, monospace)";

const MODELS = [
    { id: 'anthropic:claude-sonnet-4-6', label: 'Claude 4.6 Sonnet (Anthropic - Best)', short: 'Claude Sonnet 4.6' },
    { id: 'anthropic:claude-opus-4-6', label: 'Claude 4.6 Opus (Anthropic - Heavy)', short: 'Claude Opus 4.6' },
    { id: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku (Anthropic - Fast)', short: 'Claude Haiku 4.5' },
    { id: 'local:llama3', label: 'Local Default (Ollama / LM Studio)', short: 'Local (Llama 3)' },
    { id: 'local:llava', label: 'Local Vision (Ollama - LLaVA)', short: 'Local vision (LLaVA)' }
];
const shortModel = (id) => MODELS.find((m) => m.id === id)?.short || id;

const WIDE = 560; // from this panel width the history is a fixed column instead of its own view

const iconBtn = (extra) => ({
    width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, background: 'var(--kb-bg-tile, rgba(255,255,255,0.06))', color: fg1, border: 'none', ...extra
});
const fieldStyle = { width: '100%', background: inset, color: fg1, borderRadius: 16, padding: '10px 14px', fontSize: 14, border: 'none', outline: 'none', userSelect: 'text' };
const labelStyle = { fontSize: 12, color: fg2 };
const cardStyle = { background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 };
const cardTitle = { fontSize: 15, fontWeight: 600, color: fg1, fontFamily: display, margin: 0 };
const pillBtn = { borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', ...tonal };
const group = { display: 'flex', flexDirection: 'column', gap: 8 };

const Icon = ({ name, size = 20, style }) => (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size, ...style }}>{name}</span>
);

const IconTile = ({ size, icon, src }) => (
    <div style={{ width: size, height: size, borderRadius: size >= 60 ? 22 : 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tonal }}>
        {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name={icon} size={size >= 60 ? 32 : 24} style={{ color: accent }} />}
    </div>
);

const Avatar = ({ src, icon, ai }) => (
    <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 2, ...(ai ? tonal : { background: 'var(--kb-bg-tile, #334155)', color: fg1 }) }}>
        {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name={icon} size={16} style={{ color: ai ? accent : fg1 }} />}
    </div>
);

const ModelSelect = ({ value, onChange, ariaLabel, chip, full }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0, flex: chip ? '0 1 auto' : undefined }}>
        <select
            value={value}
            onChange={onChange}
            aria-label={ariaLabel}
            style={chip
                ? { ...fieldStyle, width: 'auto', maxWidth: '100%', background: 'var(--kb-bg-tile, rgba(255,255,255,0.06))', appearance: 'none', WebkitAppearance: 'none', borderRadius: 999, padding: '8px 32px 8px 14px', fontSize: 13, fontWeight: 500, textOverflow: 'ellipsis' }
                : { ...fieldStyle, appearance: 'none', WebkitAppearance: 'none', borderRadius: 999, padding: '9px 40px 9px 16px', fontWeight: 500, textOverflow: 'ellipsis' }}
        >
            {MODELS.map((m) => <option key={m.id} value={m.id}>{full ? m.label : m.short}</option>)}
        </select>
        <Icon name="expand_more" size={chip ? 18 : 20} style={{ position: 'absolute', right: chip ? 8 : 12, color: fg2, pointerEvents: 'none' }} />
    </div>
);

const preprocessMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\\\*/g, '*')
        .replace(/\*\*\s+(.*?)\s+\*\*/g, '**$1**')
        .replace(/(^|\s)\*\s+(.*?)\s+\*(\s|$)/g, '$1*$2*$3');
};

const ResizerHandle = ({ direction, edgePosition, startDrag }) => {
    const base = { position: 'absolute', zIndex: 50, WebkitAppRegion: 'no-drag' };
    const side = edgePosition === 'right' ? { left: -12 } : { right: -12 };
    const style = direction === 'side'
        ? { ...base, top: 0, bottom: 0, width: 24, cursor: 'ew-resize', ...side }
        : direction === 'bottom'
            ? { ...base, bottom: -12, left: 0, right: 0, height: 24, cursor: 'ns-resize' }
            : { ...base, bottom: -12, width: 24, height: 24, cursor: 'nwse-resize', ...side };
    return <div onMouseDown={(e) => startDrag(e, direction)} className="resizer-handle ai-resizer" style={style} />;
};

const MarkdownBody = ({ text, t }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            strong: ({ node, ...props }) => <strong style={{ fontWeight: 700 }} {...props} />,
            p: ({ node, ...props }) => <p style={{ margin: '0 0 12px' }} {...props} />,
            ul: ({ node, ...props }) => <ul style={{ listStyle: 'disc', paddingLeft: 20, margin: '0 0 12px' }} {...props} />,
            ol: ({ node, ...props }) => <ol style={{ listStyle: 'decimal', paddingLeft: 20, margin: '0 0 12px' }} {...props} />,
            li: ({ node, ...props }) => <li style={{ marginBottom: 4 }} {...props} />,
            a: ({ node, ...props }) => <a style={{ color: accent, textDecoration: 'underline' }} {...props} />,
            h1: ({ node, ...props }) => <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: display, margin: '0 0 12px' }} {...props} />,
            h2: ({ node, ...props }) => <h2 style={{ fontSize: 17, fontWeight: 700, fontFamily: display, margin: '0 0 12px' }} {...props} />,
            h3: ({ node, ...props }) => <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }} {...props} />,
            em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
            table: ({ node, ...props }) => <div style={{ overflowX: 'auto', margin: '0 0 12px' }}><table style={{ borderCollapse: 'collapse', fontSize: 13 }} {...props} /></div>,
            th: ({ node, ...props }) => <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${stroke}` }} {...props} />,
            td: ({ node, ...props }) => <td style={{ padding: '6px 10px', borderBottom: `1px solid ${stroke}` }} {...props} />,
            pre: ({ node, children, ...props }) => <pre style={{ margin: 0, userSelect: 'text' }} {...props}>{children}</pre>,
            code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : 'text';
                const body = String(children).replace(/\n$/, '');
                return !inline && (match || body.includes('\n')) ? (
                    <div className="no-drag-region" style={{ borderRadius: 16, overflow: 'hidden', margin: '4px 0 14px', background: '#1e1e1e', color: '#d4d4d4', userSelect: 'text' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 4px 14px', background: 'rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: mono }}>{language}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.api?.writeToClipboard?.({ type: 'text', content: body });
                                }}
                                className="ai-btn ai-code-copy"
                                style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#d4d4d4', border: 'none' }}
                                title={t('copyToOsClipboard')}
                                aria-label={t('copyToOsClipboard')}
                            >
                                <Icon name="content_copy" size={16} />
                            </button>
                        </div>
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                            customStyle={{ userSelect: 'text', margin: 0, padding: 14, background: 'transparent', fontSize: 12.5, fontFamily: mono }}
                            codeTagProps={{ style: { fontFamily: mono } }}
                        >
                            {body}
                        </SyntaxHighlighter>
                    </div>
                ) : (
                    <code style={{ userSelect: 'text', fontSize: 12.5, padding: '2px 6px', background: inset, color: fg1, borderRadius: 8, fontFamily: mono }} {...props}>
                        {children}
                    </code>
                );
            }
        }}
    >
        {preprocessMarkdown(text)}
    </ReactMarkdown>
);

/** Chat list: search, new chat, rows with rename and delete. Used as a fixed column (wide) or as its own view. */
const HistoryList = ({ t, chats, activeChatId, onPick, onNew, onRename, onDelete, editingChatId, editTitle, setEditTitle, saveTitle, cancelEdit, editInputRef, primaryNew }) => {
    const { useState } = window.React;
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const shown = q ? chats.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => (m.content || '').toLowerCase().includes(q))) : chats;
    const label = (c) => (c.title === 'New Chat' ? t('newChat') : c.title);
    const snippet = (c) => {
        const last = [...c.messages].reverse().find((m) => (m.content || '').trim());
        return last ? last.content.replace(/\s+/g, ' ').slice(0, 60) : '';
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, gap: 12 }}>
            <button
                onClick={onNew}
                className="ai-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 999, border: 'none', fontSize: 14, fontWeight: 600, flexShrink: 0, ...(primaryNew ? { background: accent, color: 'var(--kb-on-accent, #fff)' } : tonal) }}
            >
                <Icon name="add" size={20} />
                <span>{t('newChat')}</span>
            </button>
            {chats.length > 7 && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Icon name="search" size={18} style={{ position: 'absolute', left: 14, top: 11, color: fg2, pointerEvents: 'none' }} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('searchChats')}
                        aria-label={t('searchChats')}
                        style={{ ...fieldStyle, borderRadius: 999, padding: '9px 14px 9px 40px' }}
                    />
                </div>
            )}
            <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shown.length === 0 && <span style={{ fontSize: 13, color: fg2, padding: '8px 4px' }}>{t('noResults')}</span>}
                {shown.map((c) => {
                    const active = activeChatId === c.id;
                    return (
                        <div
                            key={c.id}
                            onClick={() => onPick(c.id)}
                            onDoubleClick={() => onRename(c.id, c.title)}
                            className={`ai-row ${active ? '' : 'ai-row-idle'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 56, padding: '6px 6px 6px 14px', borderRadius: 16, cursor: 'pointer', userSelect: 'none', flexShrink: 0, ...(active ? tonal : { background: 'var(--kb-bg-tile, rgba(255,255,255,0.04))', color: fg1 }) }}
                        >
                            {editingChatId === c.id ? (
                                <input
                                    ref={editInputRef}
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onBlur={() => saveTitle(c.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveTitle(c.id);
                                        if (e.key === 'Escape') { e.stopPropagation(); cancelEdit(); }
                                    }}
                                    aria-label={t('rename')}
                                    style={{ ...fieldStyle, padding: '6px 10px', borderRadius: 12 }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(c)}</span>
                                        {snippet(c) && <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? 'var(--kb-on-container, #fff)' : fg2, opacity: active ? 0.8 : 1 }}>{snippet(c)}</span>}
                                    </div>
                                    <div className="ai-row-actions" style={{ display: 'flex', flexShrink: 0 }}>
                                        <button onClick={(e) => { e.stopPropagation(); onRename(c.id, c.title); }} className="ai-btn" title={t('rename')} aria-label={t('rename')} style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: active ? 'var(--kb-on-container, #fff)' : fg2, border: 'none' }}>
                                            <Icon name="edit" size={18} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="ai-btn" title={t('remove')} aria-label={t('remove')} style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: active ? 'var(--kb-on-container, #fff)' : fg2, border: 'none' }}>
                                            <Icon name="delete" size={18} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AiHubPanel = ({ onClose, anchorRect }) => {
    const React = window.React;
    const { useState, useEffect, useRef } = React;
    const useAppStore = window.useAppStore;

    const edgePosition = useAppStore(state => state.edgePosition);
    const design = useAppStore(state => state.design);
    const glassOpacity = useAppStore(state => state.glassOpacity);
    const currentLang = useAppStore(state => state.language);
    const t = (key) => getTranslation(currentLang, key);
    const isMac = useAppStore(state => state.isMac);
    const screenBounds = useAppStore(state => state.screenBounds);
    const sidebarPosition = useAppStore(state => state.sidebarPosition);
    const orientation = useAppStore(state => state.orientation);

    const {
        chats, activeChatId, apiKeys, panelSize, setActiveChatId, createChat,
        deleteChat, addMessage, appendStreamToMessage, updateChatTitle,
        aiAvatar, userAvatar, setAiAvatar, setUserAvatar, setPanelSize
    } = usePluginChatStore();

    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [view, setView] = useState('chat'); // 'chat' | 'history' | 'settings'
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingMessageId, setGeneratingMessageId] = useState(null);
    const [dragging, setDragging] = useState(false);

    const [aiHubWidth, setAiHubWidth] = useState(panelSize?.width || 600);
    const [aiHubHeight, setAiHubHeight] = useState(panelSize?.height || 600);

    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const dragDepth = useRef(0);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

    // Title editing
    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef(null);

    const messagesScrollRef = useRef(null);
    const activeChat = chats.find(c => c.id === activeChatId) || null;
    const wide = aiHubWidth >= WIDE;

    useEffect(() => {
        if (!activeChatId && chats.length > 0) setActiveChatId(chats[0].id);
        else if (chats.length === 0) createChat();
        // Opening the panel means the reply was seen and a past error was read.
        setBarState({ unread: false, error: false });
        setTimeout(() => inputRef.current?.focus(), 60);
    }, []);

    useEffect(() => {
        if (isAutoScrollEnabled && messagesScrollRef.current) {
            messagesScrollRef.current.scrollTo({
                top: messagesScrollRef.current.scrollHeight,
                behavior: 'auto'
            });
        }
    }, [activeChat?.messages.length, activeChat?.messages[activeChat?.messages.length - 1]?.content, isAutoScrollEnabled, view]);

    const getPopupStyle = () => {
        if (!anchorRect) return { display: 'none' };

        const screenHeight = screenBounds?.height ?? 800;
        const screenWidth = screenBounds?.width ?? 1200;
        const offsetTop = sidebarPosition ? sidebarPosition.y : 0;
        const offsetLeft = sidebarPosition ? sidebarPosition.x : 0;

        const style = {
            position: 'absolute',
            zIndex: 99999,
            width: `${aiHubWidth}px`,
            height: `${aiHubHeight}px`,
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: design === 'style2'
                ? `color-mix(in srgb, var(--kb-bg-shell, var(--theme-bg-dark)) ${glassOpacity}%, transparent)`
                : 'var(--kb-bg-shell, var(--theme-bg-dark))',
            borderColor: stroke,
            borderWidth: '1px',
            borderStyle: 'solid',
            backdropFilter: design === 'style2' ? (isMac ? 'blur(8px)' : 'blur(20px)') : 'none',
            WebkitBackdropFilter: design === 'style2' ? (isMac ? 'blur(8px)' : 'blur(20px)') : 'none',
            boxShadow: 'var(--kb-shadow-e3, 0 10px 40px rgba(0,0,0,0.5))',
            maxHeight: `${Math.floor((screenBounds?.height ?? 800) - 60)}px`,
            willChange: 'transform, opacity'
        };

        const screenXInViewport = (screenBounds?.x ?? 0) - window.screenX;
        const screenYInViewport = (screenBounds?.y ?? 0) - window.screenY;

        if (orientation === "horizontal") {
            let adjustedLeft = (anchorRect.left - offsetLeft) + (anchorRect.width / 2) - (aiHubWidth / 2);
            const maxLeft = screenXInViewport + (screenWidth - offsetLeft) - aiHubWidth - 20;
            const minLeft = screenXInViewport - offsetLeft + 20;
            if (adjustedLeft < minLeft) adjustedLeft = minLeft;
            if (adjustedLeft > maxLeft) adjustedLeft = maxLeft;

            style.left = `${adjustedLeft}px`;

            if (edgePosition === 'top') {
                style.top = '100%';
                style.marginTop = '12px';
            } else {
                style.bottom = '100%';
                style.marginBottom = '12px';
            }
        } else {
            let adjustedTop = (anchorRect.top - offsetTop) - 20 + (anchorRect.height / 2) - (aiHubHeight / 2);
            const maxTop = screenYInViewport + (screenHeight - offsetTop) - aiHubHeight - 20;
            const minTop = screenYInViewport - offsetTop + 20;
            if (adjustedTop < minTop) adjustedTop = minTop;
            if (adjustedTop > maxTop) adjustedTop = maxTop;

            style.top = `${adjustedTop}px`;

            if (edgePosition === 'left') {
                style.left = '100%';
                style.marginLeft = '12px';
            } else {
                style.right = '100%';
                style.marginRight = '12px';
            }
        }
        return style;
    };

    const handleAvatarUpload = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            if (type === 'ai') setAiAvatar(base64);
            else setUserAvatar(base64);
        };
        reader.readAsDataURL(file);
    };

    const startDrag = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = aiHubWidth;
        const startH = aiHubHeight;

        let lastW = startW;
        let lastH = startH;

        const onMouseMove = (moveEvent) => {
            let newW = startW;
            let newH = startH;
            if (direction === 'side' || direction === 'corner') {
                const deltaX = edgePosition === 'right' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
                newW = Math.max(300, startW + deltaX);
            }
            if (direction === 'bottom' || direction === 'corner') {
                const deltaY = moveEvent.clientY - startY;
                newH = Math.max(400, startH + deltaY);
            }
            lastW = newW;
            lastH = newH;
            setAiHubWidth(newW);
            setAiHubHeight(newH);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setPanelSize(lastW, lastH);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleSend = async () => {
        if (!input.trim() && attachments.length === 0) return;
        if (isGenerating) return;

        let currentChatId = activeChatId;
        const selectedModelString = activeChat?.model || 'openai:gpt-4o';
        const [provider, model] = selectedModelString.split(':');

        if (!currentChatId || !activeChat) {
            currentChatId = createChat(selectedModelString);
            setActiveChatId(currentChatId);
        }

        const userMsgId = crypto.randomUUID();
        let attArray = undefined;

        if (attachments.length > 0) {
            attArray = attachments.map(a => a.content);
        }

        addMessage(currentChatId, {
            id: userMsgId,
            role: 'user',
            content: input.trim(),
            attachments: attArray
        });

        // Generate title if new chat AND title is still default
        const currentChatRefreshed = usePluginChatStore.getState().chats.find(c => c.id === currentChatId);
        if (currentChatRefreshed && currentChatRefreshed.title === 'New Chat' && currentChatRefreshed.messages.length === 1 && currentChatRefreshed.messages[0].role === 'user') {
            const newTitle = input.trim().substring(0, 30) + (input.trim().length > 30 ? '...' : '');
            updateChatTitle(currentChatId, newTitle);
        }

        setInput('');
        setAttachments([]);
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setIsGenerating(true);
        setBarState({ busy: true, error: false });

        const aiMsgId = crypto.randomUUID();
        setGeneratingMessageId(aiMsgId);
        addMessage(currentChatId, {
            id: aiMsgId,
            role: 'assistant',
            content: ''
        });

        // Prepare messages for IPC
        const payloadMessages = (usePluginChatStore.getState().chats.find(c => c.id === currentChatId)?.messages || []).slice(0, -1).map((m, index, array) => {
            const isLastMessage = index === array.length - 1;

            if (m.attachments && m.attachments.length > 0) {
                const imageAttachments = m.attachments.filter(att => att.startsWith('data:image'));
                const textAttachments = m.attachments.filter(att => !att.startsWith('data:image'));

                let combinedText = m.content && m.content.trim() !== '' ? m.content : 'Please analyze this.';
                if (textAttachments.length > 0) {
                    combinedText += '\n\n[Attached Document Content]:\n' + textAttachments.join('\n\n---\n\n');
                }

                if (!isLastMessage && imageAttachments.length > 0) {
                    combinedText += '\n\n[Image attached previously]';
                    return { role: m.role, content: combinedText };
                }

                if (imageAttachments.length === 0) {
                    return { role: m.role, content: combinedText };
                }

                const contentArray = [];
                contentArray.push({ type: 'text', text: combinedText });

                imageAttachments.forEach(att => {
                    contentArray.push({
                        type: 'image_url',
                        image_url: { url: att }
                    });
                });

                return {
                    role: m.role,
                    content: contentArray
                };
            }

            return {
                role: m.role,
                content: m.content
            };
        });

        try {
            const cleanupChunk = window.api?.onLlmStreamChunk((data) => {
                if (data.messageId === aiMsgId) {
                    appendStreamToMessage(data.chatId, data.messageId, data.chunk);
                }
            });

            const cleanupEnd = window.api?.onLlmStreamEnd((data) => {
                if (data.messageId === aiMsgId) {
                    setIsGenerating(false);
                    setGeneratingMessageId(null);
                    if (cleanupChunk) cleanupChunk();
                    if (cleanupEnd) cleanupEnd();
                    if (cleanupErr) cleanupErr();
                }
            });

            const cleanupErr = window.api?.onLlmStreamError((data) => {
                if (data.messageId === aiMsgId) {
                    appendStreamToMessage(data.chatId, data.messageId, `\n\n**Error:** ${data.error}`);
                    setIsGenerating(false);
                    setGeneratingMessageId(null);
                    if (cleanupChunk) cleanupChunk();
                    if (cleanupEnd) cleanupEnd();
                    if (cleanupErr) cleanupErr();
                }
            });

            const currentApiKeys = usePluginChatStore.getState().apiKeys;
            const combinedSystemPrompt = [
                currentApiKeys.systemMessage || "You are a helpful AI assistant. Provide concise, accurate answers. Output markdown securely.",
                currentApiKeys.customInstructions ? `USER CONTEXT:\n${currentApiKeys.customInstructions}` : ""
            ].filter(Boolean).join("\n\n---\n\n");

            await window.api?.llmRequest({
                chatId: currentChatId,
                messageId: aiMsgId,
                provider,
                model,
                messages: payloadMessages || [],
                apiKeys: currentApiKeys,
                systemPrompt: combinedSystemPrompt
            });
        } catch (e) {
            setIsGenerating(false);
            setGeneratingMessageId(null);
            setBarState({ busy: false });
        }
    };

    const handleCancel = () => {
        if (generatingMessageId) {
            window.api?.cancelLlmRequest(generatingMessageId);
            setIsGenerating(false);
            setGeneratingMessageId(null);
            setBarState({ busy: false });
        }
    };

    const handleCopy = (text) => {
        window.api?.writeToClipboard?.({ type: 'text', content: text });
    };

    const handleSendToSlot = (text) => {
        // Send to clipboard directly as a workaround since forceAddClipboardItem is not exposed
        window.api?.writeToClipboard?.({ type: 'text', content: text });
        window.api?.sendNotification?.('Sent to Clipboard', 'The text has been copied successfully.');
    };

    const startEditingTitle = (id, currentTitle) => {
        setEditingChatId(id);
        setEditTitle(currentTitle === 'New Chat' ? t('newChat') : currentTitle);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const saveTitle = (id) => {
        if (editTitle.trim()) {
            updateChatTitle(id, editTitle.trim());
        }
        setEditingChatId(null);
    };

    const onInput = (e) => {
        const val = e.target.value;
        setInput(val);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
    };

    const addFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        for (const file of files) {
            const filePath = window.api?.getFilePath(file) || file.path;
            if (filePath) {
                const res = await window.api?.parseFile(filePath);
                if (res && res.type !== 'error') {
                    setAttachments(prev => [...prev, { name: file.name, content: res.content, type: res.type }]);
                }
            }
        }
    };

    const onDrop = async (e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        await addFiles(e.dataTransfer.files);
    };

    const selectedModel = activeChat?.model || 'openai:gpt-4o';
    const needsKey = selectedModel.startsWith('anthropic:') && !apiKeys?.anthropic;
    const chatTitle = activeChat ? (activeChat.title === 'New Chat' ? t('newChat') : activeChat.title) : t('newChat');
    const setKeys = (patch) => usePluginChatStore.getState().setApiKeys(patch);
    const canSend = Boolean(input.trim()) || attachments.length > 0;

    const changeModel = (e) => {
        if (activeChat) {
            usePluginChatStore.setState(s => ({
                chats: s.chats.map(c => c.id === activeChat.id ? { ...c, model: e.target.value } : c)
            }));
        } else {
            createChat(e.target.value);
        }
    };

    const historyProps = {
        t, chats, activeChatId, editingChatId, editTitle, setEditTitle, saveTitle, editInputRef,
        cancelEdit: () => setEditingChatId(null),
        onRename: startEditingTitle,
        onDelete: (id) => deleteChat(id),
        onNew: () => { createChat(); setView('chat'); setTimeout(() => inputRef.current?.focus(), 60); },
        onPick: (id) => { setActiveChatId(id); setView('chat'); }
    };

    // Esc: leave the secondary view first, then close the panel.
    const onKeyDown = (e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (view !== 'chat') setView('chat');
        else onClose?.();
    };

    const subtle = (extra) => ({ background: 'transparent', color: fg2, border: 'none', ...extra });

    const header = view === 'chat' ? (
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <IconTile size={44} icon="auto_awesome" />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {editingChatId && editingChatId === activeChatId ? (
                    <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveTitle(activeChatId)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle(activeChatId);
                            if (e.key === 'Escape') { e.stopPropagation(); setEditingChatId(null); }
                        }}
                        aria-label={t('rename')}
                        style={{ ...fieldStyle, padding: '4px 10px', borderRadius: 12, fontSize: 17, fontWeight: 600 }}
                    />
                ) : (
                    <h2
                        onDoubleClick={() => activeChat && startEditingTitle(activeChat.id, activeChat.title)}
                        title={t('rename')}
                        style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: 1.25, color: fg1, fontFamily: display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >{chatTitle}</h2>
                )}
                <span style={{ fontSize: 12, color: fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortModel(selectedModel)}</span>
            </div>
            <button onClick={() => createChat()} className="ai-btn" title={t('newChat')} aria-label={t('newChat')} style={iconBtn()}>
                <Icon name="add" />
            </button>
            {!wide && (
                <button onClick={() => setView('history')} className="ai-btn" title={t('history')} aria-label={t('history')} style={iconBtn()}>
                    <Icon name="history" />
                </button>
            )}
            <button onClick={() => setView('settings')} className="ai-btn" title={t('aiHubSettings')} aria-label={t('aiHubSettings')} style={iconBtn()}>
                <Icon name="settings" />
            </button>
            <button onClick={onClose} className="ai-btn" title={t('closeLabel')} aria-label={t('closeLabel')} style={iconBtn(tonal)}>
                <Icon name="close" />
            </button>
        </div>
    ) : (
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={() => setView('chat')} className="ai-btn" title={t('backToChat')} aria-label={t('backToChat')} style={iconBtn()}>
                <Icon name="arrow_back" />
            </button>
            <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 19, fontWeight: 600, color: fg1, fontFamily: display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view === 'history' ? t('history') : t('aiHubSettings')}
            </h2>
            <button onClick={onClose} className="ai-btn" title={t('closeLabel')} aria-label={t('closeLabel')} style={iconBtn(tonal)}>
                <Icon name="close" />
            </button>
        </div>
    );

    const messages = activeChat?.messages || [];

    const chatView = (
        <>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div
                    ref={messagesScrollRef}
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        setIsAutoScrollEnabled(scrollHeight - scrollTop - clientHeight < 150);
                    }}
                    className="custom-scrollbar pointer-events-auto select-auto no-drag-region"
                    style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '4px 20px 12px', gap: 10 }}
                >
                    {messages.length === 0 ? (
                        <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', userSelect: 'none' }}>
                            <IconTile size={64} icon="auto_awesome" />
                            <span style={{ fontSize: 17, fontWeight: 600, color: fg1, fontFamily: display }}>{t('kobarAiHub')}</span>
                            <span style={{ fontSize: 14, color: fg2, maxWidth: 300 }}>{t('replyHint')}</span>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isUser = msg.role === 'user';
                            const waiting = !isUser && !msg.content && isGenerating && msg.id === generatingMessageId;
                            return (
                                <div key={msg.id} className="ai-msg" style={{ display: 'flex', gap: 10, width: '100%', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                                    {!isUser && <Avatar src={aiAvatar} icon="smart_toy" ai />}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: isUser ? '85%' : 'calc(100% - 38px)', minWidth: 0, flex: isUser ? undefined : 1, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                                        <div
                                            className="ai-chat-selectable"
                                            style={{ minWidth: 0, maxWidth: '100%', userSelect: 'text', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word', color: fg1, ...(isUser ? { ...tonal, padding: '10px 16px', borderRadius: 20, borderTopRightRadius: 6 } : { padding: '2px 0' }) }}
                                        >
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: inset, color: 'inherit' }}>+{msg.attachments.length} {t('filesAttached')}</span>
                                                </div>
                                            )}
                                            {waiting ? (
                                                <span style={{ color: fg2, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="more_horiz" size={20} />{t('thinking')}</span>
                                            ) : (
                                                <div className="ai-md"><MarkdownBody text={msg.content} t={t} /></div>
                                            )}
                                        </div>
                                        {!waiting && (
                                            <div className="ai-msg-actions" style={{ display: 'flex', gap: 2 }}>
                                                <button onClick={() => handleSendToSlot(msg.content)} className="ai-btn" title={t('sendToSlot')} aria-label={t('sendToSlot')} style={subtle({ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                                                    <Icon name="dynamic_feed" size={16} />
                                                </button>
                                                <button onClick={() => handleCopy(msg.content)} className="ai-btn" title={t('copyText')} aria-label={t('copyText')} style={subtle({ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                                                    <Icon name="content_copy" size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {isUser && <Avatar src={userAvatar} icon="person" />}
                                </div>
                            );
                        })
                    )}
                </div>
                {!isAutoScrollEnabled && messages.length > 0 && (
                    <button
                        onClick={() => {
                            setIsAutoScrollEnabled(true);
                            messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: 'smooth' });
                        }}
                        className="ai-btn"
                        title={t('scrollBottom')}
                        aria-label={t('scrollBottom')}
                        style={{ ...iconBtn(), position: 'absolute', right: 20, bottom: 8, background: 'var(--kb-bg-surface, #1f2937)', boxShadow: 'var(--kb-shadow-e2, 0 4px 14px rgba(0,0,0,0.35))' }}
                    >
                        <Icon name="arrow_downward" />
                    </button>
                )}
            </div>

            <div className="pointer-events-auto" style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                {needsKey && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 16px', borderRadius: 20, background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))' }}>
                        <Icon name="key" size={22} style={{ color: accent, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: fg1 }}>{t('noKeyTitle')}</span>
                            <span style={{ fontSize: 12, color: fg2, lineHeight: 1.4 }}>{t('noKeyBody')}</span>
                        </div>
                        <button onClick={() => setView('settings')} className="ai-btn" style={{ ...pillBtn, padding: '8px 14px', flexShrink: 0 }}>{t('openKeys')}</button>
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', background: inset, borderRadius: 28, padding: '8px 8px 8px 8px' }}>
                    {attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 6px 6px' }}>
                            {attachments.map((a, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 2px 10px', fontSize: 12, color: fg1, borderRadius: 999, background: 'var(--kb-bg-tile, rgba(255,255,255,0.08))' }}>
                                    <Icon name={a.type === 'image' ? 'image' : 'description'} size={14} style={{ color: accent }} />
                                    <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ai-btn" aria-label={t('remove')} title={t('remove')} style={subtle({ width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                                        <Icon name="close" size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={onInput}
                        placeholder={t('typeMessage')}
                        aria-label={t('typeMessage')}
                        className="custom-scrollbar select-auto pointer-events-auto"
                        rows={1}
                        style={{ width: '100%', minHeight: 40, maxHeight: 160, overflowY: 'auto', padding: '9px 12px', borderRadius: 0, background: 'transparent', color: fg1, fontSize: 14, lineHeight: 1.5, border: 'none', outline: 'none', resize: 'none', userSelect: 'text' }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={async (e) => { await addFiles(e.target.files); e.target.value = ''; }} />
                        <button onClick={() => fileInputRef.current?.click()} className="ai-btn" title={t('attachFile')} aria-label={t('attachFile')} style={subtle({ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                            <Icon name="attach_file" />
                        </button>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                            <ModelSelect chip value={selectedModel} ariaLabel={t('defaultModel')} onChange={changeModel} />
                        </div>
                        {isGenerating ? (
                            <button onClick={handleCancel} className="ai-btn" title={t('stopLabel')} aria-label={t('stopLabel')} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', ...tonal }}>
                                <Icon name="stop" />
                            </button>
                        ) : (
                            <button onClick={handleSend} disabled={!canSend} title={t('typeMessage')} aria-label={t('typeMessage')} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', background: accent, color: 'var(--kb-on-accent, #fff)', opacity: canSend ? 1 : 'var(--kb-opacity-disabled, 0.5)' }}>
                                <Icon name="arrow_upward" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    const AvatarRow = ({ type, src, icon, label }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <IconTile size={64} icon={icon} src={src} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <span style={labelStyle}>{label}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={pillBtn}>
                        {t('change')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarUpload(e, type)} />
                    </label>
                    {src && (
                        <button onClick={() => (type === 'ai' ? setAiAvatar(null) : setUserAvatar(null))} style={{ ...pillBtn, background: 'var(--kb-bg-tile, rgba(255,255,255,0.06))', color: 'var(--kb-danger, #ef4444)' }}>
                            {t('remove')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const settingsView = (
        <>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 12px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
                <section style={cardStyle}>
                    <h3 style={cardTitle}>{t('modelDefaults')}</h3>
                    <div style={group}>
                        <label style={labelStyle}>{t('defaultModel')}</label>
                        <ModelSelect full value={apiKeys?.defaultModel || 'anthropic:claude-sonnet-4-6'} ariaLabel={t('defaultModel')} onChange={(e) => setKeys({ defaultModel: e.target.value })} />
                    </div>
                </section>

                <section id="ai-keys" style={cardStyle}>
                    <h3 style={cardTitle}>{t('apiKeysProviders')}</h3>
                    <div style={{ ...group, opacity: 0.5 }}>
                        <label style={labelStyle}>{t('openaiKeyLabel')}</label>
                        <input disabled type="password" placeholder={t('willBeAddedSoon')} style={{ ...fieldStyle, cursor: 'not-allowed' }} />
                    </div>
                    <div style={{ ...group, opacity: 0.5 }}>
                        <label style={labelStyle}>{t('geminiKeyLabel')}</label>
                        <input disabled type="password" placeholder={t('willBeAddedSoon')} style={{ ...fieldStyle, cursor: 'not-allowed' }} />
                    </div>
                    <div style={group}>
                        <label style={labelStyle}>{t('anthropicKeyLabel')}</label>
                        <input type="password" value={apiKeys?.anthropic || ''} onChange={(e) => setKeys({ anthropic: e.target.value })} placeholder="sk-ant-..." style={fieldStyle} />
                    </div>
                    <div style={group}>
                        <label style={labelStyle}>{t('localUrlLabel')}</label>
                        <input type="text" value={apiKeys?.localUrl || ''} onChange={(e) => setKeys({ localUrl: e.target.value })} placeholder="http://localhost:11434" style={fieldStyle} />
                    </div>
                </section>

                <section style={cardStyle}>
                    <h3 style={cardTitle}>{t('profileCustomization')}</h3>
                    <AvatarRow type="ai" src={aiAvatar} icon="smart_toy" label={t('aiAvatar')} />
                    <AvatarRow type="user" src={userAvatar} icon="person" label={t('userAvatar')} />
                </section>

                <section style={cardStyle}>
                    <h3 style={cardTitle}>{t('promptCustomization')}</h3>
                    <div style={group}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                            <label style={labelStyle}>{t('systemMessageLabel')}</label>
                            <span style={{ fontSize: 12, color: fg2 }}>{t('definesAiBehavior')}</span>
                        </div>
                        <textarea value={apiKeys?.systemMessage || ''} onChange={(e) => setKeys({ systemMessage: e.target.value })} placeholder="You are a helpful AI..." style={{ ...fieldStyle, minHeight: 88, resize: 'vertical' }} />
                    </div>
                    <div style={group}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                            <label style={labelStyle}>{t('customInstructionsLabel')}</label>
                            <span style={{ fontSize: 12, color: fg2 }}>{t('addedToSystemPrompt')}</span>
                        </div>
                        <textarea value={apiKeys?.customInstructions || ''} onChange={(e) => setKeys({ customInstructions: e.target.value })} placeholder="e.g. Always respond in Spanish" style={{ ...fieldStyle, minHeight: 88, resize: 'vertical' }} />
                    </div>
                </section>
            </div>
            <div style={{ padding: '8px 20px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setView('chat')} className="ai-btn" style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 999, border: 'none', background: accent, color: 'var(--kb-on-accent, #fff)' }}>
                    {t('backToChat')}
                </button>
            </div>
        </>
    );

    return (
        <div
            className="ai-root font-sans no-drag-region pointer-events-auto"
            style={{ ...getPopupStyle(), borderRadius: 32, overflow: 'hidden', fontFamily: 'var(--kb-font-body, inherit)' }}
            onKeyDown={onKeyDown}
            onMouseEnter={() => window.api?.setIgnoreMouseEvents?.(false)}
            onMouseLeave={() => window.api?.setIgnoreMouseEvents?.(true)}
            onDragOver={e => e.preventDefault()}
            onDragEnter={() => { dragDepth.current += 1; setDragging(true); }}
            onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); }}
            onDrop={onDrop}
        >
            <ResizerHandle direction="side" edgePosition={edgePosition} startDrag={startDrag} />
            <ResizerHandle direction="bottom" edgePosition={edgePosition} startDrag={startDrag} />
            <ResizerHandle direction="corner" edgePosition={edgePosition} startDrag={startDrag} />

            <style>{`
                /* Canli hosts load Material Symbols Rounded; older hosts fall back to Outlined. */
                .ai-root .material-symbols-outlined { font-family: 'Material Symbols Rounded', 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400; }
                .ai-root input:not([type=file]), .ai-root select, .ai-root textarea { font-family: inherit; }
                .ai-root input::placeholder, .ai-root textarea::placeholder { color: var(--kb-fg-2, #94a3b8); opacity: 1; }
                .ai-root select option { background: var(--kb-bg-surface, #1f2937); color: var(--kb-fg-1, #f1f5f9); }
                .ai-root button, .ai-root label, .ai-root select { cursor: pointer; }
                .ai-root button:disabled { cursor: default; }
                .ai-root button:focus-visible, .ai-root select:focus-visible, .ai-root textarea:focus-visible, .ai-root input:focus-visible { outline: 2px solid var(--kb-focus-ring, var(--kb-accent, var(--theme-primary))); outline-offset: 2px; }
                .ai-root .ai-btn:hover:not(:disabled) { background: var(--kb-fill-hover, rgba(255,255,255,0.08)) !important; }
                .ai-root .ai-row-idle:hover { background: var(--kb-fill-hover, rgba(255,255,255,0.06)) !important; }
                .ai-root .ai-row .ai-row-actions, .ai-root .ai-msg .ai-msg-actions { opacity: 0; transition: opacity 120ms var(--kb-ease-standard, ease); }
                .ai-root .ai-row:hover .ai-row-actions, .ai-root .ai-row:focus-within .ai-row-actions, .ai-root .ai-msg:hover .ai-msg-actions, .ai-root .ai-msg:focus-within .ai-msg-actions { opacity: 1; }
                .ai-root .ai-chat-selectable, .ai-root .ai-chat-selectable * { -webkit-user-select: text; user-select: text; }
                .ai-root .ai-chat-selectable *::selection { background-color: rgba(59, 130, 246, 0.6); color: white; }
                .ai-root .ai-md > :last-child { margin-bottom: 0 !important; }
                .ai-root .ai-resizer:hover { background: var(--kb-fill-hover, rgba(255,255,255,0.08)); }
            `}</style>

            {wide && view === 'chat' && (
                <div style={{ width: 232, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 12px 20px 20px', borderRight: `1px solid ${stroke}` }}>
                    <HistoryList {...historyProps} />
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {header}
                {view === 'chat' && chatView}
                {view === 'history' && (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 20px 20px' }}>
                        <HistoryList {...historyProps} primaryNew />
                    </div>
                )}
                {view === 'settings' && settingsView}
            </div>

            {dragging && (
                <div style={{ position: 'absolute', inset: 12, zIndex: 40, borderRadius: 24, border: `2px dashed ${accent}`, background: 'color-mix(in srgb, var(--kb-bg-shell, #111827) 88%, transparent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none', color: fg1 }}>
                    <Icon name="upload_file" size={32} style={{ color: accent }} />
                    <span style={{ fontSize: 15, fontWeight: 600, fontFamily: display }}>{t('dropFiles')}</span>
                </div>
            )}
        </div>
    );
};
