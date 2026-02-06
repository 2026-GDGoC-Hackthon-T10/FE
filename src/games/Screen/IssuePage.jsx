// games/Screen/IssuePage.jsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../shared/api.js";
import { issues } from "../data/issues";
import IssueStage from "./IssueStage";
import "./IssuePage.css";
import "./MainPage.css";
import { pickGroupIds, markGroupDone, isGroupDone } from "../utils/issueFlow";

function groupIdToStageNumber(groupId) {
    const n = Number(String(groupId).replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 1;
}

function IssuePageInner({ groupId }) {
    const nav = useNavigate();

    const stageNumber = useMemo(() => groupIdToStageNumber(groupId), [groupId]);
    const ids = useMemo(() => pickGroupIds(groupId), [groupId]);

    const [idx, setIdx] = useState(0);
    const issueId = ids[idx];
    const issue = issues[issueId];

    const [sessionId, setSessionId] = useState("");

    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);

    const total = correct + wrong;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    const [skipPre, setSkipPre] = useState(false);

    useEffect(() => {
        setIdx(0);
        setCorrect(0);
        setWrong(0);
    }, [groupId]);

    useEffect(() => {
        setSkipPre(isGroupDone(groupId));
    }, [groupId]);

    // ✅ 스테이지 입장: sessionId 확보 (기존 유지 + "로컬에 있으면 그걸 우선 사용"만 추가)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await api.post(`/api/game/stage/${stageNumber}/enter`);
                if (!alive) return;
                const sid = res?.data?.sessionId ?? res?.data?.session ?? res?.data?.id ?? "";
                setSessionId(String(sid || ""));
            } catch (e) {
                console.error(e);
                if (alive) setSessionId("");
            }
        })();

        return () => {
            alive = false;
        };
    }, [stageNumber]);

    const isLast = idx >= ids.length - 1;

    const onSolved = useCallback(
        async (ok, last) => {
            const nextCorrect = ok ? correct + 1 : correct;
            const nextWrong = ok ? wrong : wrong + 1;

            if (ok) setCorrect((c) => c + 1);
            else setWrong((w) => w + 1);

            if (last) {
                markGroupDone(groupId, {
                    lastIssueId: issueId,
                    correct: nextCorrect,
                    wrong: nextWrong,
                    accuracy: (() => {
                        const t = nextCorrect + nextWrong;
                        return t ? nextCorrect / t : 0;
                    })(),
                });

                // ✅ stage clear + report unlock
                try {
                    await api.post(`/api/game/stage/${stageNumber}/clear`);
                } catch (e) {
                    console.error(e);
                }
                try {
                    await api.post(`/api/game/report/unlock`);
                } catch (e) {
                    console.error(e);
                }

                nav("/games/finalfix", { replace: true });
                return;
            }

            setIdx((v) => v + 1);
        },
        [correct, wrong, groupId, issueId, nav, stageNumber]
    );

    if (!issue) return null;

    return (
        <div className="issuePageRoot">
            <div className="issueTopBar">
                <button className="issueBack" type="button" onClick={() => nav("/games")}>
                    ←
                </button>
                <div className="issueTopMeta">
                    <div className="issueTopChip">CASE {String(issueId).padStart(2, "0")}</div>
                    <div className="issueTopStat">
                        정답 {correct} · 오답 {wrong} · 정확도 {accuracy}%
                    </div>
                </div>
            </div>

            <IssueStage
                key={`${groupId}-${issueId}-${skipPre ? 1 : 0}`}
                stageNumber={issueId}
                sessionId={sessionId}
                issueId={issueId}
                issue={issue}
                isLast={isLast}
                onSolved={onSolved}
                skipPre={skipPre}
            />
        </div>
    );
}

export default function IssuePage() {
    const params = useParams();
    const groupId = params.groupId ?? "g1";
    return <IssuePageInner key={groupId} groupId={groupId} />;
}
