import { MODULE_ID } from "./const.mjs";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._getLineStyle",
        function (wrapped, ...args) {
            const lineStyle = wrapped(...args);

            if (this.document.strokeWidth) {
                const ls = this.document.getFlag(MODULE_ID, "lineStyle");
                const isSmoothPolygon = this.document.shape.type === "p" && this.document.bezierFactor > 0;

                lineStyle.cap = isSmoothPolygon ? PIXI.LINE_CAP.ROUND : PIXI.LINE_CAP.SQUARE;
                lineStyle.join = isSmoothPolygon ? PIXI.LINE_JOIN.ROUND : PIXI.LINE_JOIN.MITER;
                lineStyle.shader = ls?.dash?.[0] && ls?.dash?.[1] ? getDashLineShader(ls.dash[0] ?? 8, ls.dash[1] ?? 5) : null;
            }

            return lineStyle;
        },
        libWrapper.WRAPPER,
        { perf_mode: libWrapper.PERF_FAST },
    );
});

const DASH_LINE_SHADER_CACHE = new Map();

function getDashLineShader(dash, gap) {
    const key = `${dash}-${gap}`;
    let shader = DASH_LINE_SHADER_CACHE.get(key);

    if (!shader) {
        shader = new PIXI.smooth.DashLineShader({ dash, gap });
        DASH_LINE_SHADER_CACHE.set(key, shader);
    }

    return shader;
}
