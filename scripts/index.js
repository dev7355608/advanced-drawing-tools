import { MODULE_ID, MODULE_NAME } from "./const.js";
import { DashLineShader } from "./dash-line-shader.js";
import { calculateValue, cleanData } from "./utils.js";

import "./config.js";
import "./controls.js";
import "./hud.js";

Hooks.once("init", () => {
    libWrapper.register(MODULE_ID, "Drawing.prototype.activateListeners", function (wrapped, ...args) {
        wrapped(...args);

        this.frame.handle.off("mouseup").on("mouseup", this._onHandleMouseUp.bind(this));
    }, "WRAPPER");

    libWrapper.register(MODULE_ID, "Drawing.prototype.refresh", function () {
        if (this.destroyed || this.shape.destroyed) return;
        const isTextPreview = (this.data.type === CONST.DRAWING_TYPES.TEXT) && this._controlled;
        const isPolygonOrFreehand = this.data.type === CONST.DRAWING_TYPES.POLYGON || this.data.type === CONST.DRAWING_TYPES.FREEHAND;
        const closeStroke = this.data.fillType !== CONST.DRAWING_FILL_TYPES.NONE;
        this.shape.clear();

        const ls = this.document.getFlag(MODULE_ID, "lineStyle");

        // Outer Stroke
        if (this.data.strokeWidth || isTextPreview) {
            const sc = foundry.utils.colorStringToHex(this.data.strokeColor || "#FFFFFF");
            const sw = isTextPreview ? 8 : this.data.strokeWidth ?? 8;
            this.shape.lineStyle({
                width: sw,
                texture: PIXI.Texture.WHITE,
                color: sc,
                alpha: this.data.strokeAlpha ?? 1,
                matrix: null,
                alignment: isPolygonOrFreehand ? (closeStroke ? (ls?.alignment ?? 0.5) : 0.5) : 0,
                cap: ls?.cap || PIXI.LINE_CAP.BUTT,
                join: ls?.join || PIXI.LINE_JOIN.MITER,
                miterLimit: ls?.miterLimit ?? 10, // TODO: This has no effect: miterLimit is hardcoded to 10 in graphics-smooth
                shader: ls?.dash?.[0] && ls?.dash?.[1] ? new DashLineShader({ dash: ls.dash[0] ?? 8, gap: ls.dash[1] ?? 5 }) : null, // TODO: Use default DashLineShader once graphics-smooth >= 0.0.26
                scaleMode: ls?.scaleMode ?? PIXI.smooth.settings.LINE_SCALE_MODE // TODO
            });
        }

        // Fill Color or Texture
        if (this.data.fillType || isTextPreview) {
            const fs = this.document.getFlag(MODULE_ID, "fillStyle");
            const fc = foundry.utils.colorStringToHex(this.data.fillColor || "#FFFFFF");
            const fa = fc ? this.data.fillAlpha : 1;
            if ((this.data.fillType === CONST.DRAWING_FILL_TYPES.PATTERN) && this.texture) {
                let scaleW = calculateValue(fs?.texture?.width, this.data.width) / this.texture.width;
                let scaleH = calculateValue(fs?.texture?.height, this.data.height) / this.texture.height;
                [scaleW, scaleH] = [scaleW || scaleH || 1, scaleH || scaleW || 1];
                const width = scaleW * this.texture.width;
                const height = scaleH * this.texture.height;
                this.shape.beginTextureFill({
                    texture: this.texture,
                    color: fc || 0xFFFFFF,
                    alpha: fa,
                    matrix: new PIXI.Matrix().setTransform(
                        calculateValue(fs?.transform?.position?.x, width) ?? 0,
                        calculateValue(fs?.transform?.position?.y, height) ?? 0,
                        calculateValue(fs?.transform?.pivot?.x, width) ?? 0,
                        calculateValue(fs?.transform?.pivot?.y, height) ?? 0,
                        fs?.transform?.scale?.x ?? 1,
                        fs?.transform?.scale?.y ?? 1,
                        (fs?.transform?.rotation ?? 0) / 180 * Math.PI,
                        (fs?.transform?.skew?.x ?? 0) / 180 * Math.PI,
                        (fs?.transform?.skew?.y ?? 0) / 180 * Math.PI
                    ).append(new PIXI.Matrix(scaleW, 0, 0, scaleH))
                });
            } else {
                const fa = isTextPreview ? 0.25 : this.data.fillAlpha;
                this.shape.beginFill(fc, fa, fa >= 1 && this.data.type !== CONST.DRAWING_TYPES.ELLIPSE /* TODO: Remove once graphics-smooth >= 0.0.24 */);
            }
        }

        // Draw the shape
        switch (this.data.type) {
            case CONST.DRAWING_TYPES.RECTANGLE:
            case CONST.DRAWING_TYPES.TEXT:
                this._drawRectangle();
                break;
            case CONST.DRAWING_TYPES.ELLIPSE:
                this._drawEllipse();
                break;
            case CONST.DRAWING_TYPES.POLYGON:
                this._drawPolygon();
                break;
            case CONST.DRAWING_TYPES.FREEHAND:
                this._drawFreehand();
                break;
        }

        // Conclude fills
        this.shape.lineStyle(0x000000, 0.0).closePath();
        this.shape.endFill();

        // Set shape rotation, pivoting about the non-rotated center
        this.shape.pivot.set(this.data.width / 2, this.data.height / 2);
        this.shape.position.set(this.data.width / 2, this.data.height / 2);
        this.shape.rotation = Math.toRadians(this.data.rotation || 0);

        // Update text position and visibility
        if (this.text) {
            const ts = this.document.getFlag(MODULE_ID, "textStyle");
            const isText = this.data.type === CONST.DRAWING_TYPES.TEXT;
            const stroke = Math.max(Math.round(this.data.fontSize / 32), 2);
            const fill = ts?.fill?.length ? [this.data.textColor || "#FFFFFF"].concat(ts.fill) : this.data.textColor || "#FFFFFF";

            // Update the text style
            if (!(Array.isArray(this.text.style.fill) && Array.isArray(fill) && this.text.style.fill.equals(fill))) {
                this.text.style.fill = fill;
            }
            Object.assign(this.text.style, {
                align: ts?.align || (isText ? "left" : "center"),
                breakWords: ts?.breakWords ?? false,
                dropShadow: ts?.dropShadow ?? true,
                dropShadowAlpha: ts?.dropShadowAlpha ?? 1,
                dropShadowAngle: (ts?.dropShadowAngle ?? 0) / 180 * Math.PI,
                dropShadowBlur: ts?.dropShadowBlur ?? Math.max(Math.round(this.data.fontSize / 16), 2),
                dropShadowColor: ts?.dropShadowColor || "#000000",
                dropShadowDistance: ts?.dropShadowDistance ?? 0,
                fillGradientStops: ts?.fillGradientStops ?? [],
                fillGradientType: ts?.fillGradientType ?? PIXI.TEXT_GRADIENT.LINEAR_VERTICAL,
                fontFamily: this.data.fontFamily || CONFIG.defaultFontFamily,
                fontSize: this.data.fontSize,
                fontStyle: ts?.fontStyle || "normal",
                fontVariant: ts?.fontVariant || "normal",
                fontWeight: ts?.fontWeight || "normal",
                leading: ts?.leading ?? 0,
                letterSpacing: ts?.letterSpacing ?? 0,
                lineHeight: calculateValue(ts?.lineHeight, this.data.fontSize) ?? 0,
                lineJoin: ts?.lineJoin || "miter",
                miterLimit: ts?.miterLimit ?? 10,
                padding: ts?.padding ?? stroke,
                stroke: ts?.stroke || "#111111",
                strokeThickness: ts?.strokeThickness ?? stroke,
                textBaseline: ts?.textBaseline || "alphabetic",
                trim: ts?.trim ?? false,
                whiteSpace: ts?.whiteSpace || "pre",
                wordWrap: ts?.wordWrap ?? !isText,
                wordWrapWidth: calculateValue(ts?.wordWrapWidth, this.data.width) ?? (1.5 * this.data.width)
            });
            this.text.alpha = this.data.textAlpha ?? 1.0;
            this.text.pivot.set(this.text.width / 2, this.text.height / 2);
            this.text.position.set(
                (this.text.width / 2) + ((this.data.width - this.text.width) / 2),
                (this.text.height / 2) + ((this.data.height - this.text.height) / 2)
            );
            this.text.rotation = this.shape.rotation;

            const measured = PIXI.TextMetrics.measureText(this.text.text || " ", this.text.style, this.text.style.wordWrap, this.text.canvas);
            const size = Math.ceil(Math.max(measured.width, measured.height, 1) + this.text.style.padding * 2);

            this.text.resolution = Math.min((canvas.performance.textures.maxSize - 0.5) / size, CONFIG.Canvas.maxZoom, 4);

            const arc = Math.clamped(ts?.arc ? ts.arc / 180 * Math.PI : 0, -2 * Math.PI, +2 * Math.PI);

            if (arc === 0) {
                this._warpedText?.destroy();
                this._warpedText = null;
                this.text.renderable = true;
            } else {
                if (!this._warpedText || this._warpedText.destroyed) {
                    this._warpedText = this.addChild(new WarpedText(this.text));
                    this._warpedText.transform = new SynchronizedTransform(this.text.transform);
                }

                this._warpedText.arc = arc;

                if (this._warpedText.arc !== 0) {
                    this._warpedText.visible = true;
                } else {
                    this._warpedText.visible = false;
                    this._warpedText.geometry.dispose();
                }

                this.text.renderable = !this._warpedText.visible;
            }
        } else {
            this._warpedText?.destroy();
            this._warpedText = null;
        }

        if (this._editMode && this.layer._active && (this.data.type === CONST.DRAWING_TYPES.POLYGON || this.data.type === CONST.DRAWING_TYPES.FREEHAND)) {
            if (!this._editHandles || this._editHandles.destroyed) {
                this._editHandles = this.shape.addChild(new PIXI.Container());
                this._editHandles.edges = this._editHandles.addChild(new PIXI.Container());
                this._editHandles.points = this._editHandles.addChild(new PIXI.Container());
            }

            for (let i = this._editHandles.edges.children.length; i <= this.data.points.length; i++) {
                const handle = this._editHandles.edges.addChild(new EdgeHandle(this.data, i));

                handle.off("mouseover").off("mouseout").off("mousedown").off("mouseup")
                    .on("mouseover", this._onHandleHoverIn.bind(this))
                    .on("mouseout", this._onHandleHoverOut.bind(this))
                    .on("mousedown", this._onHandleMouseDown.bind(this))
                    .on("mouseup", this._onHandleMouseUp.bind(this));
                handle.interactive = true;
            }

            for (let i = this._editHandles.points.children.length; i <= this.data.points.length; i++) {
                const handle = this._editHandles.points.addChild(new PointHandle(this.data, i));

                handle.off("mouseover").off("mouseout").off("mousedown").off("mouseup")
                    .on("mouseover", this._onHandleHoverIn.bind(this))
                    .on("mouseout", this._onHandleHoverOut.bind(this))
                    .on("mousedown", this._onHandleMouseDown.bind(this))
                    .on("mouseup", this._onHandleMouseUp.bind(this));
                handle.interactive = true;
            }

            if (this._editHandles.edges.children.length > this.data.points.length) {
                this._editHandles.edges.removeChildren(this.data.points.length).forEach(c => c.destroy({ children: true }));
            }

            if (this._editHandles.points.children.length > this.data.points.length) {
                this._editHandles.points.removeChildren(this.data.points.length).forEach(c => c.destroy({ children: true }));
            }

            for (const handle of this._editHandles.edges.children) {
                handle.refresh();
            }

            for (const handle of this._editHandles.points.children) {
                handle.refresh();
            }
        } else {
            this._editMode = false;

            if (this._editHandles) {
                this._editHandles.destroy({ children: true });
                this._editHandles = null;
            }
        }

        // Determine shape bounds and update the frame
        const bounds = this.drawing.getLocalBounds();
        if (this.id && this._controlled) this._refreshFrame(bounds);
        else this.frame.visible = false;

        // Toggle visibility
        this.position.set(this.data.x, this.data.y);
        this.drawing.hitArea = bounds;
        this.alpha = this.data.hidden ? 0.5 : 1.0;
        this.visible = !this.data.hidden || game.user.isGM;
        return this;
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._drawRectangle", function () {
        this.shape.drawRect(0, 0, this.data.width, this.data.height);
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._drawEllipse", function () {
        let hw = this.data.width / 2,
            hh = this.data.height / 2;
        this.shape.drawEllipse(hw, hh, Math.abs(hw), Math.abs(hh));
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._drawPolygon", function () {
        let points = this.data.points || [];
        if (points.length < 2) return;
        else if (points.length === 2) this.shape.endFill();

        // Get drawing points
        const isClosed = points[0].equals(points[points.length - 1]);

        // If the polygon is closed, or if we are filling it, we can shortcut using the drawPolygon helper
        if (points.length > 2 && (isClosed || this.data.fillType)) {
            if (isClosed) {
                points = points.slice(0, points.length - 1);
            }

            let sum = 0;

            for (let i = 0, j = points.length - 1; i < points.length; j = i, i++) { // TODO: remove once fixed in graphics-smooth
                sum += (points[i][0] - points[j][0]) * (points[i][1] + points[j][1]);
            }

            if (sum > 0) {
                points = points.slice().reverse()
            }

            this.shape.drawPolygon(points.deepFlatten());
        }
        // Otherwise, draw each line individually
        else {
            this.shape.moveTo(...points[0]);
            for (let p of points.slice(1)) {
                this.shape.lineTo(...p);
            }
        }
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleHoverIn", function (event) {
        if (this._dragHandle) {
            return;
        }

        const handle = event.data.handle = event.target;

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            handle._hover = true;
            handle.refresh();
        } else if (handle) {
            handle.scale.set(1.5, 1.5);
        }
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleHoverOut", function (event) {
        const handle = event.data.handle;

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            handle._hover = false;
            handle.refresh();
        } else if (handle) {
            handle.scale.set(1.0, 1.0);
        }
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleMouseDown", function (event) {
        if (!this.data.locked) {
            this._dragHandle = true;
        }
    }, "OVERRIDE");

    if (Drawing.prototype._onHandleMouseUp) {
        libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleMouseUp", function (event) {
            if (!this._original) {
                this._dragHandle = false;
            }
        }, "OVERRIDE");
    } else {
        Drawing.prototype._onHandleMouseUp = function (event) {
            if (!this._original) {
                this._dragHandle = false;
            }
        };
    }

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleDragStart", function (event) {
        this._original = this.document.toJSON();

        const { handle, destination } = event.data;
        let update;

        if (handle instanceof EdgeHandle) {
            const point = new PIXI.Point(destination.x, destination.y);
            const matrix = new PIXI.Matrix();
            const { x, y, width, height, rotation, points } = this.data;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, width, height, points: foundry.utils.deepClone(points) };
            update.points.splice(handle.index, 0, [point.x, point.y]);
        } else if (handle instanceof ResizeHandle) {
            const aw = Math.abs(this.data.width);
            const ah = Math.abs(this.data.height);
            const x0 = this.data.x + (handle.offset[0] * aw);
            const y0 = this.data.y + (handle.offset[1] * ah);

            event.data.origin = { x: x0, y: y0, width: aw, height: ah };
        }

        if (update) {
            this.document.data.update(update);
            this.refresh();
        }
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleDragMove", function (event) {
        let { handle, destination, origin, originalEvent } = event.data;
        let update;

        // Pan the canvas if the drag event approaches the edge
        canvas._onDragCanvasPan(originalEvent);

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            const matrix = new PIXI.Matrix();
            const point = new PIXI.Point(destination.x, destination.y);
            const { x, y, width, height, rotation, points } = this._original;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, width, height, points: foundry.utils.deepClone(points) };

            if (handle instanceof EdgeHandle) {
                update.points.splice(handle.index, 0, [point.x, point.y]);
            } else {
                update.points[handle.index] = [point.x, point.y];
            }
        } else {
            // Update Drawing dimensions
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;
            update = this._rescaleDimensions(this._original, dx, dy);
        }

        this.document.data.update(update);
        this.refresh();

    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleDragDrop", function (event) {
        let { handle, destination, origin, originalEvent } = event.data;
        let update;

        if (!originalEvent.shiftKey) {
            destination = canvas.grid.getSnappedPosition(destination.x, destination.y, this.layer.gridPrecision);
        }

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            const matrix = new PIXI.Matrix();
            const point = new PIXI.Point(destination.x, destination.y);
            const { x, y, width, height, rotation, points } = this._original;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, width, height, points: foundry.utils.deepClone(points) };

            if (handle instanceof EdgeHandle) {
                update.points.splice(handle.index, 0, [point.x, point.y]);
            } else {
                update.points[handle.index] = [point.x, point.y];
            }

            update = this.constructor.normalizeShape(update);
        } else {
            // Update Drawing dimensions
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;
            update = this._rescaleDimensions(this._original, dx, dy);
        }

        return this.document.update(update, { diff: false });
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onClickRight", function (wrapped, event) {
        const handle = event.data.handle;

        if ((handle instanceof PointHandle || handle instanceof EdgeHandle) && handle._hover) {
            const { x, y, width, height, rotation, points } = this.data;
            let update = { x, y, width, height, points: foundry.utils.deepClone(points) };

            if (handle instanceof EdgeHandle) {
                const origin = event.data.origin;
                const matrix = new PIXI.Matrix();
                const point = new PIXI.Point(origin.x, origin.y);

                matrix.translate(-width / 2, -height / 2);
                matrix.rotate(Math.toRadians(rotation || 0));
                matrix.translate(x + width / 2, y + height / 2);
                matrix.applyInverse(point, point);

                update.points[(handle.index + points.length - 1) % points.length] = [point.x, point.y];
            }

            update.points.splice(handle.index, 1);
            update = this.constructor.normalizeShape(update);

            return this.document.update(update, { diff: false });
        }

        return wrapped(event);
    }, "MIXED");

    libWrapper.register(MODULE_ID, "Drawing.prototype._rescaleDimensions", function (original, dx, dy) {
        let { points, width, height } = original;
        width += dx;
        height += dy;
        points = points || [];

        // Rescale polygon points
        if (this.isPolygon) {
            const scaleX = 1 + (dx / original.width);
            const scaleY = 1 + (dy / original.height);
            points = points.map(p => [p[0] * scaleX, p[1] * scaleY]);
        }

        // Constrain drawing bounds by the contained text size
        if (this.data.text) {
            const textBounds = this.text.getLocalBounds();
            height = Math.max(textBounds.height + 8, height);
        }

        // Normalize the shape
        return this.constructor.normalizeShape({
            x: original.x,
            y: original.y,
            width: width,
            height: height,
            points: points
        });
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onUpdate", function (data) {
        // Fully re-draw when texture is changed
        if ("texture" in data || "text" in data) {
            this.draw().then(() => PlaceableObject.prototype._onUpdate.call(this, data));
        }
        // Otherwise simply refresh the existing drawing
        else PlaceableObject.prototype._onUpdate.call(this, data);
    }, "OVERRIDE");

    libWrapper.register(MODULE_ID, "Drawing.prototype._onDrawingTextKeydown", function (event) {
        // Ignore events when an input is focused, or when ALT or CTRL modifiers are applied
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (game.keyboard.hasFocus) return;

        // Track refresh or conclusion conditions
        let conclude = event.key === "Escape" || event.key === "Enter" && !event.shiftKey;
        let refresh = false;

        // Submitting the change, update or delete
        if (event.key === "Enter" && !event.shiftKey) {
            if (this._pendingText) {
                const updateData = { text: this._pendingText, width: this.data.width, height: this.data.height };
                return this.document.update(updateData, { diff: false }).then(() => this.release())
            }
            else return this.document.delete();
        }

        // Cancelling the change
        else if (event.key === "Escape") {
            this._pendingText = this.data.text;
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

        // Typing text (any single char)
        else if (event.key === "Enter") {
            this._pendingText += "\n";
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
            this.data.width = this.text.width + 100;
            this.data.height = this.text.height + 50;
            this.refresh();
        }

        // Conclude the workflow
        if (conclude) {
            this.release();
        }
    }, "OVERRIDE");

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

    libWrapper.register(MODULE_ID, "DrawingsLayer.prototype._getNewDrawingData", function (wrapped, ...args) {
        const data = wrapped(...args);

        if (foundry.utils.hasProperty(data, `flags.${MODULE_ID}`)) {
            if (data.type === CONST.DRAWING_TYPES.TEXT) {
                foundry.utils.setProperty(data, `flags.${MODULE_ID}.textStyle.align`, "left");
                foundry.utils.setProperty(data, `flags.${MODULE_ID}.textStyle.wordWrap`, false);
            }
        }

        return foundry.utils.mergeObject({}, cleanData(data, data.type || CONST.DRAWING_TYPES.POLYGON));
    }, "WRAPPER");
});

