import { MODULE_ID } from "./const.js";
import { cleanData } from "./utils.js";

import "./config.js";
import "./controls.js";
import "./convert.js";
import "./edit-mode.js";
import "./hud.js";
import "./precise-text.js";
import "./shape.js";
import "./text.js";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(MODULE_ID, "DrawingsLayer.prototype.gridPrecision", function () {
        // Force snapping to grid vertices
        if (this._forceSnap) return canvas.grid.type <= CONST.GRID_TYPES.SQUARE ? 2 : 5;

        // Normal snapping precision
        let size = canvas.dimensions.size;
        if (size >= 128) return 16;
        else if (size >= 64) return 8;
        else if (size >= 32) return 4;
        return 1;
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._rescaleDimensions", function (original, dx, dy) {
        let { points, width, height } = original.shape;
        width += dx;
        height += dy;
        points = points || [];

        // Rescale polygon points
        if (this.isPolygon) {
            const scaleX = 1 + (dx / original.shape.width);
            const scaleY = 1 + (dy / original.shape.height);
            points = points.map((p, i) => p * (i % 2 ? scaleY : scaleX));
        }

        // Normalize the shape
        return this.constructor.normalizeShape({
            x: original.x,
            y: original.y,
            shape: { width: Math.roundFast(width), height: Math.roundFast(height), points }
        });
    }, "OVERRIDE");
});

Hooks.on("preCreateDrawing", (document, data) => {
    foundry.utils.mergeObject(data, cleanData(data), { performDeletions: true });
});
