// games/Screen/FinalFixPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finalFix } from "../data/finalFix.js";
import "./FinalFixPage.css";
import "../Screen/MainPage.css";

function cls(...xs) {
    return xs.filter(Boolean).join(" ");
}

function readIssueStats() {
    try {
        const raw = sessionStorage.getItem("issueStats");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function FinalFixPage() {
    const nav = useNavigate();
    const stats = useMemo(() => readIssueStats(), []);

    const unlocked = (stats?.total ?? 0) >= 6;

    const [toast, setToast] = useState(null); // { ok, text }
    const toastTimer = useRef(null);
    const clearToast = () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = null;
        setToast(null);
    };

    useEffect(() => () => clearToast(), []);

    const slots = finalFix.puzzle.slots;
    const modules = finalFix.puzzle.modules;

    const [placed, setPlaced] = useState(() => new Map());
    const [dragging, setDragging] = useState(null); // moduleId

    function onDragStart(e, moduleId) {
        e.dataTransfer.setData("text/plain", moduleId);
        setDragging(moduleId);
    }

    function onDragEnd() {
        setDragging(null);
    }

    function onDropSlot(e, slotId) {
        e.preventDefault();
        const moduleId = e.dataTransfer.getData("text/plain");
        if (!moduleId) return;

        setPlaced((prev) => {
            const next = new Map(prev);

            for (const [k, v] of next.entries()) {
                if (v === moduleId) next.delete(k);
            }

            next.set(slotId, moduleId);
            return next;
        });

        setDragging(null);
    }

    function onDragOver(e) {
        e.preventDefault();
    }

    const allFilled = placed.size === slots.length;

    const isCorrect = useMemo(() => {
        if (!allFilled) return false;
        for (const s of slots) {
            if (placed.get(s.id) !== s.accept) return false;
        }
        return true;
    }, [allFilled, placed, slots]);

    function showToast(ok, text) {
        clearToast();
        setToast({ ok, text });
        toastTimer.current = setTimeout(() => setToast(null), 900);
    }

    function submitFinal() {
        if (!allFilled) return;

        if (isCorrect) {
            showToast(true, "복구 완료");
            const payload = {
                finishedAt: Date.now(),
                finalOk: true,
                stats,
                puzzle: Object.fromEntries(placed.entries()),
            };
            sessionStorage.setItem("finalFixResult", JSON.stringify(payload));

            setTimeout(() => {
                nav("/", { replace: true });
            }, 700);
        } else {
            showToast(false, "복구 실패");
        }
    }

    if (!unlocked) {
        return (
            <div className="finalFixPage">
                <div className="bgScanlines" />
                <div className="bgNoise" />
                <div className="bgGlowA" />
                <div className="bgGlowB" />

                <div className="finalWrap">
                    <div className="finalCard">
                        <div className="finalMini">LOCKED</div>
                        <div className="finalTitle">FINAL FIX는 아직 잠겨있음</div>
                        <div className="finalSub">1~6 케이스를 먼저 완료해야 한다.</div>
                        <button className="finalBtn" onClick={() => nav("/games/issue/g1")}>
                            계속 진행
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="finalFixPage">
            <div className="bgScanlines" />
            <div className="bgNoise" />
            <div className="bgGlowA" />
            <div className="bgGlowB" />

            <div className="finalTopBar">
                <button className="finalBack" type="button" onClick={() => nav("/")}>
                    ←
                </button>
                <div className="finalMeta">
                    <div className="finalChip">CASE 07</div>
                    <div className="finalStat">
                        정답 {stats?.correct ?? 0} · 오답 {stats?.wrong ?? 0} · 정확도{" "}
                        {Math.round((stats?.accuracy ?? 0) * 100)}%
                    </div>
                </div>
            </div>

            <div className="finalWrap">
                <div className="finalCard">
                    <div className="finalMini">FINAL FIX</div>
                    <div className="finalTitle">{finalFix.title}</div>
                    <div className="finalStory">{finalFix.story}</div>

                    <div className="finalHint">힌트: {finalFix.context.hint}</div>

                    <div className="finalPuzzle">
                        <div className="finalSlots">
                            <div className="slotHead">SLOTS</div>
                            {slots.map((s) => {
                                const v = placed.get(s.id);
                                const mod = modules.find((m) => m.id === v);
                                const ok = v ? v === s.accept : false;

                                return (
                                    <div
                                        key={s.id}
                                        className={cls("slot", v && "filled", v && ok && "ok", v && !ok && "bad")}
                                        onDrop={(e) => onDropSlot(e, s.id)}
                                        onDragOver={onDragOver}
                                    >
                                        <div className="slotTop">
                                            <div className="slotLabel">{s.label}</div>
                                            <div className="slotMini">{s.id.toUpperCase()}</div>
                                        </div>

                                        <div className="slotBody">
                                            {mod ? (
                                                <div className="slotModule">
                                                    <div className="slotModuleName">{mod.label}</div>
                                                    <div className="slotModuleId">{mod.id}</div>
                                                </div>
                                            ) : (
                                                <div className="slotEmpty">drop module</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="finalModules">
                            <div className="slotHead">MODULES</div>
                            <div className="moduleGrid">
                                {modules.map((m) => {
                                    const already = Array.from(placed.values()).includes(m.id);

                                    return (
                                        <div
                                            key={m.id}
                                            className={cls("module", already && "used", dragging === m.id && "dragging")}
                                            draggable={!already}
                                            onDragStart={(e) => onDragStart(e, m.id)}
                                            onDragEnd={onDragEnd}
                                        >
                                            <div className="moduleName">{m.label}</div>
                                            <div className="moduleId">{m.id}</div>
                                            <div className="moduleSub">{already ? "installed" : "drag"}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="finalActions">
                                <button
                                    className={cls("finalBtn", (!allFilled || !isCorrect) && "dim")}
                                    onClick={submitFinal}
                                    disabled={!allFilled}
                                >
                                    복구 제출
                                </button>

                                <button
                                    className="finalBtn ghost"
                                    onClick={() => {
                                        setPlaced(new Map());
                                        showToast(true, "초기화");
                                    }}
                                >
                                    재배치
                                </button>
                            </div>

                            <div className="finalFoot">
                                {allFilled ? (isCorrect ? "정상 매칭" : "매칭 오류") : "모듈을 모두 꽂아"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="miniToast" aria-live="polite">
                    <div className={cls("miniToastInner", toast.ok ? "ok" : "bad")}>{toast.text}</div>
                </div>
            )}
        </div>
    );
}
