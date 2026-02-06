// games/Screen/IssueStage.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import api from "../../shared/api.js";
import ProblemRenderer from "./ProblemRenderer.jsx";
import "./IssueStage.css";

function safeUuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreateSessionId(stageNumber, incoming) {
    const key = `quiz_session_${stageNumber}`;

    if (incoming && String(incoming).trim()) {
        const v = String(incoming).trim();
        sessionStorage.setItem(key, v);
        return v;
    }

    const saved = sessionStorage.getItem(key);
    if (saved) return saved;

    const created = safeUuid();
    sessionStorage.setItem(key, created);
    return created;
}

function normalizeOptions(question) {
    const raw = question?.options ?? question?.choices ?? question?.selections ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((o) => String(o));
}

export default function IssueStage({
                                       stageNumber,
                                       sessionId,
                                       issueId,
                                       issue,
                                       isLast,
                                       onSolved,
                                       skipPre,
                                   }) {
    // ✅ purity rule 회피: render 중 sessionStorage/Date.now 호출 안 함
    const [sid, setSid] = useState("");
    const [sidReady, setSidReady] = useState(false);

    useEffect(() => {
        setSidReady(false);
        try {
            const v = getOrCreateSessionId(stageNumber, sessionId);
            setSid(v);
        } finally {
            setSidReady(true);
        }
    }, [stageNumber, sessionId]);

    // ====== 연출(독백) ======
    const preLines = useMemo(() => {
        const a = [];
        if (issue?.title) a.push(issue.title);
        if (issue?.story) a.push(issue.story);
        return a.slice(0, 2);
    }, [issue]);

    const [phase, setPhase] = useState(skipPre ? "play" : "pre"); // pre | play | result
    const [preIdx, setPreIdx] = useState(0);

    useEffect(() => {
        setPhase(skipPre ? "play" : "pre");
        setPreIdx(0);
    }, [issueId, skipPre]);

    const goNextPre = useCallback(() => {
        setPreIdx((cur) => {
            const next = cur + 1;
            if (next >= preLines.length) {
                setPhase("play");
                return cur;
            }
            return next;
        });
        if (!preLines.length) setPhase("play");
    }, [preLines.length]);

    // ====== 퀴즈 상태 ======
    const [loading, setLoading] = useState(false);
    const [questionId, setQuestionId] = useState(null);
    const [question, setQuestion] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [result, setResult] = useState(null); // { ok, answer, message, explanation }
    const [error, setError] = useState("");

    const abortRef = useRef(false);

    const fetchQuestion = useCallback(async () => {
        setError("");
        setLoading(true);
        setQuestionId(null);
        setQuestion(null);
        setResult(null);

        try {
            const r1 = await api.get("/api/quiz/random", { params: { stage: stageNumber } });
            const qid = r1?.data?.questionId ?? r1?.data?.id ?? null;
            if (!qid) throw new Error("questionId 없음");

            if (abortRef.current) return;
            setQuestionId(qid);

            const r2 = await api.get(`/api/quiz/${qid}`);
            if (abortRef.current) return;
            setQuestion(r2?.data ?? null);
        } catch (e) {
            console.error(e);
            if (!abortRef.current) setError("문제를 불러오지 못했어요. 다시 시도해 주세요.");
        } finally {
            if (!abortRef.current) setLoading(false);
        }
    }, [stageNumber]);

    useEffect(() => {
        abortRef.current = false;
        if (phase === "play" && sidReady) fetchQuestion();
        return () => {
            abortRef.current = true;
        };
    }, [phase, sidReady, fetchQuestion]);

    const titleText = useMemo(() => {
        return (
            question?.title ||
            question?.questionTitle ||
            `CASE ${String(issueId).padStart(2, "0")}`
        );
    }, [question, issueId]);

    const bodyText = useMemo(() => {
        return (
            question?.content ||
            question?.question ||
            question?.questionText ||
            ""
        );
    }, [question]);

    const options = useMemo(() => normalizeOptions(question), [question]);

    // ✅ ProblemRenderer가 호출할 "제출 함수"
    const submitAnswer = useCallback(
        async (selectedText) => {
            if (!sidReady || !sid) throw new Error("sessionId 준비 안됨");
            if (!questionId) throw new Error("questionId 없음");

            setSubmitting(true);
            setError("");

            try {
                const r = await api.post("/api/quiz/submit", null, {
                    params: {
                        sessionId: sid,
                        questionId,
                        selectedOption: String(selectedText),
                    },
                });

                const data = r?.data ?? {};
                const ok =
                    data.correct ??
                    data.isCorrect ??
                    (typeof data.result === "string" ? data.result === "CORRECT" : data.result) ??
                    data.success ??
                    false;

                return {
                    ok: Boolean(ok),
                    answer: data.answer ?? data.correctAnswer ?? "",
                    message: data.message ?? "",
                    explanation: data.explanation ?? "",
                };
            } catch (e) {
                console.error(e);
                setError("제출에 실패했어요. 네트워크 확인 후 다시 시도해 주세요.");
                return { ok: false, message: "제출 실패" };
            } finally {
                setSubmitting(false);
            }
        },
        [sidReady, sid, questionId]
    );

    // ✅ ProblemRenderer에서 채점 끝나면 여기로 결과 올림
    const onResolved = useCallback((res) => {
        setResult(res);
        setPhase("result");
    }, []);

    const next = useCallback(() => {
        const ok = Boolean(result?.ok);
        onSolved(ok, isLast);
    }, [result, onSolved, isLast]);

    // ====== UI ======
    if (!sidReady) return null;

    return (
        <div className="issueStage">
            <div className="stageCard">
                {phase === "pre" && (
                    <div className="stagePre">
                        <div className="stageTitle">{issue?.title ?? "작전 개시"}</div>
                        <div className="stageMono">{preLines[preIdx] ?? "…"}</div>

                        <div className="stageActions">
                            <button className="btnPrimary" type="button" onClick={goNextPre}>
                                {preIdx < preLines.length - 1 ? "다음" : "시작"}
                            </button>
                        </div>
                    </div>
                )}

                {phase === "play" && (
                    <div className="stagePlay">
                        <div className="stageTitle">{titleText}</div>

                        <ProblemRenderer
                            issueId={issueId}
                            loading={loading}
                            error={error}
                            onRetry={fetchQuestion}
                            disabled={submitting}
                            question={{
                                title: titleText,
                                content: bodyText,
                                options,
                                answer: question?.answer ?? question?.correctAnswer, // 있을 때만 사용
                            }}
                            submitAnswer={submitAnswer}
                            onResolved={onResolved}
                        />
                    </div>
                )}

                {phase === "result" && (
                    <div className="stageResult">
                        <div className={`resultBadge ${result?.ok ? "ok" : "bad"}`}>
                            {result?.ok ? "정답" : "오답"}
                        </div>

                        {!result?.ok && (result?.answer || result?.message) && (
                            <div className="resultHint">
                                {result?.answer ? (
                                    <>
                                        <div className="resultLabel">정답</div>
                                        <div className="resultValue">{String(result.answer)}</div>
                                    </>
                                ) : (
                                    <div className="resultValue">{String(result?.message || "")}</div>
                                )}
                            </div>
                        )}

                        {result?.explanation && (
                            <div className="resultExplain">{String(result.explanation)}</div>
                        )}

                        <div className="stageActions">
                            <button className="btnPrimary" type="button" onClick={next}>
                                {isLast ? "최종 정리로" : "다음 문제"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="stageMeta">
                <span>stage {stageNumber}</span>
                <span className="dot">·</span>
                <span>session {sid ? `${sid.slice(0, 8)}…` : "-"}</span>
            </div>
        </div>
    );
}
