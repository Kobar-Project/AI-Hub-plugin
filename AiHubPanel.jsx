import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { usePluginChatStore } from './usePluginChatStore';
import { getTranslation } from './translations';

const ResizerHandle = ({ direction, edgePosition, startDrag }) => {
    const React = window.React;
    const directionClasses = (() => {
        switch (direction) {
            case 'side':
                return `absolute top-0 bottom-0 w-6 cursor-ew-resize ${edgePosition === 'right' ? 'left-0 -ml-3' : 'right-0 -mr-3'}`;
            case 'bottom':
                return 'absolute bottom-0 left-0 right-0 h-6 -mb-3 cursor-ns-resize';
            case 'corner':
                return `absolute bottom-0 w-6 h-6 -mb-3 cursor-nwse-resize ${edgePosition === 'right' ? 'left-0 -ml-3' : 'right-0 -mr-3'}`;
        }
    })();
    return (
        <div
            onMouseDown={(e) => startDrag(e, direction)}
            className={`${directionClasses} resizer-handle hover:bg-primary/30 transition-colors z-50 [-webkit-app-region:no-drag] bg-black/1`}
        />
    );
};

const MODELS = [
    { id: 'anthropic:claude-sonnet-4-6', label: 'Claude 4.6 Sonnet (Anthropic - Best)' },
    { id: 'anthropic:claude-opus-4-6', label: 'Claude 4.6 Opus (Anthropic - Heavy)' },
    { id: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku (Anthropic - Fast)' },
    { id: 'local:llama3', label: 'Local Default (Ollama / LM Studio)' },
    { id: 'local:llava', label: 'Local Vision (Ollama - LLaVA)' }
];

export const AiHubPanel = ({ onClose, anchorRect }) => {
    const React = window.React;
    const { useState, useEffect, useRef } = React;
    const useAppStore = window.useAppStore;

    const edgePosition = useAppStore(state => state.edgePosition);
    const design = useAppStore(state => state.design);
    const glassOpacity = useAppStore(state => state.glassOpacity);
    const tGlobal = useAppStore(state => state.t);
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingMessageId, setGeneratingMessageId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    const [aiHubWidth, setAiHubWidth] = useState(panelSize?.width || 600);
    const [aiHubHeight, setAiHubHeight] = useState(panelSize?.height || 600);
    const [isSmartPositioning] = useState(true);

    const inputRef = useRef(null);
    const popupRef = useRef(null);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    
    // Title Editing State
    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef(null);

    const messagesScrollRef = useRef(null);
    const bottomRef = useRef(null);
    const activeChat = chats.find(c => c.id === activeChatId) || null;

    useEffect(() => {
        if (!activeChatId && chats.length > 0) setActiveChatId(chats[0].id);
        else if (chats.length === 0) createChat(); 
    }, []);

    useEffect(() => {
        if (isAutoScrollEnabled && messagesScrollRef.current) {
            messagesScrollRef.current.scrollTo({
                top: messagesScrollRef.current.scrollHeight,
                behavior: 'auto'
            });
        }
    }, [activeChat?.messages.length, activeChat?.messages[activeChat?.messages.length - 1]?.content, isAutoScrollEnabled]);

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
            borderColor: 'var(--kb-stroke-subtle, var(--theme-border))',
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
        setIsGenerating(true);

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
        }
    };

    const handleCancel = () => {
        if (generatingMessageId) {
            window.api?.cancelLlmRequest(generatingMessageId);
            setIsGenerating(false);
            setGeneratingMessageId(null);
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
        setEditTitle(currentTitle);
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
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const onDrop = async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
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

    const preprocessMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/\\\*/g, '*')
            .replace(/\*\*\s+(.*?)\s+\*\*/g, '**$1**')
            .replace(/(^|\s)\*\s+(.*?)\s+\*(\s|$)/g, '$1*$2*$3');
    };

    const fg1 = 'var(--kb-fg-1, #f1f5f9)';
    const fg2 = 'var(--kb-fg-2, #94a3b8)';
    const stroke = 'var(--kb-stroke-subtle, var(--theme-border))';
    const iconBtn = (extra) => ({
        width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, background: 'var(--kb-bg-tile, rgba(255,255,255,0.06))', color: fg1, ...extra
    });
    const tonal = { background: 'var(--kb-bg-container, var(--theme-accent-glow))', color: 'var(--kb-on-container, #fff)' };
    const fieldStyle = { width: '100%', background: 'var(--kb-bg-inset, rgba(0,0,0,0.4))', color: fg1, borderRadius: 16, padding: '10px 14px', fontSize: 14, border: 'none', outline: 'none', userSelect: 'text' };
    const labelStyle = { fontSize: 12, color: fg2 };
    const cardStyle = { background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 };
    const cardTitle = { fontSize: 15, fontWeight: 600, color: fg1, fontFamily: 'var(--kb-font-display, inherit)', margin: 0 };
    const pillBtn = { borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...tonal };

    const ModelSelect = ({ value, onChange, ariaLabel, style }) => (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', ...style }}>
            <select
                value={value}
                onChange={onChange}
                aria-label={ariaLabel}
                style={{ ...fieldStyle, appearance: 'none', WebkitAppearance: 'none', borderRadius: 999, padding: '9px 40px 9px 16px', fontWeight: 500, cursor: 'pointer', textOverflow: 'ellipsis' }}
            >
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ position: 'absolute', right: 12, fontSize: 20, color: fg2, pointerEvents: 'none' }}>expand_more</span>
        </div>
    );

    const Avatar = ({ src, icon, tone }) => (
        <div style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...(tone === 'ai' ? tonal : { background: 'var(--kb-bg-tile, #334155)', color: fg1 }) }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18, color: tone === 'ai' ? 'var(--kb-accent, var(--theme-primary))' : fg1 }}>{icon}</span>}
        </div>
    );

    const IconTile = ({ size, icon, src }) => (
        <div style={{ width: size, height: size, borderRadius: size >= 60 ? 22 : 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tonal }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="material-symbols-outlined" style={{ fontSize: size >= 60 ? 32 : 24, color: 'var(--kb-accent, var(--theme-primary))' }}>{icon}</span>}
        </div>
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

    const setKeys = (patch) => usePluginChatStore.getState().setApiKeys(patch);

    return (
        <div
            ref={popupRef}
            className="ai-root overflow-hidden font-sans no-drag-region pointer-events-auto flex flex-row"
            style={{
                ...getPopupStyle(),
                borderRadius: 32
            }}
            onMouseEnter={() => window.api?.setIgnoreMouseEvents?.(false)}
            onMouseLeave={() => window.api?.setIgnoreMouseEvents?.(true)}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
        >
            <ResizerHandle direction="side" edgePosition={edgePosition} startDrag={startDrag} />
            <ResizerHandle direction="bottom" edgePosition={edgePosition} startDrag={startDrag} />
            <ResizerHandle direction="corner" edgePosition={edgePosition} startDrag={startDrag} />

            <style>{`
                /* Canlı hosts load Material Symbols Rounded; older hosts fall back to Outlined. */
                .ai-root .material-symbols-outlined { font-family: 'Material Symbols Rounded', 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400; }
                .ai-root input:not([type=file]), .ai-root select, .ai-root textarea { background: var(--kb-bg-inset, rgba(0,0,0,0.4)); border-color: transparent; border-radius: 16px; }
                .ai-root button, .ai-root label { cursor: pointer; }
                .ai-root button:disabled { cursor: default; }
                .ai-root button:focus-visible, .ai-root select:focus-visible, .ai-root textarea:focus-visible, .ai-root input:focus-visible { outline: 2px solid var(--kb-focus-ring, var(--kb-accent, var(--theme-primary))); outline-offset: 2px; }
                .ai-root .ai-btn:hover:not(:disabled) { background: var(--kb-fill-hover, rgba(255,255,255,0.08)) !important; }
                .ai-root .ai-row-idle:hover { background: var(--kb-fill-hover, rgba(255,255,255,0.06)); }
                .ai-root .ai-row .ai-del, .ai-root .ai-msg .ai-msg-actions { opacity: 0; transition: opacity 120ms var(--kb-ease-standard, ease); }
                .ai-root .ai-row:hover .ai-del, .ai-root .ai-row:focus-within .ai-del, .ai-root .ai-msg:hover .ai-msg-actions, .ai-root .ai-msg:focus-within .ai-msg-actions { opacity: 1; }
                .ai-root .ai-md-code { font-family: var(--kb-font-mono, ui-monospace, 'Cascadia Code', Consolas, monospace); }
                .ai-chat-selectable, .ai-chat-selectable * {
                    -webkit-user-select: text !important;
                    user-select: text !important;
                    cursor: text !important;
                }
                .ai-chat-selectable *::selection {
                    background-color: rgba(59, 130, 246, 0.6) !important;
                    color: white !important;
                }
            `}</style>

            {/* Conversation list */}
            <div className="flex shrink-0 h-full" style={{ width: isSidebarOpen ? 208 : 0, opacity: isSidebarOpen ? 1 : 0, overflow: 'hidden', borderRight: isSidebarOpen ? `1px solid ${stroke}` : 'none', transition: 'width 200ms var(--kb-ease-standard, ease), opacity 200ms var(--kb-ease-standard, ease)', minHeight: 0 }}>
                <div className="flex flex-col h-full shrink-0" style={{ width: 208 }}>
                    <div style={{ padding: '20px 20px 12px' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: fg1, fontFamily: 'var(--kb-font-display, inherit)' }}>{t('chats')}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full custom-scrollbar flex flex-col" style={{ padding: '0 12px 16px', gap: 6 }}>
                        {chats.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setActiveChatId(c.id)}
                                onDoubleClick={() => startEditingTitle(c.id, c.title)}
                                className={`ai-row ${activeChatId === c.id ? '' : 'ai-row-idle'}`}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, width: '100%', minHeight: 48, padding: '6px 6px 6px 14px', borderRadius: 16, cursor: 'pointer', userSelect: 'none', ...(activeChatId === c.id ? tonal : { background: 'var(--kb-bg-tile, rgba(255,255,255,0.04))', color: fg1 }) }}
                            >
                                {editingChatId === c.id ? (
                                    <input
                                        ref={editInputRef}
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={() => saveTitle(c.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveTitle(c.id);
                                            if (e.key === 'Escape') setEditingChatId(null);
                                        }}
                                        style={{ width: '100%', color: fg1, fontSize: 14, padding: '6px 10px', outline: 'none', border: 'none', borderRadius: 12 }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <>
                                        <span className="truncate" style={{ fontSize: 14, fontWeight: 500, minWidth: 0, flex: 1 }}>{c.title}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                                            className="ai-del ai-btn"
                                            title={t('remove')}
                                            aria-label={t('remove')}
                                            style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', color: activeChatId === c.id ? 'var(--kb-on-container, #fff)' : fg2 }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative" style={{ minWidth: 0, minHeight: 0 }}>
                <div className="shrink-0 pointer-events-auto" style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <IconTile size={44} icon="auto_awesome" />
                    <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 19, fontWeight: 600, color: fg1, fontFamily: 'var(--kb-font-display, inherit)', whiteSpace: 'nowrap' }}>{t('kobarAiHub')}</h2>
                    <button onClick={() => createChat()} className="ai-btn" title={t('newChat')} aria-label={t('newChat')} style={iconBtn()}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="ai-btn" title={t('aiHubSettings')} aria-label={t('aiHubSettings')} aria-pressed={showSettings} style={iconBtn(showSettings ? tonal : null)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
                    </button>
                    <button onClick={onClose} className="ai-btn" title={t('closeLabel')} aria-label={t('closeLabel')} style={iconBtn(tonal)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                    </button>
                </div>

                <div className="shrink-0 pointer-events-auto" style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="ai-btn" title={t('chats')} aria-label={t('chats')} aria-pressed={isSidebarOpen} style={iconBtn()}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{isSidebarOpen ? 'left_panel_close' : 'left_panel_open'}</span>
                    </button>
                    <ModelSelect
                        value={activeChat?.model || 'openai:gpt-4o'}
                        ariaLabel={t('defaultModel')}
                        style={{ flex: 1, minWidth: 0, maxWidth: 380 }}
                        onChange={(e) => {
                            if (activeChat) {
                                usePluginChatStore.setState(s => ({
                                    chats: s.chats.map(c => c.id === activeChat.id ? {...c, model: e.target.value} : c)
                                }));
                            } else {
                                createChat(e.target.value);
                            }
                        }}
                    />
                </div>

                {/* Chat view (kept mounted while Settings is open so scroll position survives) */}
                <div className="flex-1 flex flex-col" style={{ minHeight: 0, display: showSettings ? 'none' : 'flex' }}>
                <div
                    ref={messagesScrollRef}
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
                        setIsAutoScrollEnabled(isNearBottom);
                    }}
                    className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto select-auto no-drag-region"
                    style={{ padding: '4px 20px 12px', gap: 16, minHeight: 0 }}
                >
                    {activeChat?.messages.length === 0 ? (
                        <div className="select-none" style={{ margin: 'auto 0', border: `2px dashed ${stroke}`, borderRadius: 28, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                            <IconTile size={64} icon="auto_awesome" />
                            <span style={{ fontSize: 17, fontWeight: 600, color: fg1, fontFamily: 'var(--kb-font-display, inherit)' }}>{t('kobarAiHub')}</span>
                            <span style={{ fontSize: 14, color: fg2, maxWidth: 300 }}>{t('sayHello')}</span>
                        </div>
                    ) : (
                        activeChat?.messages.map((msg) => (
                            <div key={msg.id} className="ai-msg" style={{ display: 'flex', gap: 12, width: '100%', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {msg.role !== 'user' && <Avatar src={aiAvatar} icon="smart_toy" tone="ai" />}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '85%', minWidth: 0, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div className="ai-chat-selectable" style={{ WebkitUserSelect: 'text', userSelect: 'text', padding: '12px 16px', borderRadius: 20, minWidth: 0, maxWidth: '100%', ...(msg.role === 'user' ? { ...tonal, borderTopRightRadius: 6 } : { background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))', color: fg1, borderTopLeftRadius: 6 }) }}>

                                        {msg.attachments && msg.attachments.length > 0 && (
                                             <div className="flex flex-wrap gap-2 mb-3">
                                                 <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 10, background: 'var(--kb-bg-inset, rgba(0,0,0,0.25))', color: 'inherit' }}>+{msg.attachments.length} {t('filesAttached')}</span>
                                             </div>
                                        )}

                                        <div className="break-words ai-chat-selectable max-w-none" style={{ fontSize: 14, lineHeight: 1.55 }}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
                                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                                                    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                                                    h1: ({node, ...props}) => <h1 className="mb-3" style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--kb-font-display, inherit)' }} {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="mb-3" style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--kb-font-display, inherit)' }} {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="mb-2" style={{ fontSize: 15, fontWeight: 700 }} {...props} />,
                                                    em: ({node, ...props}) => <em className="italic" {...props} />,
                                                    pre: ({node, children, ...props}) => <pre className="select-text" style={{ WebkitUserSelect: 'text', userSelect: 'text' }} {...props}>{children}</pre>,
                                                    code: ({node, inline, className, children, ...props}) => {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const language = match ? match[1] : 'text';

                                                        return !inline ? (
                                                            <div className="relative mt-2 mb-4 overflow-hidden group no-drag-region select-text" style={{ WebkitUserSelect: 'text', userSelect: 'text', borderRadius: 16, background: 'var(--kb-bg-inset, rgba(0,0,0,0.4))', color: fg1 }}>
                                                                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.api?.writeToClipboard?.({ type: 'text', content: String(children).replace(/\n$/, '') });
                                                                        }}
                                                                        className="ai-btn"
                                                                        style={{ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kb-bg-tile, rgba(255,255,255,0.1))', color: fg1 }}
                                                                        title={t('copyToOsClipboard')}
                                                                        aria-label={t('copyToOsClipboard')}
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                                                                    </button>
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus}
                                                                    language={language}
                                                                    PreTag="div"
                                                                    className="text-xs !m-0 select-text ai-md-code"
                                                                    customStyle={{ WebkitUserSelect: 'text', userSelect: 'text', margin: 0, padding: 14, background: 'transparent', fontFamily: "var(--kb-font-mono, ui-monospace, 'Cascadia Code', Consolas, monospace)" }}
                                                                    codeTagProps={{ style: { fontFamily: "var(--kb-font-mono, ui-monospace, 'Cascadia Code', Consolas, monospace)" } }}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        ) : (
                                                            <code className="ai-md-code select-text" style={{ WebkitUserSelect: 'text', userSelect: 'text', fontSize: 12, padding: '2px 6px', background: 'var(--kb-bg-inset, rgba(0,0,0,0.3))', color: fg1, borderRadius: 8 }} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {preprocessMarkdown(msg.content)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="ai-msg-actions" style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => handleSendToSlot(msg.content)} className="ai-btn" title={t('sendToSlot')} aria-label={t('sendToSlot')} style={{ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: fg2 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dynamic_feed</span>
                                        </button>
                                        <button onClick={() => handleCopy(msg.content)} className="ai-btn" title={t('copyText')} aria-label={t('copyText')} style={{ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: fg2 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                                        </button>
                                    </div>
                                </div>
                                {msg.role === 'user' && <Avatar src={userAvatar} icon="person" tone="user" />}
                            </div>
                        ))
                    )}
                    {isGenerating && (
                         <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-start' }}>
                              <Avatar icon="progress_activity" tone="ai" />
                              <div style={{ padding: '12px 16px', borderRadius: 20, borderTopLeftRadius: 6, background: 'var(--kb-bg-surface, rgba(255,255,255,0.04))', color: fg2, fontSize: 14, display: 'flex', alignItems: 'center' }}>
                                  <span>{t('thinking')}</span>
                              </div>
                         </div>
                    )}
                    <div ref={bottomRef} className="h-1 shrink-0" />
                </div>

                <div className="flex flex-col shrink-0 pointer-events-auto" style={{ padding: '8px 20px 20px' }}>
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                             {attachments.map((a, i) => (
                                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 4px 10px', fontSize: 12, color: fg1, borderRadius: 10, background: 'var(--kb-bg-tile, rgba(255,255,255,0.06))' }}>
                                     <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--kb-accent, var(--theme-primary))' }}>{a.type === 'image' ? 'image' : 'description'}</span>
                                     <span className="truncate" style={{ maxWidth: 150 }}>{a.name}</span>
                                     <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ai-btn" aria-label={t('remove')} style={{ width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: fg2 }}>
                                         <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                                     </button>
                                 </div>
                             ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--kb-bg-inset, rgba(0,0,0,0.4))', borderRadius: 28, padding: 6 }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={onInput}
                            placeholder={t('typeMessage')}
                            className="custom-scrollbar max-h-[200px] overflow-y-auto select-auto pointer-events-auto"
                            rows={1}
                            style={{ flex: 1, minWidth: 0, minHeight: 40, padding: '9px 8px 9px 14px', borderRadius: 0, background: 'transparent', color: fg1, fontSize: 14, border: 'none', outline: 'none', resize: 'none' }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        {isGenerating ? (
                            <button onClick={handleCancel} className="ai-btn" title={t('stopLabel')} aria-label={t('stopLabel')} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...tonal }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stop</span>
                            </button>
                        ) : (
                            <button onClick={handleSend} disabled={!input.trim() && attachments.length === 0} title={t('typeMessage')} aria-label={t('typeMessage')} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--kb-accent, var(--theme-primary))', color: 'var(--kb-on-accent, #fff)', opacity: (!input.trim() && attachments.length === 0) ? 'var(--kb-opacity-disabled, 0.5)' : 1 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_upward</span>
                            </button>
                        )}
                    </div>
                </div>
                </div>

                {/* Settings view */}
                {showSettings && (
                    <div className="flex-1 flex flex-col no-drag-region" style={{ minHeight: 0 }}>
                        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '4px 20px 12px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
                            <section style={cardStyle}>
                                <h3 style={cardTitle}>{t('modelDefaults')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={labelStyle}>{t('defaultModel')}</label>
                                    <ModelSelect
                                        value={apiKeys?.defaultModel || 'anthropic:claude-sonnet-4-6'}
                                        ariaLabel={t('defaultModel')}
                                        onChange={(e) => setKeys({ defaultModel: e.target.value })}
                                    />
                                </div>
                            </section>

                            <section style={cardStyle}>
                                <h3 style={cardTitle}>{t('apiKeysProviders')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
                                    <label style={labelStyle}>{t('openaiKeyLabel')}</label>
                                    <input disabled type="password" placeholder={t('willBeAddedSoon')} style={{ ...fieldStyle, cursor: 'not-allowed' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
                                    <label style={labelStyle}>{t('geminiKeyLabel')}</label>
                                    <input disabled type="password" placeholder={t('willBeAddedSoon')} style={{ ...fieldStyle, cursor: 'not-allowed' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={labelStyle}>{t('anthropicKeyLabel')}</label>
                                    <input
                                        type="password"
                                        value={apiKeys?.anthropic || ''}
                                        onChange={(e) => setKeys({ anthropic: e.target.value })}
                                        placeholder="sk-ant-..."
                                        style={fieldStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={labelStyle}>{t('localUrlLabel')}</label>
                                    <input
                                        type="text"
                                        value={apiKeys?.localUrl || ''}
                                        onChange={(e) => setKeys({ localUrl: e.target.value })}
                                        placeholder="http://localhost:11434"
                                        style={fieldStyle}
                                    />
                                </div>
                            </section>

                            <section style={cardStyle}>
                                <h3 style={cardTitle}>{t('profileCustomization')}</h3>
                                <AvatarRow type="ai" src={aiAvatar} icon="smart_toy" label={t('aiAvatar')} />
                                <AvatarRow type="user" src={userAvatar} icon="person" label={t('userAvatar')} />
                            </section>

                            <section style={cardStyle}>
                                <h3 style={cardTitle}>{t('promptCustomization')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                                        <label style={labelStyle}>{t('systemMessageLabel')}</label>
                                        <span style={{ fontSize: 12, color: fg2, opacity: 0.8 }}>{t('definesAiBehavior')}</span>
                                    </div>
                                    <textarea
                                        value={apiKeys?.systemMessage || ''}
                                        onChange={(e) => setKeys({ systemMessage: e.target.value })}
                                        placeholder="You are a helpful AI..."
                                        style={{ ...fieldStyle, minHeight: 88, resize: 'vertical' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                                        <label style={labelStyle}>{t('customInstructionsLabel')}</label>
                                        <span style={{ fontSize: 12, color: fg2, opacity: 0.8 }}>{t('addedToSystemPrompt')}</span>
                                    </div>
                                    <textarea
                                        value={apiKeys?.customInstructions || ''}
                                        onChange={(e) => setKeys({ customInstructions: e.target.value })}
                                        placeholder="e.g. Always respond in Spanish"
                                        style={{ ...fieldStyle, minHeight: 88, resize: 'vertical' }}
                                    />
                                </div>
                            </section>
                        </div>
                        <div className="shrink-0" style={{ padding: '8px 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowSettings(false)}
                                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 999, background: 'var(--kb-accent, var(--theme-primary))', color: 'var(--kb-on-accent, #fff)' }}
                            >
                                {t('backToChat')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
