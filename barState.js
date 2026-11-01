// Tiny shared state between the bar tile (index.jsx) and the panel: is a reply being written, is there an unseen
// reply, did the last request fail. Not persisted; it only drives the tile.
const state = { busy: false, unread: false, error: false };
const listeners = new Set();

export const getBarState = () => state;

export const setBarState = (patch) => {
    let changed = false;
    for (const key of Object.keys(patch)) {
        if (state[key] !== patch[key]) {
            state[key] = patch[key];
            changed = true;
        }
    }
    if (changed) listeners.forEach((fn) => fn(state));
};

export const subscribeBarState = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
