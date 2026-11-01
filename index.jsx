import { AiHubPanel } from './AiHubPanel';
import { SettingsPanel } from './SettingsPanel';
import { getTranslation } from './translations';
import { usePluginChatStore } from './usePluginChatStore';

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

// Bar badge: 'dot' when an AI Hub reply finished while the panel was closed.
// Feature-detected: older hosts without the tile API simply ignore it.
{
    const BTN_ID = 'com.kobar.aihub.btn';
    const PANEL_ID = 'com.kobar.aihub.panel';
    const ext = window.KoBarExtensions;
    let unread = false;

    const pushState = () => {
        if (typeof ext?.setBarItemState !== 'function') return;
        try {
            ext.setBarItemState(BTN_ID, {
                label: getTranslation(window.useAppStore.getState().language, 'pluginName'),
                badge: unread ? 'dot' : 0
            });
        } catch (e) { /* host without the tile API */ }
    };

    const isPanelOpen = () => window.useAppStore.getState().activeExtensionPanelId === PANEL_ID;
    const isOurMessage = (data) => {
        const chat = usePluginChatStore.getState().chats.find(c => c.id === data?.chatId);
        return !!chat && chat.messages.some(m => m.id === data?.messageId);
    };
    const markUnread = (data) => {
        if (isPanelOpen() || !isOurMessage(data) || unread) return;
        unread = true;
        pushState();
    };

    if (typeof ext?.setBarItemState === 'function') {
        window.api?.onLlmStreamEnd?.(markUnread);
        window.api?.onLlmStreamError?.(markUnread);
        // Clear the dot when the user opens the panel (they have seen the reply).
        window.useAppStore.subscribe((state) => {
            if (unread && state.activeExtensionPanelId === PANEL_ID) {
                unread = false;
                pushState();
            }
        });
        if (typeof ext?.onBarItemChange === 'function') {
            ext.onBarItemChange(BTN_ID, () => pushState());
        }
    }
}
