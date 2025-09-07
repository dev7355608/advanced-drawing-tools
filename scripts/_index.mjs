import { MODULE_ID } from "./const.mjs";
import { cleanData } from "./utils.mjs";

import "./config.mjs";
import "./convert.mjs";
import "./edit-mode.mjs";
import "./fill-style.mjs";
import "./hud.mjs";
import "./line-style.mjs";
import "./precise-text.mjs";
import "./text-style.mjs";

function preProcess(data) {
    const fill = foundry.utils.getProperty(data, `flags.${MODULE_ID}.textStyle.fill`);

    if (fill != null && !Array.isArray(fill)) {
        foundry.utils.setProperty(data, `flags.${MODULE_ID}.textStyle.fill`, [fill]);
    }

    return data;
}

Hooks.on("preCreateDrawing", (document) => {
    document.updateSource(cleanData(preProcess(document.toObject()), { deletionKeys: true }));
});

Hooks.on("preUpdateDrawing", (document, data) => {
    cleanData(preProcess(data), { inplace: true, deletionKeys: true, partial: true });
});

Hooks.on("updateDrawing", (document, changed) => {
    if (!document.rendered || !changed.flags) {
        return;
    }

    const changedFlags = changed.flags[MODULE_ID];

    if (changedFlags) {
        document.object.renderFlags.set({
            refreshShape: "lineStyle" in changedFlags || "-=lineStyle" in changedFlags || "fillStyle" in changedFlags || "-=fillStyle" in changedFlags,
            refreshText: "textStyle" in changedFlags || "-=textStyle" in changedFlags,
        });
    } else if (`-=${MODULE_ID}` in changedFlags) {
        document.object.renderFlags.set({ refreshShape: true, refreshText: true });
    }
});
