import { MODULE_NAME } from "./const.js";

Drawing.prototype._convertToPolygon = async function ({ confirm = false } = {}) {
    if (this.document.shape.type === "p") {
        return;
    }

    return await (confirm ? Dialog.confirm({
        title: `${MODULE_NAME}: Convert Drawing to Polygon`,
        content: `<p>Permanently convert this Drawing to a Polygon?</p>`,
        defaultYes: false
    }) : Promise.resolve()).then(async result => {
        if (!result) {
            return;
        }

        this.document.reset();

        const { x, y, shape: { width, height, type } } = this.document;
        let update = { x, y, shape: { width, height, type: "p" } };

        if (type === "r") {
            update.shape.points = [0, 0, width, 0, width, height, 0, height];
        } else if (type === "e") {
            const rx = width / 2;
            const ry = height / 2;

            if (rx > 0 && ry > 0) {
                const cx = rx;
                const cy = ry;
                const n = Math.ceil(Math.sqrt((rx + ry) / 2));
                const m = n * 8;
                const points = new Array(m);

                let j1 = 0;
                let j2 = n * 4 + 2;
                let j3 = j2;
                let j4 = m;

                {
                    const x1 = cx + rx;
                    const x2 = cx - rx;

                    points[j1++] = x1;
                    points[j1++] = cy;
                    points[--j2] = cy;
                    points[--j2] = x2;
                }

                for (let i = 1; i < n; i++) {
                    const a = Math.PI / 2 * (i / n);
                    const x0 = Math.cos(a) * rx;
                    const y0 = Math.sin(a) * ry;
                    const x1 = cx + x0;
                    const x2 = cx - x0;
                    const y1 = cy + y0;
                    const y2 = cy - y0;

                    points[j1++] = x1;
                    points[j1++] = y1;
                    points[--j2] = y1;
                    points[--j2] = x2;
                    points[j3++] = x2;
                    points[j3++] = y2;
                    points[--j4] = y2;
                    points[--j4] = x1;
                }

                {
                    const y1 = cy + ry;
                    const y2 = cy - ry;

                    points[j1++] = cx;
                    points[j1++] = y1;
                    points[--j4] = y2;
                    points[--j4] = cx;
                }

                update.shape.points = points;
            } else {
                update.shape.points = [];
            }
        } else {
            return;
        }

        this.document.shape.type = "p";
        update = this._rescaleDimensions(update, 0, 0);
        update.shape.type = "p";

        if (this.document.fillType === CONST.DRAWING_FILL_TYPES.NONE) {
            update.fillType = CONST.DRAWING_FILL_TYPES.SOLID;
            update.fillAlpha = 0;
        }

        update.bezierFactor = 0;

        await this.document.update(update);
    });
};
