import { computed, onBeforeUnmount, ref } from "vue";
const name = ref("");
const connected = ref(false);
const error = ref("");
const state = ref(null);
const ws = ref(null);
const dragging = ref(null);
const me = computed(() => {
    if (!state.value?.yourPlayerId)
        return null;
    return state.value.players.find((p) => p.playerId === state.value?.yourPlayerId) ?? null;
});
const isBuyPhase = computed(() => state.value?.phase === "TAVERN" || state.value?.phase === "POSITIONING");
const secondsLeft = computed(() => {
    if (!state.value)
        return 0;
    const delta = Math.max(0, state.value.phaseEndsAt - Date.now());
    return Math.ceil(delta / 1000);
});
function connect() {
    if (!name.value.trim()) {
        error.value = "Enter a name first.";
        return;
    }
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${location.hostname}:3001/ws`);
    ws.value = socket;
    socket.onopen = () => {
        connected.value = true;
        send({ type: "JOIN_MATCH", name: name.value.trim() });
    };
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "ERROR") {
            error.value = message.message;
        }
        else if (message.type === "MATCH_STATE") {
            state.value = message.state;
        }
    };
    socket.onerror = () => {
        error.value = "Connection failed.";
    };
    socket.onclose = () => {
        connected.value = false;
    };
}
function send(intent) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN)
        return;
    ws.value.send(JSON.stringify(intent));
}
function buy(shopIndex) {
    send({ type: "BUY_UNIT", shopIndex });
}
function reroll() {
    send({ type: "REROLL_SHOP" });
}
function lockToggle() {
    if (!me.value)
        return;
    send({ type: "LOCK_SHOP", locked: !me.value.lockedShop });
}
function upgrade() {
    send({ type: "UPGRADE_TAVERN" });
}
function ready() {
    send({ type: "READY_FOR_COMBAT" });
}
function sell(zone, index) {
    send({ type: "SELL_UNIT", zone, index });
}
function onDragStart(zone, index) {
    dragging.value = { zone, index };
}
function onDrop(toZone, toIndex) {
    if (!dragging.value)
        return;
    send({
        type: "MOVE_UNIT",
        from: dragging.value.zone,
        fromIndex: dragging.value.index,
        to: toZone,
        toIndex
    });
    dragging.value = null;
}
function unitLabel(unit) {
    if (!unit)
        return "Empty";
    return `${unit.name} [${unit.attack}/${unit.hp}] L${unit.level}`;
}
onBeforeUnmount(() => {
    ws.value?.close();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app" },
});
/** @type {__VLS_StyleScopedClasses['app']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "header" },
});
/** @type {__VLS_StyleScopedClasses['header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
if (__VLS_ctx.state) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "round" },
    });
    /** @type {__VLS_StyleScopedClasses['round']} */ ;
    (__VLS_ctx.state.round);
    (__VLS_ctx.state.phase);
    (__VLS_ctx.secondsLeft);
}
if (!__VLS_ctx.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "join-card" },
    });
    /** @type {__VLS_StyleScopedClasses['join-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        placeholder: "Your name",
    });
    (__VLS_ctx.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.connect) },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "error" },
    });
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.state && __VLS_ctx.me) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "layout" },
    });
    /** @type {__VLS_StyleScopedClasses['layout']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "tavern" },
    });
    /** @type {__VLS_StyleScopedClasses['tavern']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stats" },
    });
    /** @type {__VLS_StyleScopedClasses['stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.me.gold);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.me.health);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.me.tavernTier);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.me.xp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "shop-row" },
    });
    /** @type {__VLS_StyleScopedClasses['shop-row']} */ ;
    for (const [unit, idx] of __VLS_vFor((__VLS_ctx.me.shop))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (idx),
            ...{ class: "shop-card" },
        });
        /** @type {__VLS_StyleScopedClasses['shop-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "unit-name" },
        });
        /** @type {__VLS_StyleScopedClasses['unit-name']} */ ;
        (unit?.name ?? "Sold out");
        if (unit) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "unit-meta" },
            });
            /** @type {__VLS_StyleScopedClasses['unit-meta']} */ ;
            (unit.role);
            (unit.attack);
            (unit.hp);
            (unit.speed);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.state && __VLS_ctx.me))
                        return;
                    __VLS_ctx.buy(idx);
                    // @ts-ignore
                    [state, state, state, state, secondsLeft, connected, name, connect, error, error, me, me, me, me, me, me, buy,];
                } },
            disabled: (!__VLS_ctx.isBuyPhase || !unit),
        });
        // @ts-ignore
        [isBuyPhase,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "actions" },
    });
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.reroll) },
        disabled: (!__VLS_ctx.isBuyPhase),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.upgrade) },
        disabled: (!__VLS_ctx.isBuyPhase),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.lockToggle) },
        disabled: (!__VLS_ctx.isBuyPhase),
    });
    (__VLS_ctx.me.lockedShop ? "Unlock Shop" : "Lock Shop");
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.ready) },
        disabled: (!__VLS_ctx.isBuyPhase || __VLS_ctx.me.ready),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "board" },
    });
    /** @type {__VLS_StyleScopedClasses['board']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "slot-row" },
    });
    /** @type {__VLS_StyleScopedClasses['slot-row']} */ ;
    for (const [unit, idx] of __VLS_vFor((__VLS_ctx.me.board))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onDragstart: (...[$event]) => {
                    if (!(__VLS_ctx.state && __VLS_ctx.me))
                        return;
                    __VLS_ctx.onDragStart('board', idx);
                    // @ts-ignore
                    [me, me, me, isBuyPhase, isBuyPhase, isBuyPhase, isBuyPhase, reroll, upgrade, lockToggle, ready, onDragStart,];
                } },
            ...{ onDragover: () => { } },
            ...{ onDrop: (...[$event]) => {
                    if (!(__VLS_ctx.state && __VLS_ctx.me))
                        return;
                    __VLS_ctx.onDrop('board', idx);
                    // @ts-ignore
                    [onDrop,];
                } },
            key: (`board-${idx}`),
            ...{ class: "slot" },
            draggable: "true",
        });
        /** @type {__VLS_StyleScopedClasses['slot']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "slot-title" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-title']} */ ;
        (idx + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "slot-unit" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-unit']} */ ;
        (__VLS_ctx.unitLabel(unit));
        if (unit && __VLS_ctx.isBuyPhase) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.state && __VLS_ctx.me))
                            return;
                        if (!(unit && __VLS_ctx.isBuyPhase))
                            return;
                        __VLS_ctx.sell('board', idx);
                        // @ts-ignore
                        [isBuyPhase, unitLabel, sell,];
                    } },
            });
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "slot-row" },
    });
    /** @type {__VLS_StyleScopedClasses['slot-row']} */ ;
    for (const [unit, idx] of __VLS_vFor((__VLS_ctx.me.bench))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onDragstart: (...[$event]) => {
                    if (!(__VLS_ctx.state && __VLS_ctx.me))
                        return;
                    __VLS_ctx.onDragStart('bench', idx);
                    // @ts-ignore
                    [me, onDragStart,];
                } },
            ...{ onDragover: () => { } },
            ...{ onDrop: (...[$event]) => {
                    if (!(__VLS_ctx.state && __VLS_ctx.me))
                        return;
                    __VLS_ctx.onDrop('bench', idx);
                    // @ts-ignore
                    [onDrop,];
                } },
            key: (`bench-${idx}`),
            ...{ class: "slot bench-slot" },
            draggable: "true",
        });
        /** @type {__VLS_StyleScopedClasses['slot']} */ ;
        /** @type {__VLS_StyleScopedClasses['bench-slot']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "slot-title" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-title']} */ ;
        (idx + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "slot-unit" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-unit']} */ ;
        (__VLS_ctx.unitLabel(unit));
        if (unit && __VLS_ctx.isBuyPhase) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.state && __VLS_ctx.me))
                            return;
                        if (!(unit && __VLS_ctx.isBuyPhase))
                            return;
                        __VLS_ctx.sell('bench', idx);
                        // @ts-ignore
                        [isBuyPhase, unitLabel, sell,];
                    } },
            });
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "sidebar" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({});
    for (const [p] of __VLS_vFor((__VLS_ctx.state.players))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (p.playerId),
        });
        (p.name);
        (p.health);
        (p.ready ? "Ready" : "Thinking");
        // @ts-ignore
        [state,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "log" },
    });
    /** @type {__VLS_StyleScopedClasses['log']} */ ;
    for (const [line, idx] of __VLS_vFor((__VLS_ctx.state.combatLog))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (idx),
        });
        (line);
        // @ts-ignore
        [state,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