Drawing.prototype._editMode = false;

Drawing.prototype._toggleEditMode = function (active) {
    this.layer.placeables.forEach(drawing => {
        if (drawing !== this && drawing._editMode) {
            drawing._editMode = false;
            drawing.refresh();
        }
    });

    if (active === undefined) {
        active = !this._editMode;
    } else {
        active = !!active;
    }

    if (this._editMode !== active) {
        this._editMode = active;
        this.refresh();
    }
};

Drawing.prototype._convertToPolygon = async function ({ freehand = false, confirm = false }) {
    if (this.data.type === CONST.DRAWING_TYPES.POLYGON && !freehand) {
        return;
    }

    if (this.data.type === CONST.DRAWING_TYPES.FREEHAND && freehand) {
        return;
    }

    return await new Promise(resolve => {
        if (confirm) {
            let content;

            if (this.data.type === CONST.DRAWING_TYPES.POLYGON || this.data.type === CONST.DRAWING_TYPES.FREEHAND) {
                content = `<p>Convert this Drawing to a ${freehand ? "Freehand" : "Polygon"}?</p>`;
            } else {
                content = `<p>Permanently convert this Drawing to a ${freehand ? "Freehand" : "Polygon"}?</p>`;
            }

            new Dialog({
                title: `${MODULE_NAME}: Convert Drawing to ${freehand ? "Freehand" : "Polygon"}`,
                content,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: () => resolve(true)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "No",
                        callback: () => resolve(false)
                    },
                },
            }).render(true);
        } else {
            resolve(true);
        }
    }).then(async result => {
        if (!result) {
            return;
        }

        const { x, y, width, height } = this.data;
        let update = {
            x, y, width, height,
            type: freehand ? CONST.DRAWING_TYPES.FREEHAND : CONST.DRAWING_TYPES.POLYGON
        };

        switch (this.data.type) {
            case CONST.DRAWING_TYPES.TEXT:
                foundry.utils.setProperty(update, `flags.${MODULE_ID}.textStyle.align`, this.document.getFlag(MODULE_ID, "textStyle.align") || "left");
                foundry.utils.setProperty(update, `flags.${MODULE_ID}.textStyle.wordWrap`, this.document.getFlag(MODULE_ID, "textStyle.wordWrap") ?? false);
            case CONST.DRAWING_TYPES.RECTANGLE:
                update.points = [[0, 0], [width, 0], [width, height], [0, height]];

                break;
            case CONST.DRAWING_TYPES.ELLIPSE:
                {
                    const rx = width / 2;
                    const ry = height / 2;
                    const cx = rx;
                    const cy = ry;
                    const n = Math.ceil(Math.sqrt((rx + ry) / 2));
                    const points = new Array(n * 4);

                    let j1 = 0;
                    let j2 = n * 2 + 1;
                    let j3 = j2;
                    let j4 = n * 4;

                    {
                        const x1 = cx + rx;
                        const x2 = cx - rx;

                        points[j1++] = [x1, cy];
                        points[--j2] = [x2, cy];
                    }

                    for (let i = 1; i < n; i++) {
                        const a = Math.PI / 2 * (i / n);
                        const x0 = 0 + Math.cos(a) * rx;
                        const y0 = 0 + Math.sin(a) * ry;
                        const x1 = cx + x0;
                        const x2 = cx - x0;
                        const y1 = cy + y0;
                        const y2 = cy - y0;

                        points[j1++] = [x1, y1];
                        points[--j2] = [x2, y1];
                        points[j3++] = [x2, y2];
                        points[--j4] = [x1, y2];
                    }

                    {
                        const y1 = cy + ry;
                        const y2 = cy - ry;

                        points[j1++] = [cx, y1];
                        points[--j4] = [cx, y2];
                    }

                    update.points = points;
                }

                break;
        }

        if (update.points) {
            foundry.utils.setProperty(update, `flags.${MODULE_ID}.lineStyle.alignment`, 0);

            if (this.data.fillType === CONST.DRAWING_FILL_TYPES.NONE) {
                update.fillType = CONST.DRAWING_FILL_TYPES.SOLID;
                update.fillAlpha = 0;
            }
        }

        update = cleanData(foundry.utils.mergeObject(this.data, this.constructor.normalizeShape(update), { inplace: false }), update.type);

        return await this.document.update(update);
    });
};

