import { MODULE_ID } from "./const.mjs";

Hooks.on("refreshDrawing", (drawing) => {
    drawing._refreshEditMode();
});

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onHandleHoverIn",
        function (event) {
            if (this._dragHandle) {
                return;
            }

            const handle = event.target;
            const interactionData = event.interactionData;

            if (interactionData) {
                interactionData.handle = handle;
            }

            if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
                handle._hover = true;
                handle.refresh();
            } else if (handle) {
                handle.scale.set(1.5, 1.5);
            }
        },
        libWrapper.OVERRIDE,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onHandleHoverOut",
        function (event) {
            const handle = event.interactionData.handle;

            if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
                handle._hover = false;
                handle.refresh();
            } else if (handle) {
                handle.scale.set(1.0, 1.0);
            }
        },
        libWrapper.OVERRIDE,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onDragLeftStart",
        function (wrapped, event) {
            if (!event.interactionData.dragHandle) {
                return wrapped(event);
            }

            event.interactionData.originalData = this.document.toObject();

            let { handle, destination } = event.interactionData;

            if (this._editHandle) {
                handle = this._editHandle;

                if (this.hasActiveHUD) {
                    this.layer.hud.close();
                }
            }

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
            } else if (handle instanceof foundry.canvas.containers.ResizeHandle) {
                return wrapped(event);
            }

            if (update) {
                this.document.updateSource(update);
                this.renderFlags.set({ refreshSize: true });
            }
        },
        libWrapper.MIXED,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onHandleDragMove",
        function (event) {
            let { handle, destination, origin } = event.interactionData;

            if (this._editHandle) {
                handle = this._editHandle;
            }

            const originalEvent = event.data.originalEvent;
            let update;

            if (!originalEvent.shiftKey) {
                destination = this.layer.getSnappedPoint(destination);
            }

            canvas._onDragCanvasPan(originalEvent);

            if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
                const matrix = new PIXI.Matrix();
                const point = new PIXI.Point(destination.x, destination.y);
                const { x, y, rotation, shape: { width, height, points } } = event.interactionData.originalData;

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
                const dx = destination.x - origin.x;
                const dy = destination.y - origin.y;

                update = foundry.canvas.placeables.Drawing.rescaleDimensions(event.interactionData.originalData, dx, dy);
            }

            this.document.updateSource(update);
            this.renderFlags.set({ refreshSize: true });
        },
        libWrapper.OVERRIDE,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onHandleDragDrop",
        function (event) {
            let { handle, destination, origin } = event.interactionData;

            if (this._editHandle) {
                handle = this._editHandle;
            }

            const originalEvent = event.data.originalEvent;
            let update;

            event.interactionData.restoreOriginalData = false;

            if (!originalEvent.shiftKey) {
                destination = this.layer.getSnappedPoint(destination);
            }

            if (handle instanceof PointHandle || handle instanceof EdgeHandle) {
                this._dragHandle = false;
                handle._hover = false;
                handle.refresh();
                this._editHandle = null;

                const matrix = new PIXI.Matrix();
                const point = new PIXI.Point(destination.x, destination.y);
                const { x, y, rotation, shape: { width, height, points } } = event.interactionData.originalData;

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

                update = foundry.canvas.placeables.Drawing.rescaleDimensions(update, 0, 0);
            } else {
                const dx = destination.x - origin.x;
                const dy = destination.y - origin.y;

                update = foundry.canvas.placeables.Drawing.rescaleDimensions(event.interactionData.originalData, dx, dy);
            }

            return this.document.update(update, { diff: false });
        },
        libWrapper.OVERRIDE,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onClickLeft",
        function (wrapped, event) {
            this._editHandle = null;

            if (this._editHandles?.points.children.includes(event.target)
                || this._editHandles?.edges.children.includes(event.target)) {
                event.interactionData.dragHandle = true;
                event.stopPropagation();
                this._editHandle = event.target;

                return;
            }

            return wrapped(event);
        },
        libWrapper.MIXED,
    );

    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype._onClickRight",
        function (wrapped, event) {
            let handle = event.interactionData.handle;

            if (this._editHandle) {
                handle = this._editHandle;
            }

            if ((handle instanceof PointHandle || handle instanceof EdgeHandle) && handle._hover) {
                event.stopPropagation();
                this._dragHandle = false;
                handle._hover = false;
                handle.refresh();
                this._editHandle = null;

                const { x, y, rotation, shape: { width, height, points } } = this.document;
                let update = { x, y, shape: { width, height, points: Array.from(points) } };

                if (handle instanceof EdgeHandle) {
                    const origin = event.interactionData.origin;
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
                update = foundry.canvas.placeables.Drawing.rescaleDimensions(update, 0, 0);

                return this.document.update(update, { diff: false });
            }

            return wrapped(event);
        },
        libWrapper.MIXED,
    );
});

foundry.canvas.placeables.Drawing.prototype._editMode = false;

foundry.canvas.placeables.Drawing.prototype._toggleEditMode = function (active) {
    this.layer.placeables.forEach((drawing) => {
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

        if (this.hasActiveHUD) {
            this.layer.hud.close();
        }
    }
};

foundry.canvas.placeables.Drawing.prototype._editHandles = null;

foundry.canvas.placeables.Drawing.prototype._refreshEditMode = function () {
    const document = this.document;

    if (this._editMode && this.layer.active && !document._source.locked && document.shape.type === "p") {
        let editHandles = this._editHandles;

        if (!editHandles || editHandles.destroyed) {
            editHandles = this._editHandles = this.addChild(new PIXI.Container());
            editHandles.edges = editHandles.addChild(new PIXI.Container());
            editHandles.points = editHandles.addChild(new PIXI.Container());
        }

        const activateListeners = (handle) => {
            handle.off("pointerover").off("pointerout")
                .on("pointerover", this._onHandleHoverIn.bind(this))
                .on("pointerout", this._onHandleHoverOut.bind(this));
            handle.eventMode = "static";
        };

        const points = document.shape.points;

        for (let i = editHandles.edges.children.length; i <= points.length; i++) {
            activateListeners(editHandles.edges.addChild(new EdgeHandle(this, i)));
        }

        for (let i = editHandles.points.children.length; i <= points.length; i++) {
            activateListeners(editHandles.points.addChild(new PointHandle(this, i)));
        }

        if (editHandles.edges.children.length > points.length) {
            editHandles.edges.removeChildren(points.length).forEach((c) => c.destroy({ children: true }));
        }

        if (editHandles.points.children.length > points.length) {
            editHandles.points.removeChildren(points.length).forEach((c) => c.destroy({ children: true }));
        }

        editHandles.edges.children.forEach((handle) => handle.refresh());
        editHandles.points.children.forEach((handle) => handle.refresh());
    } else {
        this._editMode = false;

        if (this._editHandles) {
            this._editHandles.destroy({ children: true });
            this._editHandles = null;
        }
    }
};

class PointHandle extends PIXI.Graphics {
    _hover = false;

    constructor(object, index) {
        super();

        this.object = object;
        this.index = index;
        this.cursor = "pointer";
        this.eventMode = "static";
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

        this.cursor = "pointer";
        this.eventMode = "static";
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
