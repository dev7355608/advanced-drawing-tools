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
        const maxSize = canvas.performance.textures.maxSize;
        const maxZoom = Math.min(CONFIG.Canvas.maxZoom, 4);

        this._resolution = Math.min(Math.max((maxSize / 2 - 1) / size, Math.min((maxSize - 1) / size, 2)), maxZoom) * this._quality;
        this._resolution *= Math.min((maxSize - 1) / Math.ceil(size * this._resolution), 1);

        if (canvas.performance.mode <= CONST.CANVAS_PERFORMANCE_MODES.MED) {
            this._resolution = Math.min(this._resolution, 2);
        } else if (canvas.performance.mode <= CONST.CANVAS_PERFORMANCE_MODES.HIGH) {
            this._resolution = Math.min(this._resolution, 3);
        }
    }

    PIXI.Text.prototype.updateText.call(this, respectDirty);
};
