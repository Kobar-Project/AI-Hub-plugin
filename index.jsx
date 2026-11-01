import { AiHubPanel } from './AiHubPanel';
import { SettingsPanel } from './SettingsPanel';
import { getTranslation } from './translations';
import { usePluginChatStore } from './usePluginChatStore';
import { getBarState, setBarState, subscribeBarState } from './barState';

// Register Settings Panel
if (window.KoBarExtensions.registerSettingsPanel) {
    window.KoBarExtensions.registerSettingsPanel('com.kobar.aihub', {
        id: 'com.kobar.aihub',
        render: () => window.React.createElement(SettingsPanel)
    });
}

// Register Main Extension Panel
if (window.KoBarExtensions.registerPanel) {
    window.KoBarExtensions.registerPanel('com.kobar.aihub.panel', {
        id: 'com.kobar.aihub.panel',
        render: (props) => window.React.createElement(AiHubPanel, props)
    });
}

// Register Sidebar Button
if (window.KoBarExtensions.registerSidebarButton) {
    window.KoBarExtensions.registerSidebarButton({
        id: 'com.kobar.aihub.btn',
        icon: 'smart_toy',
        tile: { template: 'badge', sensitive: true },
        label: getTranslation(window.useAppStore.getState().language, 'pluginName'),
        onClick: (e, anchorRect) => {
            const state = window.useAppStore.getState();
            const isCurrentlyOpen = state.activeExtensionPanelId === 'com.kobar.aihub.panel';
            state.closeAllUtilityPopups();
            if (!isCurrentlyOpen) {
                window.useAppStore.setState({
                    activeExtensionPanelId: 'com.kobar.aihub.panel',
                    activeExtensionAnchorRect: anchorRect
                });
            }
        }
    });
}

// Bar tile: a dot when a reply finished while the panel was closed, a busy icon while one is being written, an
// error tone after a failed request. Feature-detected: older hosts without the tile API keep the plain icon button.
{
    const BTN_ID = 'com.kobar.aihub.btn';
    const PANEL_ID = 'com.kobar.aihub.panel';
    const ext = window.KoBarExtensions;

    const pushState = () => {
        if (typeof ext?.setBarItemState !== 'function') return;
        try {
            const { busy, unread, error } = getBarState();
            const lang = window.useAppStore.getState().language;
            const key = busy ? 'tileBusy' : unread ? 'tileUnread' : error ? 'tileError' : 'pluginName';
            ext.setBarItemState(BTN_ID, {
                label: getTranslation(lang, key),
                icon: busy ? 'more_horiz' : 'smart_toy',
                badge: unread ? 'dot' : 0,
                tone: error ? 'error' : 'default'
            });
        } catch (e) { /* host without the tile API */ }
    };

    const isPanelOpen = () => window.useAppStore.getState().activeExtensionPanelId === PANEL_ID;
    const isOurMessage = (data) => {
        const chat = usePluginChatStore.getState().chats.find(c => c.id === data?.chatId);
        return !!chat && chat.messages.some(m => m.id === data?.messageId);
    };
    const onFinished = (failed) => (data) => {
        if (!isOurMessage(data)) return;
        const open = isPanelOpen();
        setBarState({ busy: false, unread: open ? false : true, error: failed && !open });
    };

    if (typeof ext?.setBarItemState === 'function') {
        subscribeBarState(pushState);
        window.api?.onLlmStreamEnd?.(onFinished(false));
        window.api?.onLlmStreamError?.(onFinished(true));
        let lastLang = window.useAppStore.getState().language;
        // Clear the dot when the user opens the panel (they have seen the reply); follow language changes.
        window.useAppStore.subscribe((state) => {
            if (state.activeExtensionPanelId === PANEL_ID && (getBarState().unread || getBarState().error)) {
                setBarState({ unread: false, error: false });
            }
            if (state.language !== lastLang) {
                lastLang = state.language;
                pushState();
            }
        });
        if (typeof ext?.onBarItemChange === 'function') {
            ext.onBarItemChange(BTN_ID, () => pushState());
        }
        pushState();
    }
}