class PointHandle extends PIXI.Graphics {
    _hover = false;

    constructor(data, index) {
        super();

        this.data = data;
        this.index = index;
    }

    refresh() {
        if (this.destroyed) {
            return;
        }

        const points = this.data.points;
        const A = points[this.index];

        if (!A) {
            this.visible = false;

            return;
        }

        let lw = 2;

        if (canvas.dimensions.size > 150) {
            lw = 4;
        } else if (canvas.dimensions.size > 100) {
            lw = 3;
        }

        this.clear()
            .lineStyle(lw, 0x000000, 1.0)
            .beginFill(0xFFFFFF, 1.0)
            .drawCircle(0, 0, lw * (this._hover ? 4 : 3))
            .endFill();
        this.position.set(A[0], A[1]);
        this.visible = true;
    }
}

class EdgeHandle extends PIXI.Graphics {
    _hover = false;

    constructor(data, index) {
        super();

        this.data = data;
        this.index = index;

        if (index === 0) {
            this._lineShader = new DashLineShader();
        } else {
            this._lineShader = null;
        }
    }

    refresh() {
        if (this.destroyed) {
            return;
        }

        const points = this.data.points;
        const A = points[(this.index + points.length - 1) % points.length];
        const B = points[this.index];

        if (!A || !B || this.index === 0 && this.data.fillType === CONST.DRAWING_FILL_TYPES.NONE) {
            this.visible = false;

            return;
        }

        let lw = 2;

        if (canvas.dimensions.size > 150) {
            lw = 4;
        } else if (canvas.dimensions.size > 100) {
            lw = 3;
        }

        if (this._lineShader) {
            this._lineShader.uniforms.dash = lw * 1.618;
            this._lineShader.uniforms.gap = lw;
        }

        const cx = (A[0] + B[0]) / 2;
        const cy = (A[1] + B[1]) / 2;
        const w = Math.hypot(A[0] - B[0], A[1] - B[1]);
        const h = lw * (this._hover ? 4 / 3 : 1) * 2;

        this.clear()
            .beginFill(0xFFFFFF, 1.0, true)
            .drawRect(-w / 2, -h / 2, w, h)
            .endFill()
            .lineStyle({ width: lw, color: 0x000000, alpha: 1.0, shader: this._lineShader })
            .moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2)
            .moveTo(-w / 2, +h / 2).lineTo(w / 2, +h / 2);
        this.position.set(cx, cy);
        this.rotation = Math.atan2(B[1] - A[1], B[0] - A[0]);
        this.visible = true;
        this.hitArea = new PIXI.Rectangle(-w / 2 - lw / 2, -h / 2 - lw / 2, w + lw, h + lw);
    }
}

