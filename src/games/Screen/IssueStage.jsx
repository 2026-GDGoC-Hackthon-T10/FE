// games/Screen/IssueStage.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import api from "../../shared/api.js";
import ProblemRenderer from "./ProblemRenderer.jsx";
import "./IssueStage.css";

function normalizeOptions(question) {
    const raw =
        question?.options ??
        question?.choices ??
        question?.selections ??
        question?.answers ??
        [];
    if (!Array.isArray(raw)) return [];
    return raw.map((o) => String(o));
}

function pickQuestionId(q) {
    const v = q?.questionId ?? q?.id ?? q?.qid ?? q?.data?.questionId ?? null;
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export default function IssueStage({
                                       stageNumber,
                                       issueId,
                                       issue,
                                       isLast,
                                       onSolved,
                                       skipPre,
                                   }) {
    const preLines = useMemo(() => {
        const a = [];
        if (issue?.title) a.push(issue.title);
        if (issue?.story) a.push(issue.story);
        return a.slice(0, 2);
    }, [issue]);

    const [phase, setPhase] = useState(skipPre ? "play" : "pre");
    const [preIdx, setPreIdx] = useState(0);

    useEffect(() => {
        setPhase(skipPre ? "play" : "pre");
        setPreIdx(0);
    }, [issueId, skipPre]);

    const goNextPre = useCallback(() => {
        if (!preLines.length) {
            setPhase("play");
            return;
        }
        setPreIdx((cur) => {
            const next = cur + 1;
            if (next >= preLines.length) {
                setPhase("play");
                return cur;
            }
            return next;
        });
    }, [preLines.length]);

    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState(null);
    const [qid, setQid] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const abortRef = useRef(false);

    // 1) random -> 2) detail
    const fetchQuestion = useCallback(async () => {
        setError("");
        setLoading(true);
        setQuestion(null);
        setQid(null);
        setResult(null);

        try {
            if (!stageNumber) throw new Error("stageNumber 없음");
            if (abortRef.current) return;

            // 랜덤 문제 조회
            const r1 = await api.get("/api/quiz/random", {
                params: { stage: Number(stageNumber) },
            });
            if (abortRef.current) return;

            const randomData = r1?.data ?? null;
            const extractedId = pickQuestionId(randomData);
            if (extractedId == null) throw new Error("random 응답에 questionId 없음");

            // 문제 상세 조회
            const r2 = await api.get(`/api/quiz/${extractedId}`);
            if (abortRef.current) return;

            const detailData = r2?.data ?? null;
            setQid(extractedId);
            setQuestion(detailData);
        } catch (e) {
            console.error(e);
            if (!abortRef.current) setError("문제를 불러오지 못했어요. 다시 시도해 주세요.");
        } finally {
            if (!abortRef.current) setLoading(false);
        }
    }, [stageNumber]);

    useEffect(() => {
        abortRef.current = false;
        if (phase === "play") fetchQuestion();
        return () => {
            abortRef.current = true;
        };
    }, [phase, fetchQuestion]);

    const titleText = useMemo(() => {
        return (
            question?.title ||
            question?.questionTitle ||
            `CASE ${String(issueId).padStart(2, "0")}`
        );
    }, [question, issueId]);

    const bodyText = useMemo(() => {
        return question?.content || question?.question || question?.questionText || "";
    }, [question]);

    const options = useMemo(() => normalizeOptions(question), [question]);

    // ✅ 채점 요청: sessionId 제거
    const submitAnswer = useCallback(
        async (selectedText) => {
            if (!qid) throw new Error("questionId 없음(문제 다시 불러와야 함)");

            setSubmitting(true);
            setError("");

            try {
                const r = await api.post("/api/quiz/submit", null, {
                    params: {
                        questionId: qid,
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
                setError("제출에 실패했어요. 네트워크/서버 확인 후 다시 시도해 주세요.");
                return { ok: false, message: "제출 실패" };
            } finally {
                setSubmitting(false);
            }
        },
        [qid]
    );

    const onResolved = useCallback((res) => {
        setResult(res);
        setPhase("result");
    }, []);

    const next = useCallback(() => {
        const ok = Boolean(result?.ok);
        onSolved(ok, isLast);
    }, [result, onSolved, isLast]);

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
                                answer: question?.answer ?? question?.correctAnswer,
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
                <span>questionId {qid ?? "-"}</span>
            </div>
        </div>
    );
}
