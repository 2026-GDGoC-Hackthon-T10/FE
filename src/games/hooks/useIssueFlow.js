// games/hooks/useIssueFlow.js
import { useMemo, useRef, useState, useEffect } from "react";
import { issues } from "../data/issues";
import { issueGroups } from "../data/issueGroups";

function normCmd(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replaceAll("(repo-url)", "<repo-url>")
        .replaceAll("(<repo-url>)", "<repo-url>")
        .replaceAll("<repo-url>", "<repo-url>");
}

function isCloneAnswer(typed, answer) {
    const t = normCmd(typed);
    const a = normCmd(answer);
    if (!t) return false;
    if (t === a) return true;
    if (a.startsWith("git clone")) {
        if (t.startsWith("git clone")) return true;
    }
    return false;
}

export default function useIssueFlow(groupId = "g1") {
    const group = issueGroups[groupId] ?? issueGroups.g1;

    const ids = useMemo(() => group?.issueIds ?? [], [group]);
    const total = ids.length;

    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState("play"); // play | result
    const [result, setResult] = useState(null); // { ok, title, message }

    const correctRef = useRef(0);
    const wrongRef = useRef(0);
    const timersRef = useRef([]);

    const currentId = ids[idx];
    const issue = currentId ? issues[currentId] : null;
    const stepText = `${Math.min(idx + 1, total)}/${total}`;

    const clearTimers = () => {
        for (const t of timersRef.current) clearTimeout(t);
        timersRef.current = [];
    };

    useEffect(() => {
        return () => clearTimers();
    }, []);

    function showResult(ok, payload) {
        setResult({
            ok,
            title: ok ? payload?.success?.title : payload?.fail?.title,
            message: ok ? payload?.success?.message : payload?.fail?.message,
        });
        setPhase("result");
    }

    function next() {
        if (idx >= total - 1) return;
        setPhase("play");
        setResult(null);
        setIdx((v) => v + 1);
    }

    function restart() {
        clearTimers();
        correctRef.current = 0;
        wrongRef.current = 0;
        setIdx(0);
        setPhase("play");
        setResult(null);
    }

    function autoNext(delay = 520) {
        const t = setTimeout(() => {
            if (idx < total - 1) next();
        }, delay);
        timersRef.current.push(t);
    }

    // g1
    function submitReview(optionId) {
        if (!issue || issue.type !== "code_review") return;
        const opt = issue.options?.find((o) => o.id === optionId);
        if (!opt) return;

        const ok = !opt.penalty;
        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    function clickLine(lineNumber) {
        if (!issue || issue.type !== "bug_spotting") return;

        const ok = lineNumber === issue.answer?.line;
        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    // g2
    function submitGitCommand(typed) {
        if (!issue || issue.type !== "git_command") return;

        const answer = issue.game?.answer ?? "";
        const ok = isCloneAnswer(typed, answer) || normCmd(typed) === normCmd(answer);

        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    function submitCsOx(placedMap) {
        if (!issue || issue.type !== "cs_ox") return;

        const stmts = issue.game?.statements ?? [];
        const placed = placedMap ?? {};

        let ok = true;
        if (Object.keys(placed).length !== stmts.length) ok = false;

        if (ok) {
            for (const s of stmts) {
                const should = s.truth ? "O" : "X";
                if (placed[s.id] !== should) {
                    ok = false;
                    break;
                }
            }
        }

        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    // g3
    function submitTradeOffRps({ hand, optionId } = {}) {
        if (!issue || issue.type !== "trade_off") return;

        const needHand = issue.game?.correctHand;
        const needOpt = issue.game?.correctOptionId;

        const okHand = needHand ? hand === needHand : true;
        const okOpt = needOpt ? optionId === needOpt : true;

        const ok = okHand && okOpt;

        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    function submitIncidentRhythm({ hitsOk } = {}) {
        if (!issue || issue.type !== "incident") return;

        const ok = !!hitsOk;

        if (ok) correctRef.current += 1;
        else wrongRef.current += 1;

        showResult(ok, issue);
        autoNext(520);
    }

    return {
        group,
        issue,
        idx,
        total,
        stepText,
        phase,
        result,

        submitReview,
        clickLine,
        submitGitCommand,
        submitCsOx,

        submitTradeOffRps,
        submitIncidentRhythm,

        next,
        restart,

        getStats: () => {
            const c = correctRef.current;
            const w = wrongRef.current;
            const t = c + w;
            return { correct: c, wrong: w, total: t, accuracy: t ? c / t : 0 };
        },
    };
}
