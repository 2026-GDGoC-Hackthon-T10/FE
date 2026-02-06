import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { issues } from "../data/issues";
import "./IssuePage.css";
import "../Screen/MainPage.css";

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}
function pickGroupIds(groupId) {
    if (groupId === "g1") return [1, 2];
    if (groupId === "g2") return [3, 4];
    if (groupId === "g3") return [5, 6];
    return [1, 2];
}

const PRE_LINES = {
    1: ["코드 오류를 확인해보자."],
    2: ["이번엔 원인 라인을 봉인해."],
    3: ["좋아. 상황에 맞는 명령어를 정확히 입력해."],
    4: ["근본 원인을 분류하자. O/X로."],
    5: ["요구사항이 한꺼번에 밀려왔다. 트레이드오프를 이겨."],
    6: ["장애는 첫 30초가 전부다. 리듬대로 초동을 밟아."],
};

function buildReviewFocus(issue) {
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

function normCmd(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replaceAll("(repo-url)", "<repo-url>")
        .replaceAll("(<repo-url>)", "<repo-url>")
        .replaceAll("(repo url)", "<repo-url>")
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

function IssueStage({ issueId, issue, isLast, onSolved }) {
    const [flow, setFlow] = useState("pre"); // pre | play
    const [preLineIdx, setPreLineIdx] = useState(0);
    const [toast, setToast] = useState(null); // { ok, text }

    const autoTimerRef = useRef(null);
    const clearAutoTimer = () => {
        if (autoTimerRef.current) {
            clearTimeout(autoTimerRef.current);
            autoTimerRef.current = null;
        }
    };

    useEffect(() => () => clearAutoTimer(), []);

    function showToastAndAutoNext(ok) {
        clearAutoTimer();
        setToast({ ok, text: ok ? "맞았어요" : "틀렸어요" });
        autoTimerRef.current = setTimeout(() => {
            setToast(null);
            onSolved(ok, isLast);
        }, 850);
    }

    const preLines = PRE_LINES[issueId] ?? ["..."];
    function advancePreDialogue(e) {
        if (flow !== "pre") return;
        if (e?.target?.closest?.("button, a, input, textarea")) return;
        if (preLineIdx < preLines.length - 1) {
            setPreLineIdx((v) => v + 1);
            return;
        }
        setFlow("play");
    }

    const mode = issue?.game?.mode;

    // ========= 1) drag_patch =========
    const reviewFocus = useMemo(() => buildReviewFocus(issue), [issue]);
    const boardRef = useRef(null);
    const [patchPos, setPatchPos] = useState({ x: 50, y: 78 });
    const dragRef = useRef({
        on: false,
        startX: 0,
        startY: 0,
        baseX: 50,
        baseY: 78,
    });

    const spawn = issue?.game?.spawn ?? [];
    const patchLabel = issue?.game?.patchLabel ?? "PATCH";
    const correctOptionId = issue?.game?.correctOptionId;

    function onPatchPointerDown(e) {
        if (flow !== "play" || toast) return;
        if (mode !== "drag_patch") return;

        e.preventDefault();
        e.stopPropagation();

        dragRef.current.on = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.baseX = patchPos.x;
        dragRef.current.baseY = patchPos.y;

        window.addEventListener("pointermove", onPatchPointerMove);
        window.addEventListener("pointerup", onPatchPointerUp, { once: true });
    }

    function onPatchPointerMove(e) {
        if (!dragRef.current.on) return;
        const b = boardRef.current?.getBoundingClientRect();
        if (!b) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const nx = dragRef.current.baseX + (dx / b.width) * 100;
        const ny = dragRef.current.baseY + (dy / b.height) * 100;
        setPatchPos({ x: clamp(nx, 4, 96), y: clamp(ny, 8, 92) });
    }

    function onPatchPointerUp(e) {
        dragRef.current.on = false;
        window.removeEventListener("pointermove", onPatchPointerMove);

        const b = boardRef.current?.getBoundingClientRect();
        if (!b) return;
        const px = e.clientX - b.left;
        const py = e.clientY - b.top;

        const R = 110;
        let hit = null;
        let best = Infinity;

        for (const s of spawn) {
            const tx = (s.x / 100) * b.width;
            const ty = (s.y / 100) * b.height;
            const dist = Math.hypot(px - tx, py - ty);
            if (dist <= R && dist < best) {
                best = dist;
                hit = s;
            }
        }

        if (!hit) {
            setPatchPos({ x: 50, y: 78 });
            return;
        }

        const ok = hit.optionId === correctOptionId;
        showToastAndAutoNext(ok);
    }

    // ========= 2) erase_line =========
    const [erasedLines, setErasedLines] = useState(() => new Set());
    const [eraserOn, setEraserOn] = useState(true);

    function toggleEraseLine(n) {
        if (flow !== "play" || toast) return;
        if (mode !== "erase_line") return;
        if (!eraserOn) return;

        setErasedLines((prev) => {
            const nextSet = new Set(prev);
            if (nextSet.has(n)) nextSet.delete(n);
            else nextSet.add(n);
            return nextSet;
        });
    }

    function submitErase() {
        if (flow !== "play" || toast) return;
        if (mode !== "erase_line") return;

        const correctLine = issue.game?.correctLine;
        const required = issue.game?.erasesRequired ?? 1;
        const erased = Array.from(erasedLines.values());
        const ok =
            erased.length === required &&
            erased.includes(correctLine) &&
            erased.every((x) => x === correctLine);

        showToastAndAutoNext(ok);
    }

    // ========= 3) type_fall_multi =========
    const fallRafRef = useRef(null);
    const fallSpawnRef = useRef(null);
    const fallStartAtRef = useRef(0);
    const fallRunRef = useRef(false);

    const [tfStarted, setTfStarted] = useState(false);
    const [typed, setTyped] = useState("");
    const [tokensOn, setTokensOn] = useState([]); // {id,text,spawnAt, y}
    const tokenIdRef = useRef(1);

    const tfPrompt = issue?.game?.prompt ?? "";
    const tfAnswer = issue?.game?.answer ?? "";
    const tfPool = issue?.game?.pool ?? [];
    const spawnEveryMs = issue?.game?.spawnEveryMs ?? 900;
    const fallTimeMs = issue?.game?.fallTimeMs ?? 12000;
    const maxOnScreen = issue?.game?.maxOnScreen ?? 6;

    const stopTypeFall = useCallback(() => {
        fallRunRef.current = false;
        if (fallRafRef.current) cancelAnimationFrame(fallRafRef.current);
        fallRafRef.current = null;
        if (fallSpawnRef.current) clearInterval(fallSpawnRef.current);
        fallSpawnRef.current = null;
    }, []);

    useEffect(() => () => stopTypeFall(), [stopTypeFall]);

    function startTypeFall() {
        if (fallRunRef.current) return;
        fallRunRef.current = true;
        fallStartAtRef.current = performance.now();
        setTokensOn([]);
        setTyped("");

        fallSpawnRef.current = setInterval(() => {
            if (!fallRunRef.current) return;
            setTokensOn((prev) => {
                if (prev.length >= maxOnScreen) return prev;

                const pool = tfPool.filter((x) => normCmd(x) !== normCmd(tfAnswer));
                const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "git status";

                const id = tokenIdRef.current++;
                const now = performance.now();
                return [...prev, { id, text: pick, spawnAt: now, y: 0 }];
            });
        }, spawnEveryMs);

        const tick = () => {
            if (!fallRunRef.current) return;
            const now = performance.now();

            setTokensOn((prev) =>
                prev
                    .map((tk) => {
                        const p = clamp((now - tk.spawnAt) / fallTimeMs, 0, 1);
                        return { ...tk, y: p * 100 };
                    })
                    .filter((tk) => tk.y < 98)
            );

            fallRafRef.current = requestAnimationFrame(tick);
        };

        fallRafRef.current = requestAnimationFrame(tick);
    }

    function ensureTypeFallStart() {
        if (toast) return;
        if (flow !== "play") return;
        if (mode !== "type_fall_multi") return;
        if (tfStarted) return;
        setTfStarted(true);
        startTypeFall();
    }

    function submitTyping(e) {
        e.preventDefault();
        if (toast) return;
        if (mode !== "type_fall_multi") return;
        if (!tfStarted) return;

        stopTypeFall();
        const ok = isCloneAnswer(typed, tfAnswer) || normCmd(typed) === normCmd(tfAnswer);
        showToastAndAutoNext(ok);
    }

    // ========= 4) maze_ox =========
    const grid = issue?.game?.grid ?? [];
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    const start = issue?.game?.start ?? { r: 1, c: 1 };
    const zoneO = issue?.game?.zoneO ?? { r: 1, c: 1 };
    const zoneX = issue?.game?.zoneX ?? { r: 1, c: 1 };

    const stmts = issue?.game?.statements ?? [];
    const tokens = issue?.game?.tokens ?? [];

    const [pos, setPos] = useState(start);
    const [carry, setCarry] = useState(null); // stmtId
    const [placed, setPlaced] = useState(() => new Map()); // stmtId -> "O"|"X"

    const tokenAt = (r, c) => tokens.find((t) => t.r === r && t.c === c)?.id ?? null;

    const isWall = (r, c) => {
        if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
        return grid[r][c] === 1;
    };

    const move = useCallback(
        (dr, dc) => {
            if (toast) return;
            setPos((p) => {
                const nr = p.r + dr;
                const nc = p.c + dc;
                if (isWall(nr, nc)) return p;
                return { r: nr, c: nc };
            });
        },
        [toast, rows, cols, grid]
    );

    const pickOrDrop = useCallback(() => {
        if (toast) return;

        setCarry((curCarry) => {
            // drop
            if (curCarry) {
                const atO = pos.r === zoneO.r && pos.c === zoneO.c;
                const atX = pos.r === zoneX.r && pos.c === zoneX.c;
                if (!atO && !atX) return curCarry;

                setPlaced((prev) => {
                    const next = new Map(prev);
                    next.set(curCarry, atO ? "O" : "X");
                    return next;
                });
                return null;
            }

            // pick
            const here = tokenAt(pos.r, pos.c);
            if (!here) return null;
            if (placed.has(here)) return null;
            return here;
        });
    }, [toast, pos, zoneO, zoneX, placed, tokens]);

    function submitMaze() {
        if (toast) return;

        if (placed.size !== stmts.length) {
            showToastAndAutoNext(false);
            return;
        }

        let ok = true;
        for (const s of stmts) {
            const v = placed.get(s.id);
            const should = s.truth ? "O" : "X";
            if (v !== should) {
                ok = false;
                break;
            }
        }
        showToastAndAutoNext(ok);
    }

    useEffect(() => {
        function onKeyDown(e) {
            if (mode !== "maze_ox") return;
            if (flow !== "play") return;

            if (e.key === "ArrowUp") move(-1, 0);
            else if (e.key === "ArrowDown") move(1, 0);
            else if (e.key === "ArrowLeft") move(0, -1);
            else if (e.key === "ArrowRight") move(0, 1);
            else if (e.key === " " || e.key === "Enter") pickOrDrop();
            else return;

            e.preventDefault();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [mode, flow, move, pickOrDrop]);

    // ========= 5) rps_tradeoff =========
    const rpsEnemy = issue?.game?.enemy ?? null;
    const rpsCorrectHand = issue?.game?.correctHand ?? null;
    const rpsCorrectOptionId = issue?.game?.correctOptionId ?? null;

    const rpsOptions = issue?.options ?? [];
    const rpsMap = useMemo(() => {
        const byId = (id) => rpsOptions.find((o) => o.id === id);
        return {
            rock: byId("b") ?? rpsOptions[1],
            paper: byId("a") ?? rpsOptions[0],
            scissors: byId("c") ?? rpsOptions[2],
        };
    }, [rpsOptions]);

    function pickRps(hand) {
        if (toast) return;
        if (flow !== "play") return;
        if (mode !== "rps_tradeoff") return;

        const okHand = hand === rpsCorrectHand;
        const pickedOpt = rpsMap[hand];
        const okOpt = rpsCorrectOptionId ? pickedOpt?.id === rpsCorrectOptionId : true;

        showToastAndAutoNext(okHand && okOpt);
    }

    // ========= 6) rhythm_triage =========
    const [rhStarted, setRhStarted] = useState(false);
    const [rhNow, setRhNow] = useState(0);
    const [rhIdx, setRhIdx] = useState(0);
    const [rhMiss, setRhMiss] = useState(0);

    const rhRef = useRef({ running: false, startAt: 0, raf: null });

    const rh = issue?.game ?? {};
    const rhPattern = rh?.pattern ?? [];
    const rhLanes = rh?.lanes ?? [];
    const hitWindowMs = rh?.hitWindowMs ?? 160;
    const missLimit = rh?.missLimit ?? 1;
    const leadInMs = rh?.leadInMs ?? 900;

    const rhTotalMs = rhPattern.length ? rhPattern[rhPattern.length - 1].t + 500 : 4000;

    const stopRhythm = useCallback(() => {
        rhRef.current.running = false;
        if (rhRef.current.raf) cancelAnimationFrame(rhRef.current.raf);
        rhRef.current.raf = null;
    }, []);

    useEffect(() => () => stopRhythm(), [stopRhythm]);

    const rhFillPct = useMemo(() => {
        const denom = rhTotalMs + leadInMs;
        const numer = rhNow + leadInMs;
        return clamp((numer / denom) * 100, 0, 100);
    }, [rhNow, rhTotalMs, leadInMs]);

    const startRhythm = useCallback(() => {
        if (rhRef.current.running) return;
        rhRef.current.running = true;
        rhRef.current.startAt = performance.now() + leadInMs;

        setRhNow(0);
        setRhIdx(0);
        setRhMiss(0);

        const tick = () => {
            if (!rhRef.current.running) return;
            const now = performance.now();
            const t = now - rhRef.current.startAt;

            setRhNow(clamp(t, -leadInMs, rhTotalMs));

            if (t > rhTotalMs + 120) {
                stopRhythm();
                setRhStarted(false);
                // 종료 판정은 마지막 tick에서 바로 하면 stale 위험 있어서, 여기선 즉시 판정
                // (rhIdx/rhMiss는 setState라 한 틱 늦을 수 있음) -> 패턴 다 맞춘 경우만 허용
                // 안전하게: 패턴 끝까지 입력 안 됐으면 실패 처리
                showToastAndAutoNext(false);
                return;
            }

            rhRef.current.raf = requestAnimationFrame(tick);
        };

        rhRef.current.raf = requestAnimationFrame(tick);
    }, [leadInMs, rhTotalMs, stopRhythm]);

    function ensureRhythmStart() {
        if (toast) return;
        if (flow !== "play") return;
        if (mode !== "rhythm_triage") return;
        if (rhStarted) return;
        setRhStarted(true);
        startRhythm();
    }

    function finalizeRhythmIfDone(nextIdx, nextMiss) {
        if (nextIdx >= rhPattern.length) {
            stopRhythm();
            setRhStarted(false);
            const ok = nextMiss <= missLimit;
            showToastAndAutoNext(ok);
            return true;
        }
        return false;
    }

    function hitLane(laneId) {
        if (toast) return;
        if (flow !== "play") return;
        if (mode !== "rhythm_triage") return;
        if (!rhStarted) return;

        const now = performance.now();
        const t = now - rhRef.current.startAt;

        const cur = rhPattern[rhIdx];
        if (!cur) return;

        const dt = Math.abs(t - cur.t);
        const isHit = cur.lane === laneId && dt <= hitWindowMs;

        if (isHit) {
            const nextIdx = rhIdx + 1;
            setRhIdx(nextIdx);
            finalizeRhythmIfDone(nextIdx, rhMiss);
            return;
        }

        const nextMiss = rhMiss + 1;
        setRhMiss(nextMiss);
        if (nextMiss > missLimit) {
            stopRhythm();
            setRhStarted(false);
            showToastAndAutoNext(false);
        }
    }

    // ========= className 문자열(렌더 중 사용자 함수 호출 제거) =========
    const bottomBubbleClass = flow === "pre" ? "bottomBubble bump" : "bottomBubble";
    const miniToastInnerClass = toast ? `miniToastInner ${toast.ok ? "ok" : "bad"}` : "miniToastInner";
    const toolBtnErase = eraserOn ? "toolBtn active" : "toolBtn";
    const toolBtnView = !eraserOn ? "toolBtn active" : "toolBtn";
    const codeLinesClass = eraserOn ? "codeLines eraserOn" : "codeLines";

    return (
        <div className="issueStageRoot" onMouseDown={advancePreDialogue}>
            <div className="bgScanlines" />
            <div className="bgNoise" />
            <div className="bgGlowA" />
            <div className="bgGlowB" />

            <div className="issueWrap">
                <div className="issueCard">
                    <div className="issueMini">{issue.context?.file ?? "FILE"}</div>
                    <div className="issueBig">{issue.title}</div>
                    <div className="issueHint">{issue.context?.hint}</div>

                    {/* 1) drag_patch */}
                    {mode === "drag_patch" && (
                        <>
                            <div className="reviewFocusBox">
                                <div className="reviewFocusHead">
                                    <div className="reviewFocusTag">REVIEW POINT</div>
                                    <div className="reviewFocusHint">여기만 보고 판단하면 됨</div>
                                </div>
                                <div className="reviewFocusLines">
                                    {reviewFocus.map((l) => (
                                        <div key={l.n} className="reviewFocusLine">
                                            <span className="rfNo">{l.n}</span>
                                            <span className="rfText">{l.t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {flow === "play" && (
                                <div className="issueBoard" ref={boardRef}>
                                    {spawn.map((s) => {
                                        const opt = issue.options?.find((o) => o.id === s.optionId);
                                        return (
                                            <div
                                                key={s.optionId}
                                                className="patchTarget"
                                                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                                            >
                                                <div className="patchTargetK">TARGET</div>
                                                <div className="patchTargetT">{opt?.label}</div>
                                                <div className="patchTargetS">drop PATCH</div>
                                            </div>
                                        );
                                    })}

                                    <div
                                        className="patchChip"
                                        style={{ left: `${patchPos.x}%`, top: `${patchPos.y}%` }}
                                        onPointerDown={onPatchPointerDown}
                                        role="button"
                                        aria-label="patch"
                                    >
                                        <div className="patchChipTop">{patchLabel}</div>
                                        <div className="patchChipSub">drag</div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* 2) erase_line */}
                    {mode === "erase_line" && flow === "play" && (
                        <>
                            <div className="eraseToolbar">
                                <button type="button" className={toolBtnErase} onClick={() => setEraserOn(true)}>
                                    지우개
                                </button>
                                <button type="button" className={toolBtnView} onClick={() => setEraserOn(false)}>
                                    보기
                                </button>

                                <div className="toolHint">{eraserOn ? "문제 라인을 클릭해서 지워." : "보기 모드"}</div>
                                <button type="button" className="submitBtn" onClick={submitErase}>
                                    봉인
                                </button>
                            </div>

                            <div className="issueCodeBox big">
                                <div className="codeHead">
                                    <div className="codeFile">{issue.context?.file}</div>
                                    <div className="codeNote">힌트: {issue.context?.hint}</div>
                                </div>

                                <div className={codeLinesClass}>
                                    {issue.codeLines?.map((ln) => {
                                        const erased = erasedLines.has(ln.n);
                                        const lineClass = erased ? "codeLine erased" : "codeLine";
                                        return (
                                            <div key={ln.n} className={lineClass} onClick={() => toggleEraseLine(ln.n)}>
                                                <span className="lnNo">{ln.n}</span>
                                                <span className="lnText">{ln.t || "\u00A0"}</span>
                                                <span className="lnStrike" aria-hidden="true" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 3) type_fall_multi */}
                    {mode === "type_fall_multi" && flow === "play" && (
                        <div className="typeFallWrap">
                            <div className="typeFallTop">
                                <div className="typeFallPrompt">
                                    <div className="tfLabel">상황</div>
                                    <div className="tfPromptText">{tfPrompt}</div>
                                </div>
                                <div className="typeFallHint">떨어지는 명령어는 방해물. 정답 명령어를 정확히 입력</div>
                            </div>

                            <div className="typeFallLane">
                                {!tfStarted && (
                                    <button
                                        type="button"
                                        className="typeFallStart"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            ensureTypeFallStart();
                                        }}
                                    >
                                        START
                                    </button>
                                )}

                                {tokensOn.map((tk) => (
                                    <div key={tk.id} className="typeFallDrop" style={{ top: `${tk.y}%` }}>
                                        <span className="typeFallCode">{tk.text}</span>
                                    </div>
                                ))}
                                <div className="typeFallFloor" />
                            </div>

                            <form className="typeFallInputRow" onSubmit={submitTyping}>
                                <input
                                    className="typeFallInput"
                                    value={typed}
                                    onFocus={ensureTypeFallStart}
                                    onChange={(e) => setTyped(e.target.value)}
                                    placeholder="정답 명령어 입력…"
                                    autoFocus
                                />
                                <button className="typeFallSubmit" type="submit">
                                    입력
                                </button>
                            </form>

                            <div className="typeFallCandidates">
                                <div className="tfLabel">후보</div>
                                <div className="tfCandList">
                                    {tfPool.map((c) => (
                                        <div key={c} className="tfCand">
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4) maze_ox */}
                    {mode === "maze_ox" && flow === "play" && (
                        <div className="mazeWrap">
                            <div className="mazeTop">
                                <div className="mazeInfo">
                                    방향키 이동 · <b>Space/Enter</b>로 줍기/놓기
                                </div>
                                <button className="submitBtn" type="button" onClick={submitMaze}>
                                    제출
                                </button>
                            </div>

                            <div className="mazeBoard">
                                <div
                                    className="mazeGrid"
                                    style={{
                                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                                    }}
                                >
                                    {grid.flatMap((row, r) =>
                                        row.map((cell, c) => {
                                            const wall = cell === 1;
                                            const isP = pos.r === r && pos.c === c;
                                            const isO = zoneO.r === r && zoneO.c === c;
                                            const isX = zoneX.r === r && zoneX.c === c;

                                            const tokId = tokenAt(r, c);
                                            const already = tokId ? placed.has(tokId) : false;

                                            const cellClass =
                                                "mazeCell" +
                                                (wall ? " wall" : "") +
                                                (isO ? " zoneO" : "") +
                                                (isX ? " zoneX" : "");

                                            return (
                                                <div key={`${r}-${c}`} className={cellClass}>
                                                    {tokId && !already && <div className="mazeToken">{tokId.toUpperCase()}</div>}
                                                    {isP && <div className="mazePlayer">{carry ? "📦" : "●"}</div>}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="mazeSide">
                                    <div className="mazeSideTitle">문장</div>
                                    <div className="mazeList">
                                        {stmts.map((s) => {
                                            const v = placed.get(s.id);
                                            const stmtClass = v ? "mazeStmt done" : "mazeStmt";
                                            return (
                                                <div key={s.id} className={stmtClass}>
                                                    <div className="mazeStmtId">{s.id.toUpperCase()}</div>
                                                    <div className="mazeStmtText">{s.text}</div>
                                                    <div className="mazeStmtMark">{v ? v : "-"}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mazeLegend">
                                        <div className="lgRow">
                                            <span className="lgBox o" /> O 구역
                                        </div>
                                        <div className="lgRow">
                                            <span className="lgBox x" /> X 구역
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5) rps_tradeoff */}
                    {mode === "rps_tradeoff" && flow === "play" && (
                        <div className="rpsWrap" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="rpsTop">
                                <div className="rpsEnemy">
                                    <div className="rpsTag">{rpsEnemy?.tag ?? "ENEMY"}</div>
                                    <div className="rpsLine">{rpsEnemy?.line ?? ""}</div>
                                </div>
                                <div className="rpsHint">손을 골라 “설계”를 때려눕혀</div>
                            </div>

                            <div className="rpsGrid">
                                {["rock", "paper", "scissors"].map((hand) => {
                                    const opt = rpsMap[hand];
                                    const icon = hand === "rock" ? "✊" : hand === "paper" ? "✋" : "✌️";
                                    return (
                                        <button key={hand} type="button" className="rpsCard" onClick={() => pickRps(hand)}>
                                            <div className="rpsIcon">{icon}</div>
                                            <div className="rpsHand">{hand.toUpperCase()}</div>
                                            <div className="rpsOpt">{opt?.label}</div>
                                            <div className="rpsSub">tap</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rpsEnemyHand">
                                ENEMY: <b>{String(rpsEnemy?.hand ?? "").toUpperCase()}</b>
                            </div>
                        </div>
                    )}

                    {/* 6) rhythm_triage */}
                    {mode === "rhythm_triage" && flow === "play" && (
                        <div className="rhWrap" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="rhTop">
                                <div className="rhTitle">TRIAGE BEAT</div>
                                <div className="rhMeta">
                                    {rhStarted ? (
                                        <>
                      <span>
                        진행 {rhIdx}/{rhPattern.length}
                      </span>
                                            <span>
                        MISS {rhMiss}/{missLimit}
                      </span>
                                        </>
                                    ) : (
                                        <span>START를 눌러 시작</span>
                                    )}
                                </div>
                                <button type="button" className="submitBtn" onClick={ensureRhythmStart} disabled={rhStarted}>
                                    START
                                </button>
                            </div>

                            <div className="rhBar">
                                <div className="rhBarFill" style={{ width: `${rhFillPct}%` }} />
                            </div>

                            <div className="rhLaneRow">
                                {rhLanes.map((l) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className="rhLaneBtn"
                                        onClick={() => hitLane(l.id)}
                                        disabled={!rhStarted}
                                    >
                                        <div className="rhLaneK">{l.id}</div>
                                        <div className="rhLaneT">{l.label}</div>
                                        <div className="rhLaneS">{l.sub}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="rhNext">
                                NEXT: {rhPattern[rhIdx] ? `${rhPattern[rhIdx].lane}번` : "끝"}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {(flow === "pre" || flow === "play") && (
                <div className={bottomBubbleClass} role="status" aria-live="polite">
                    <div className="bbAvatar">YOU</div>
                    <div className="bbTextWrap">
                        <div className="bbText" key={`${issueId}-${preLineIdx}`}>
                            {flow === "pre" ? preLines[preLineIdx] : ""}
                        </div>
                        <div className="bbStep">{flow === "pre" ? "tap" : ""}</div>
                    </div>
                    <div className="bbFlash" aria-hidden="true" />
                </div>
            )}

            {toast && (
                <div className="miniToast" aria-live="polite">
                    <div className={miniToastInnerClass}>{toast.text}</div>
                </div>
            )}
        </div>
    );
}

export default function IssuePage() {
    const nav = useNavigate();
    const params = useParams();
    const groupId = params.groupId ?? "g1";

    const ids = useMemo(() => pickGroupIds(groupId), [groupId]);
    const [idx, setIdx] = useState(0);

    const issueId = ids[idx];
    const issue = issues[issueId];

    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);

    const accuracy = useMemo(() => {
        const total = correct + wrong;
        return total ? Math.round((correct / total) * 100) : 0;
    }, [correct, wrong]);

    useEffect(() => {
        const total = correct + wrong;
        sessionStorage.setItem(
            "issueStats",
            JSON.stringify({
                correct,
                wrong,
                total,
                accuracy: total ? correct / total : 0,
                lastIssueId: issueId,
                groupId,
                updatedAt: Date.now(),
            })
        );
    }, [correct, wrong, issueId, groupId]);

    if (!issue) return null;
    const isLast = idx >= ids.length - 1;

    function onSolved(ok, last) {
        if (ok) setCorrect((c) => c + 1);
        else setWrong((w) => w + 1);

        if (last) {
            nav("/", { replace: true });
            return;
        }
        setIdx((v) => v + 1);
    }

    return (
        <div className="issuePageRoot">
            <div className="issueTopBar">
                <button className="issueBack" type="button" onClick={() => nav("/")}>
                    ←
                </button>
                <div className="issueTopMeta">
                    <div className="issueTopChip">CASE {String(issueId).padStart(2, "0")}</div>
                    <div className="issueTopStat">
                        정답 {correct} · 오답 {wrong} · 정확도 {accuracy}%
                    </div>
                </div>
            </div>

            <IssueStage key={`${groupId}-${issueId}`} issueId={issueId} issue={issue} isLast={isLast} onSolved={onSolved} />
        </div>
    );
}
