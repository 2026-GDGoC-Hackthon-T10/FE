// games/data/finalFix.js
export const finalFix = {
    id: 7,
    title: "FINAL FIX · 복구 퍼즐",
    story:
        "지금까지 수집한 조각을 조립해 서버를 복구한다. 모듈 3개를 올바른 슬롯에 꽂아 ‘복구 제출’을 완료해.",
    context: {
        hint: "모듈을 드래그해서 슬롯에 꽂아. 전부 맞으면 제출 버튼이 활성화된다.",
    },

    puzzle: {
        slots: [
            { id: "slotA", label: "NET", accept: "modNET" },
            { id: "slotB", label: "MEM", accept: "modMEM" },
            { id: "slotC", label: "LOOP", accept: "modLOOP" },
        ],
        modules: [
            { id: "modNET", label: "PACKET ROUTER" },
            { id: "modMEM", label: "GC PATCH" },
            { id: "modLOOP", label: "EVENT LOOP SEAL" },
        ],
    },

    success: {
        title: "복구 완료",
        message: "좋아. 시스템이 안정화됐다. 최종 리포트를 생성한다.",
    },
    fail: {
        title: "복구 실패",
        message: "슬롯 매칭이 틀렸다. 모듈 배치를 다시 확인해.",
    },
};
