import { MODULE_ID } from "./const.js";
import { WarpedText } from "./warped-text.js";
import { calculateValue } from "./utils.js";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(MODULE_ID, "Drawing.prototype._rescaleDimensions", function (original, dx, dy) {
        let { points, width, height } = original.shape;
        width += dx;
        height += dy;
        points = points || [];

        // Rescale polygon points
        if (this.isPolygon) {
            const scaleX = 1 + (dx / original.shape.width);
            const scaleY = 1 + (dy / original.shape.height);
            points = points.map((p, i) => Math.round(p * (i % 2 ? scaleY : scaleX)));
        }

        // Normalize the shape
        return this.constructor.normalizeShape({
            x: original.x,
            y: original.y,
            shape: { width: Math.round(width), height: Math.round(height), points }
        });
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onDrawingTextKeydown", function (event) {
        // Ignore events when an input is focused, or when ALT or CTRL modifiers are applied
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (game.keyboard.hasFocus) return;

        // Track refresh or conclusion conditions
        let conclude = ["Escape", "Enter"].includes(event.key) && !event.shiftKey;
        let refresh = false;

        // Submitting the change, update or delete
        if (event.key === "Enter" && !event.shiftKey) {
            if (this._pendingText) {
                return this.document.update({
                    text: this._pendingText,
                    width: this.document.shape.width,
                    height: this.document.shape.height
                }).then(() => this.release());
            }
            else return this.document.delete();
        }

        // Cancelling the change
        else if (event.key === "Escape") {
            this._pendingText = this.document.text;
            refresh = true;
        }

        // Deleting a character
        else if (event.key === "Backspace") {
            this._pendingText = this._pendingText.slice(0, -1);
            refresh = true;
        }

        // Typing text (any single char)
        else if (/^.$/.test(event.key)) {
            this._pendingText += event.key;
            refresh = true;
        }

        // Stop propagation if the event was handled
        if (refresh || conclude) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Refresh the display
        if (refresh) {
            this.text.text = this._pendingText;
            this.document.shape.width = this.text.width + 100;
            this.document.shape.height = this.text.height + 50;
            this.refresh();
        }

        // Conclude the workflow
        if (conclude) {
            this.release();
        }
    }, "OVERRIDE");
});

Hooks.on("refreshDrawing", drawing => {
    if (!drawing.text) {
        if (drawing._warpedText) {
            if (!drawing._warpedText.destroyed) {
                drawing._warpedText.destroy();
            }

            drawing._warpedText = null;
        }

        return;
    }

    const document = drawing.document;
    const ts = document.getFlag(MODULE_ID, "textStyle");

    Object.assign(drawing.text.style, {
        align: ts?.align || "left",
        dropShadow: ts?.dropShadow ?? true,
        dropShadowAlpha: ts?.dropShadowAlpha ?? 1,
        dropShadowAngle: (ts?.dropShadowAngle ?? 0) / 180 * Math.PI,
        dropShadowBlur: ts?.dropShadowBlur ?? Math.max(Math.round(document.fontSize / 16), 2),
        dropShadowColor: ts?.dropShadowColor || "#000000",
        dropShadowDistance: ts?.dropShadowDistance ?? 0,
        fill: ts?.fill?.length ? [document.textColor || "#FFFFFF"].concat(ts.fill) : document.textColor || "#FFFFFF",
        fillGradientStops: ts?.fillGradientStops ?? [],
        fillGradientType: ts?.fillGradientType ?? PIXI.TEXT_GRADIENT.LINEAR_VERTICAL,
        fontStyle: ts?.fontStyle || "normal",
        fontVariant: ts?.fontVariant || "normal",
        fontWeight: ts?.fontWeight || "normal",
        leading: ts?.leading ?? 0,
        letterSpacing: ts?.letterSpacing ?? 0,
        lineJoin: "round",
        stroke: ts?.stroke || (Color.from(document.textColor || "#FFFFFF").hsv[2] > 0.6 ? 0x000000 : 0xFFFFFF),
        strokeThickness: ts?.strokeThickness ?? Math.max(Math.round(document.fontSize / 32), 2),
        wordWrapWidth: calculateValue(ts?.wordWrapWidth, document.shape.width) ?? document.shape.width
    });

    const arc = Math.clamped(ts?.arc ? ts.arc / 180 * Math.PI : 0, -2 * Math.PI, +2 * Math.PI);

    if (arc !== 0) {
        if (drawing._warpedText?.destroyed) {
            drawing._warpedText = null;
        }

        if (!drawing._warpedText) {
            drawing._warpedText = drawing.addChildAt(new WarpedText(drawing.text), drawing.getChildIndex(drawing.text) + 1);
        }

        drawing._warpedText.alpha = document.textAlpha ?? 1.0;
        drawing._warpedText.pivot.set(drawing.text.width / 2, drawing.text.height / 2);
        drawing._warpedText.position.set(document.shape.width / 2, document.shape.height / 2);
        drawing._warpedText.angle = document.rotation;
        drawing._warpedText.arc = arc;

        drawing.text.renderable = false;
    } else if (drawing._warpedText) {
        if (!drawing._warpedText.destroyed) {
            drawing._warpedText.destroy();
        }

        drawing._warpedText = null;
        drawing.text.renderable = true;
    }
});