class WarpedTextGeometry extends PIXI.PlaneGeometry {
    arc = 0;

    build() {
        super.build();

        const arc = this.arc;

        if (arc === 0) {
            return;
        }

        const { width, height } = this;
        const vertices = this.buffers[0].data;
        const radius = width / arc;
        const dy = radius * Math.max(Math.cos(arc / 2), 0);
        const h = arc > 0 ? height : 0;

        for (let i = 0, n = vertices.length; i < n; i += 2) {
            const a = (vertices[i] / width * 2 - 1) * (arc / 2) - Math.PI / 2;
            const r = (h - vertices[i + 1]) + radius;

            vertices[i] = Math.cos(a) * r + width / 2;
            vertices[i + 1] = Math.sin(a) * r + height / 2 + dy;
        }

        this.buffers[0].update();
    }
}

class WarpedText extends PIXI.Mesh {
    constructor(text) {
        const geometry = new WarpedTextGeometry(0, 0, 0, 0);
        const mesh = new PIXI.MeshMaterial(PIXI.Texture.WHITE);

        super(geometry, mesh);

        this.text = text;
        this.texture = text.texture;
        this._textureID = -1;
        this.textureUpdated();
    }

    set texture(value) {
        if (this.shader.texture === value) {
            return;
        }

        this.shader.texture = value;
        this._textureID = -1;

        if (value.baseTexture.valid) {
            this.textureUpdated();
        }
        else {
            value.once("update", this.textureUpdated, this);
        }
    }

