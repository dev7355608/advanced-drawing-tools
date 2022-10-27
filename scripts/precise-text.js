PreciseText.prototype._quality = 1;

Object.defineProperties(PreciseText.prototype, {
    resolution: {
        get() {
            return this._resolution;
        },
        set(value) { }
    },
    quality: {
        get() {
            return this._quality;
        },
        set(value) {
            if (this._quality !== value) {
                this._quality = value;
                this.dirty = true;
            }
        }
    }
});

PreciseText.prototype.updateText = function (respectDirty) {
    const style = this._style;

    if (!respectDirty || this.dirty || this.localStyleID !== style.styleID) {
        const measured = PIXI.TextMetrics.measureText(this._text || " ", style, style.wordWrap, this.canvas);
        const size = Math.ceil(Math.max(measured.width, measured.height, 1) + style.padding * 2);
        const maxSize = PreciseText._MAX_TEXTURE_SIZE ?? 4096;
        const maxZoom = PreciseText._MAX_ZOOM ?? 3;
        const maxResolution = PreciseText._MAX_RESOLUTION ?? 2;

        this._resolution = Math.min(Math.max((maxSize / 2 - 1) / size, Math.min((maxSize - 1) / size, 2)), maxZoom) * this._quality;
        this._resolution *= Math.min((maxSize - 1) / Math.ceil(size * this._resolution), 1);
        this._resolution = Math.min(this._resolution, maxResolution);
    }

    PIXI.Text.prototype.updateText.call(this, respectDirty);
};

Hooks.on("canvasInit", () => {
    const gl = canvas.app.renderer.gl;

    PreciseText._MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    PreciseText._MAX_ZOOM = Math.min(CONFIG.Canvas.maxZoom, 4);

    if (canvas.performance.mode <= CONST.CANVAS_PERFORMANCE_MODES.MED) {
        PreciseText._MAX_RESOLUTION = 2;
    } else if (canvas.performance.mode <= CONST.CANVAS_PERFORMANCE_MODES.HIGH) {
        PreciseText._MAX_RESOLUTION = PreciseText._MAX_ZOOM > 3 ? 3 : 2;
    } else {
        PreciseText._MAX_RESOLUTION = PreciseText._MAX_ZOOM;
    }
});
