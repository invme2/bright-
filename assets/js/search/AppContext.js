import { createContext } from 'preact';

/** @type {import("./types").AppContextValue} */
export const defaultContextState = {
    showPopup: false,
    setShowPopup: (_) => {},
    searchValue: '',
    setSearchValue: (_) => {},
    filter: '',
    searchIndex: null,
    indexStatus: "initial",
    t: (s) => window.Spiritix?.t?.[s] || s,
    inputRef: null,
};

export const AppContext = createContext(defaultContextState);
