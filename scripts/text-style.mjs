import { MODULE_ID } from "./const.mjs";
import { WarpedText } from "./warped-text.mjs";
import { calculateValue } from "./utils.mjs";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._getTextStyle",
        function (wrapped, ...args) {
            const textStyle = wrapped(...args);
            const ts = this.document.getFlag(MODULE_ID, "textStyle");

            Object.assign(textStyle, {
                align: ts?.align || "left",
                dropShadow: ts?.dropShadow ?? true,
                dropShadowAlpha: ts?.dropShadowAlpha ?? 1,
                dropShadowAngle: (ts?.dropShadowAngle ?? 0) / 180 * Math.PI,
                dropShadowBlur: ts?.dropShadowBlur ?? Math.max(Math.round(this.document.fontSize / 16), 2),
                dropShadowColor: ts?.dropShadowColor || "#000000",
                dropShadowDistance: ts?.dropShadowDistance ?? 0,
                fill: ts?.fill?.length ? [this.document.textColor || "#ffffff"].concat(ts.fill.map((c) => c || "#ffffff")) : this.document.textColor || "#ffffff",
                fillGradientStops: ts?.fillGradientStops ?? [],
                fillGradientType: ts?.fillGradientType ?? PIXI.TEXT_GRADIENT.LINEAR_VERTICAL,
                fontStyle: ts?.fontStyle || "normal",
                fontVariant: ts?.fontVariant || "normal",
                fontWeight: ts?.fontWeight || "normal",
                leading: ts?.leading ?? 0,
                letterSpacing: ts?.letterSpacing ?? 0,
                lineJoin: "round",
                stroke: ts?.stroke || (Color.from(this.document.textColor || "#ffffff").hsv[2] > 0.6 ? 0x000000 : 0xFFFFFF),
                strokeThickness: ts?.strokeThickness ?? Math.max(Math.round(this.document.fontSize / 32), 2),
                wordWrapWidth: calculateValue(ts?.wordWrapWidth, this.document.shape.width) ?? this.document.shape.width,
            });

            return textStyle;
        },
        libWrapper.WRAPPER,
        { perf_mode: libWrapper.PERF_FAST },
    );
});

Hooks.on("refreshDrawing", (drawing, flags) => {
    const text = drawing.text;

    if (!text) {
        if (drawing._warpedText) {
            if (!drawing._warpedText.destroyed) {
                drawing._warpedText.destroy();
            }

            drawing._warpedText = null;
        }

        return;
    }

    if (!(flags.refreshPosition || flags.refreshText)) {
        return;
    }

    const ts = drawing.document.getFlag(MODULE_ID, "textStyle");

    if (flags.refreshText) {
        const arc = Math.clamped(ts?.arc ? ts.arc / 180 * Math.PI : 0, -2 * Math.PI, +2 * Math.PI);

        if (arc !== 0) {
            if (drawing._warpedText?.destroyed) {
                drawing._warpedText = null;
            }

            if (!drawing._warpedText) {
                drawing._warpedText = drawing.addChildAt(new WarpedText(drawing.text), drawing.text.parent.getChildIndex(drawing.text) + 1);
            }

            drawing._warpedText.alpha = drawing.document.textAlpha;
            drawing._warpedText.arc = arc;
            drawing.text.renderable = false;
        } else if (drawing._warpedText) {
            if (!drawing._warpedText.destroyed) {
                drawing._warpedText.destroy();
            }

            drawing._warpedText = null;
            drawing.text.renderable = true;
        }
    }

    if (ts?.align === "left" || ts?.align === "justify") {
        drawing.text.position.set(0, drawing.document.shape.height / 2);
        drawing.text.anchor.set(0, 0.5);
    } else if (ts?.align === "right") {
        drawing.text.anchor.set(1, 0.5);
        drawing.text.position.set(drawing.document.shape.width, drawing.document.shape.height / 2);
    } else {
        drawing.text.anchor.set(0.5, 0.5);
        drawing.text.position.set(drawing.document.shape.width / 2, drawing.document.shape.height / 2);
    }

    if (drawing._warpedText) {
        // drawing._warpedText.pivot.set(drawing.text.width / 2, drawing.text.height / 2);
        // drawing._warpedText.anchor = drawing.text.anchor;
        // drawing._warpedText.position = drawing.text.position;

        // if (ts?.align === "left" || ts?.align === "justify") {
        //     drawing._warpedText.position.set(0, drawing.document.shape.height / 2);
        //     drawing._warpedText.anchor.set(0, 0.5);
        // } else if (ts?.align === "right") {
        //     drawing._warpedText.anchor.set(1, 0.5);
        //     drawing._warpedText.position.set(drawing.document.shape.width, drawing.document.shape.height / 2);
        // } else {
            drawing._warpedText.pivot.set(drawing._warpedText.width / 2, drawing._warpedText.height / 2);
            drawing._warpedText.position.set(drawing.document.shape.width / 2, drawing.document.shape.height / 2);
        // }
    }
});
