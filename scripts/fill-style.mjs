import { MODULE_ID } from "./const.mjs";
import { calculateValue } from "./utils.mjs";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._getFillStyle",
        function (wrapped, ...args) {
            const fillStyle = wrapped(...args);

            if (this.document.fillType === CONST.DRAWING_FILL_TYPES.PATTERN && this.texture) {
                const fs = document.getFlag(MODULE_ID, "fillStyle");
                const transform = fs?.transform;
                let scaleW = calculateValue(fs?.texture?.width, document.shape.width) / this.texture.width;
                let scaleH = calculateValue(fs?.texture?.height, document.shape.height) / this.texture.height;

                [scaleW, scaleH] = [scaleW || scaleH || 1, scaleH || scaleW || 1];

                const width = scaleW * this.texture.width;
                const height = scaleH * this.texture.height;

                fillStyle.matrix = new PIXI.Matrix().setTransform(
                    calculateValue(transform?.position?.x, width) ?? 0,
                    calculateValue(transform?.position?.y, height) ?? 0,
                    calculateValue(transform?.pivot?.x, width) ?? 0,
                    calculateValue(transform?.pivot?.y, height) ?? 0,
                    transform?.scale?.x ?? 1,
                    transform?.scale?.y ?? 1,
                    (transform?.rotation ?? 0) / 180 * Math.PI,
                    (transform?.skew?.x ?? 0) / 180 * Math.PI,
                    (transform?.skew?.y ?? 0) / 180 * Math.PI,
                ).append(new PIXI.Matrix(scaleW, 0, 0, scaleH));
            } else {
                fillStyle.smooth = true;
            }

            return fillStyle;
        },
        libWrapper.WRAPPER,
        { perf_mode: libWrapper.PERF_FAST },
    );
});
