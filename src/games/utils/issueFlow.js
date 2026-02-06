// games/utils/issueFlow.js
export function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

export function pickGroupIds(groupId) {
    if (groupId === "g1") return [1, 2];
    if (groupId === "g2") return [3, 4];
    if (groupId === "g3") return [5, 6];
    return [1, 2];
}

export const PRE_LINES = {
    1: ["코드 오류를 확인해보자."],
    2: ["이번엔 원인 라인을 봉인해."],
    3: ["좋아. 상황에 맞는 명령어를 정확히 입력해."],
    4: ["근본 원인을 분류하자. O/X로."],
    5: ["요구사항이 한꺼번에 밀려왔다. 트레이드오프를 이겨."],
    6: ["장애는 첫 30초가 전부다. 리듬대로 초동을 밟아."],
};

export function buildReviewFocus(issue) {
    if (!issue?.code) return [];
    const lines = issue.code.split("\n");
    const findIdx = (needle) => lines.findIndex((l) => l.includes(needle));
    const iJson = findIdx("await res.json");
    const iReturn = findIdx("return ");

    const picks = [];
    if (iJson >= 0) picks.push({ n: iJson + 1, t: lines[iJson] });
    if (iReturn >= 0) picks.push({ n: iReturn + 1, t: lines[iReturn] });

    const uniq = [];
    for (const p of picks) {
        if (!p?.t?.trim()) continue;
        if (uniq.some((u) => u.n === p.n)) continue;
        uniq.push(p);
    }
    return uniq.slice(0, 2);
}

export function normCmd(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replaceAll("(repo-url)", "<repo-url>")
        .replaceAll("(<repo-url>)", "<repo-url>")
        .replaceAll("(repo url)", "<repo-url>")
        .replaceAll("<repo-url>", "<repo-url>");
}

export function isCloneAnswer(typed, answer) {
    const t = normCmd(typed);
    const a = normCmd(answer);
    if (!t) return false;
    if (t === a) return true;
    if (a.startsWith("git clone")) {
        if (t.startsWith("git clone")) return true;
    }
    return false;
}

// progress (sessionStorage)
export function readProgress() {
    try {
        return JSON.parse(sessionStorage.getItem("gameProgress") || "{}");
    } catch {
        return {};
    }
}
export function writeProgress(next) {
    sessionStorage.setItem("gameProgress", JSON.stringify(next));
}
export function markGroupDone(groupId, payload) {
    const prev = readProgress();
    const next = {
        ...prev,
        [groupId]: {
            done: true,
            ...payload,
        },
    };
    writeProgress(next);
}
export function isGroupDone(groupId) {
    const p = readProgress();
    return !!p?.[groupId]?.done;
}
