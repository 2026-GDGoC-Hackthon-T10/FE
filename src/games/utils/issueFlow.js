// games/utils/issueFlow.js

export function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

/**
 * ✅ groupId -> issueIds 매핑
 * - issues 데이터가 {1:{},2:{}}(숫자키)일 때도 안전하게 맞춰줌
 * - groupId가 이상하면 기본 g1
 */
export function pickGroupIds(groupId) {
    const gid = String(groupId || "g1");
    if (gid === "g1") return [1, 2];
    if (gid === "g2") return [3, 4];
    if (gid === "g3") return [5, 6];
    return [1, 2];
}

/**
 * ✅ groupId로 실제 issue 리스트를 만들기 위한 헬퍼
 * - IssuePage/Hook에서 이걸 써서 "아무것도 안뜸" 방지
 * - issues 객체가 없거나 키가 없으면 빈 배열 반환
 */
export function buildGroupIssues(issuesMap, groupId) {
    const ids = pickGroupIds(groupId);
    const src = issuesMap && typeof issuesMap === "object" ? issuesMap : {};
    const out = [];

    for (const id of ids) {
        const keyNum = id;
        const keyStr = String(id);
        const issue = src[keyNum] ?? src[keyStr] ?? null;
        if (issue) out.push(issue);
    }

    return out;
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
    const lines = String(issue.code).split("\n");
    const findIdx = (needle) => lines.findIndex((l) => String(l).includes(needle));

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

// =========================
// progress (sessionStorage)
// =========================

export function readProgress() {
    try {
        return JSON.parse(sessionStorage.getItem("gameProgress") || "{}");
    } catch {
        return {};
    }
}

export function writeProgress(next) {
    sessionStorage.setItem("gameProgress", JSON.stringify(next ?? {}));
}

export function markGroupDone(groupId, payload) {
    const gid = String(groupId || "g1");
    const prev = readProgress();
    const next = {
        ...prev,
        [gid]: {
            done: true,
            ...(payload || {}),
        },
    };
    writeProgress(next);
}

export function isGroupDone(groupId) {
    const gid = String(groupId || "g1");
    const p = readProgress();
    return !!p?.[gid]?.done;
}

/**
 * ✅ (옵션) 현재 그룹 진행상황/정확도 기본값 생성
 * - UI에서 안전하게 쓰려고 넣어둠
 */
export function ensureGroupProgress(groupId) {
    const gid = String(groupId || "g1");
    const prev = readProgress();
    const cur = prev?.[gid] || {};
    const next = {
        ...prev,
        [gid]: {
            done: !!cur.done,
            correct: Number.isFinite(cur.correct) ? cur.correct : 0,
            wrong: Number.isFinite(cur.wrong) ? cur.wrong : 0,
            ...(cur || {}),
        },
    };
    writeProgress(next);
    return next[gid];
}
