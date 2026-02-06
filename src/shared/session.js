// session.js
const KEY = "codeblue_session_id";

export function getSessionId() {
    return sessionStorage.getItem(KEY) || null;
}

export function ensureSessionId() {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(KEY, id);
    }
    return id;
}

export function resetSessionId() {
    sessionStorage.removeItem(KEY);
}
