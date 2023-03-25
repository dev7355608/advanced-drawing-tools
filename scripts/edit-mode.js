import { MODULE_ID } from "./const.js";

Hooks.on("refreshDrawing", drawing => {
    drawing._refreshEditMode();
});

Hooks.once("libWrapper.Ready", () => {
    const getInteractionData = isNewerVersion(game.version, 11)
        ? (event) => event.interactionData
        : (event) => event.data;
    const refreshShape = isNewerVersion(game.version, 11)
        ? (drawing) => drawing.renderFlags.set({ refreshShape: true })
        : (drawing) => drawing.refresh();

    libWrapper.register(MODULE_ID, "Drawing.prototype.activateListeners", function (wrapped, ...args) {
        wrapped(...args);

        const pointerup = isNewerVersion(game.version, 11) ? "pointerup" : "mouseup";

        this.frame.handle.off(pointerup).on(pointerup, this._onHandleMouseUp.bind(this));
    }, libWrapper.WRAPPER);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleHoverIn", function (event) {
        if (this._dragHandle) {
            return;
        }

        const handle = getInteractionData(event).handle = event.target;

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            handle._hover = true;
            handle.refresh();
        } else if (handle) {
            handle.scale.set(1.5, 1.5);
        }
    }, libWrapper.OVERRIDE);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleHoverOut", function (event) {
        const handle = getInteractionData(event).handle;

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            handle._hover = false;
            handle.refresh();
        } else if (handle) {
            handle.scale.set(1.0, 1.0);
        }
    }, libWrapper.OVERRIDE);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleMouseDown", function (event) {
        if (!this.document.locked) {
            this._dragHandle = true;
        }
    }, libWrapper.OVERRIDE);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onDragLeftStart", function (wrapped, event) {
        if (!this._dragHandle) {
            return wrapped(event);
        }

        this._original = this.document.toObject();

        const { handle, destination } = getInteractionData(event);
        let update;

        if (handle instanceof EdgeHandle) {
            const point = new PIXI.Point(destination.x, destination.y);
            const matrix = new PIXI.Matrix();
            const { x, y, rotation, shape: { width, height, points } } = this.document;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, shape: { width, height, points: Array.from(points) } };
            update.shape.points.splice(handle.index * 2, 0, point.x, point.y);
        } else if (handle instanceof ResizeHandle) {
            return wrapped(event);
        }

        if (update) {
            this.document.updateSource(update);
            refreshShape(this);
        }
    }, libWrapper.MIXED);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleDragMove", function (event) {
        const { handle, destination, origin } = getInteractionData(event);
        const originalEvent = event.data.originalEvent;
        let update;

        // Pan the canvas if the drag event approaches the edge
        canvas._onDragCanvasPan(originalEvent);

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            const matrix = new PIXI.Matrix();
            const point = new PIXI.Point(destination.x, destination.y);
            const { x, y, rotation, shape: { width, height, points } } = this._original;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, shape: { width, height, points: Array.from(points) } };

            if (handle instanceof EdgeHandle) {
                update.shape.points.splice(handle.index * 2, 0, point.x, point.y);
            } else {
                update.shape.points[handle.index * 2] = point.x;
                update.shape.points[handle.index * 2 + 1] = point.y;
            }
        } else {
            // Update Drawing dimensions
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;

            update = this._rescaleDimensions(this._original, dx, dy);
        }

        try {
            this.document.updateSource(update);
            refreshShape(this);
        } catch (err) { }
    }, libWrapper.OVERRIDE);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onHandleDragDrop", function (event) {
        let { handle, destination, origin } = getInteractionData(event);
        const originalEvent = event.data.originalEvent;
        let update;

        if (!originalEvent.shiftKey) {
            destination = canvas.grid.getSnappedPosition(destination.x, destination.y, this.layer.gridPrecision);
        }

        if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
            const matrix = new PIXI.Matrix();
            const point = new PIXI.Point(destination.x, destination.y);
            const { x, y, rotation, shape: { width, height, points } } = this._original;

            matrix.translate(-width / 2, -height / 2);
            matrix.rotate(Math.toRadians(rotation || 0));
            matrix.translate(x + width / 2, y + height / 2);
            matrix.applyInverse(point, point);

            update = { x, y, shape: { width, height, points: Array.from(points) } };

            if (handle instanceof EdgeHandle) {
                update.shape.points.splice(handle.index * 2, 0, point.x, point.y);
            } else {
                update.shape.points[handle.index * 2] = point.x;
                update.shape.points[handle.index * 2 + 1] = point.y;
            }

            update = this._rescaleDimensions(update, 0, 0);
        } else {
            // Update Drawing dimensions
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;

            update = this._rescaleDimensions(this._original, dx, dy);
        }

        return this.document.update(update, { diff: false });
    }, libWrapper.OVERRIDE);

    libWrapper.register(MODULE_ID, "Drawing.prototype._onClickRight", function (wrapped, event) {
        const handle = getInteractionData(event).handle;

        if ((handle instanceof PointHandle || handle instanceof EdgeHandle) && handle._hover) {
            const { x, y, rotation, shape: { width, height, points } } = this.document;
            let update = { x, y, shape: { width, height, points: Array.from(points) } };

            if (handle instanceof EdgeHandle) {
                const origin = getInteractionData(event).origin;
                const matrix = new PIXI.Matrix();
                const point = new PIXI.Point(origin.x, origin.y);

                matrix.translate(-width / 2, -height / 2);
                matrix.rotate(Math.toRadians(rotation || 0));
                matrix.translate(x + width / 2, y + height / 2);
                matrix.applyInverse(point, point);

                update.shape.points[(handle.index * 2 + points.length - 2) % points.length] = point.x;
                update.shape.points[(handle.index * 2 + points.length - 1) % points.length] = point.y;
            }

            update.shape.points.splice(handle.index * 2, 2);
            update = this._rescaleDimensions(update, 0, 0);

            return this.document.update(update, { diff: false });
        }

        return wrapped(event);
    }, libWrapper.MIXED);
});

