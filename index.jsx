import { AiHubPanel } from './AiHubPanel';
import { SettingsPanel } from './SettingsPanel';
import { getTranslation } from './translations';

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
