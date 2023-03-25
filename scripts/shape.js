import { MODULE_ID } from "./const.js";
import { calculateValue } from "./utils.js";

Hooks.on("refreshDrawing", drawing => {
    if (drawing.shape.destroyed) {
        return;
    }

    const document = drawing.document;
    const { lineStyle, fillStyle } = drawing.shape.geometry?.graphicsData?.[0] ?? {};

    if (lineStyle && document.strokeWidth) {
        const ls = document.getFlag(MODULE_ID, "lineStyle");
        const isSmoothPolygon = document.shape.type === CONST.DRAWING_TYPES.POLYGON && document.bezierFactor > 0;

        Object.assign(lineStyle, {
            cap: isSmoothPolygon ? PIXI.LINE_CAP.ROUND : PIXI.LINE_CAP.SQUARE,
            join: isSmoothPolygon ? PIXI.LINE_CAP.ROUND : PIXI.LINE_CAP.MITER,
            shader: ls?.dash?.[0] && ls?.dash?.[1] ? getDashLineShader(ls.dash[0] ?? 8, ls.dash[1] ?? 5) : null,
        });
    }

    if (fillStyle && document.fillType) {
        let texture;

        if (document.fillType === CONST.DRAWING_FILL_TYPES.PATTERN && (texture = drawing.texture)) {
            const fs = document.getFlag(MODULE_ID, "fillStyle");
            const transform = fs?.transform;
            let scaleW = calculateValue(fs?.texture?.width, document.shape.width) / texture.width;
            let scaleH = calculateValue(fs?.texture?.height, document.shape.height) / texture.height;

            [scaleW, scaleH] = [scaleW || scaleH || 1, scaleH || scaleW || 1];

            const width = scaleW * texture.width;
            const height = scaleH * texture.height;

            fillStyle.matrix = new PIXI.Matrix().setTransform(
                calculateValue(transform?.position?.x, width) ?? 0,
                calculateValue(transform?.position?.y, height) ?? 0,
                calculateValue(transform?.pivot?.x, width) ?? 0,
                calculateValue(transform?.pivot?.y, height) ?? 0,
                transform?.scale?.x ?? 1,
                transform?.scale?.y ?? 1,
                (transform?.rotation ?? 0) / 180 * Math.PI,
                (transform?.skew?.x ?? 0) / 180 * Math.PI,
                (transform?.skew?.y ?? 0) / 180 * Math.PI
            ).append(new PIXI.Matrix(scaleW, 0, 0, scaleH));
        } else {
            fillStyle.smooth = true;
        }
    }
});

const shaderCache = new Map();

function getDashLineShader(dash, gap) {
    const key = `${dash}-${gap}`;
    let shader = shaderCache.get(key);

    if (!shader) {
        shader = new PIXI.smooth.DashLineShader({ dash, gap });
        shaderCache.set(key, shader);
    }

    return shader;
}