Drawing.prototype._onHandleMouseUp = function (event) {
    if (!this._original) {
        this._dragHandle = false;
    }
};

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

Drawing.prototype._editHandles = null;

Drawing.prototype._refreshEditMode = function () {
    const document = this.document;

    if (this._editMode && this.layer.active && !document.locked && document.shape.type === CONST.DRAWING_TYPES.POLYGON) {
        let editHandles = this._editHandles;

        if (!editHandles || editHandles.destroyed) {
            editHandles = this._editHandles = this.addChild(new PIXI.Container());
            editHandles.edges = editHandles.addChild(new PIXI.Container());
            editHandles.points = editHandles.addChild(new PIXI.Container());
        }

        const activateListeners = isNewerVersion(game.version, 11)
            ? (handle) => {
                handle.off("pointerover").off("pointerout").off("pointerdown").off("pointerup")
                    .on("pointerover", this._onHandleHoverIn.bind(this))
                    .on("pointerout", this._onHandleHoverOut.bind(this))
                    .on("pointerdown", this._onHandleMouseDown.bind(this))
                    .on("pointerup", this._onHandleMouseUp.bind(this));
                handle.eventMode = "static";
            }
            : (handle) => {
                handle.off("mouseover").off("mouseout").off("mousedown").off("mouseup")
                    .on("mouseover", this._onHandleHoverIn.bind(this))
                    .on("mouseout", this._onHandleHoverOut.bind(this))
                    .on("mousedown", this._onHandleMouseDown.bind(this))
                    .on("mouseup", this._onHandleMouseUp.bind(this));
                handle.interactive = true;
            };

        const points = document.shape.points;

        for (let i = editHandles.edges.children.length; i <= points.length; i++) {
            activateListeners(editHandles.edges.addChild(new EdgeHandle(this, i)));
        }

        for (let i = editHandles.points.children.length; i <= points.length; i++) {
            activateListeners(editHandles.points.addChild(new PointHandle(this, i)));
        }

        if (editHandles.edges.children.length > points.length) {
            editHandles.edges.removeChildren(points.length).forEach(c => c.destroy({ children: true }));
        }

        if (editHandles.points.children.length > points.length) {
            editHandles.points.removeChildren(points.length).forEach(c => c.destroy({ children: true }));
        }

        editHandles.edges.children.forEach(h => h.refresh());
        editHandles.points.children.forEach(h => h.refresh());
    } else {
        this._editMode = false;

        if (this._editHandles) {
            this._editHandles.destroy({ children: true });
            this._editHandles = null;
        }
    }
}

class PointHandle extends PIXI.Graphics {
    _hover = false;

    constructor(object, index) {
        super();

        this.object = object;
        this.index = index;
    }

    refresh() {
        if (this.destroyed) {
            return;
        }

        const document = this.object.document;
        const points = document.shape.points;
        const i = this.index * 2;

        if (i >= points.length) {
            this.visible = false;

            return;
        }

        const x = points[i];
        const y = points[i + 1];

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
        this.position.set(x, y);
        this.visible = true;
    }
}

class EdgeHandle extends PIXI.Graphics {
    _hover = false;

    constructor(object, index) {
        super();

        this.object = object;
        this.index = index;

        if (index === 0) {
            this._lineShader = new PIXI.smooth.DashLineShader();
        } else {
            this._lineShader = null;
        }
    }

    refresh() {
        if (this.destroyed) {
            return;
        }

        const document = this.object.document;
        const points = document.shape.points;
        const i = this.index * 2;

        if (i >= points.length || i === 0 && document.fillType === CONST.DRAWING_FILL_TYPES.NONE) {
            this.visible = false;

            return;
        }

        const j = (i + points.length - 2) % points.length;
        const ax = points[j];
        const ay = points[j + 1];
        const bx = points[i];
        const by = points[i + 1];

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

        const cx = (ax + bx) / 2;
        const cy = (ay + by) / 2;
        const w = Math.hypot(ax - bx, ay - by);
        const h = lw * (this._hover ? 4 / 3 : 1) * 2;

        this.clear()
            .beginFill(0xFFFFFF, 1.0, true)
            .drawRect(-w / 2, -h / 2, w, h)
            .endFill()
            .lineStyle({ width: lw, color: 0x000000, alpha: 1.0, shader: this._lineShader })
            .moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2)
            .moveTo(-w / 2, +h / 2).lineTo(w / 2, +h / 2);
        this.position.set(cx, cy);
        this.rotation = Math.atan2(by - ay, bx - ax);
        this.visible = true;
        this.hitArea = new PIXI.Rectangle(-w / 2 - lw / 2, -h / 2 - lw / 2, w + lw, h + lw);
    }

    destroy(options) {
        if (this._lineShader) {
            this._lineShader.destroy();
            this._lineShader = null;
        }

        super.destroy(options);
    }
}