    get texture() {
        return this.shader.texture;
    }

    get arc() {
        return this.geometry.arc;
    }

    set arc(value) {
        if (this.geometry.arc !== value) {
            this.geometry.arc = value;
            this._buildGeometry(this.geometry.width, this.geometry.height, this.geometry.arc);
        }
    }

    textureUpdated() {
        this._textureID = this.shader.texture._updateID;

        const geometry = this.geometry;
        const { width, height } = this.shader.texture;

        if (geometry.width !== width || geometry.height !== height) {
            this._buildGeometry(width, height, this.geometry.arc);
        }
    }

    _buildGeometry(width, height, arc) {
        const geometry = this.geometry;
        const radius = width / Math.abs(arc) + height;
        const step = Math.PI / (4 * Math.sqrt(radius)) * radius;

        geometry.width = width;
        geometry.height = height;
        geometry.segWidth = arc !== 0 ? Math.min(Math.ceil((width + height * Math.abs(arc)) / step + 1e-6), 256) : 2;
        geometry.segHeight = arc !== 0 ? Math.min(Math.ceil(height / step + 1e-6), 256) : 2;
        geometry.arc = arc;
        geometry.build();
    }

    _render(renderer) {
        this.text.updateText(true);

        if (this._textureID !== this.shader.texture._updateID) {
            this.textureUpdated();
        }

        if (this.geometry.width > 0 && this.geometry.height > 0) {
            super._render(renderer);
        }
    }

    destroy(options) {
        this.shader.texture.off("update", this.textureUpdated, this);

        super.destroy(options);
    }
}
