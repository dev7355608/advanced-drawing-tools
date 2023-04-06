export class WarpedText extends PIXI.Mesh {
    constructor(text) {
        const geometry = new WarpedTextGeometry(0, 0, 2, 2);
        const material = new PIXI.MeshMaterial(new PIXI.Texture(text.texture.baseTexture));

        super(geometry, material);

        this.text = text;

        if (this.texture.baseTexture.valid) {
            this.textureUpdated();
        }

        this.texture.on("update", this.textureUpdated, this);
    }

    get arc() {
        return this.geometry.arc;
    }

    set arc(value) {
        if (this.geometry.arc !== value) {
            this._buildGeometry(this.geometry.width, this.geometry.height, value);
        }
    }

    textureUpdated() {
        const geometry = this.geometry;
        const { width, height } = this.texture;

        if (geometry.width !== width || geometry.height !== height) {
            this._buildGeometry(width, height, geometry.arc);
        }
    }

    _buildGeometry(width, height, arc) {
        const geometry = this.geometry;

        geometry.width = width;
        geometry.height = height;

        if (width > 0 && height > 0 && arc !== 0) {
            const radius = width / Math.abs(arc) + height;
            const step = Math.PI / 4 * Math.sqrt(radius);

            geometry.segWidth = Math.min(Math.max(Math.ceil((width + height * Math.abs(arc)) / step + 1e-6), 2), 512);
            geometry.segHeight = Math.min(Math.max(Math.ceil(height / step + 1e-6), 2), 128);
        } else {
            geometry.segWidth = geometry.segHeight = 2;
        }

        geometry.arc = arc;
        geometry.build();
    }

    _render(renderer) {
        this.text.updateText(true);

        if (this.geometry.width > 0 && this.geometry.height > 0) {
            super._render(renderer);
        }
    }

    updateTransform() {
        this.text.updateText(true);

        super.updateTransform();
    }

    getBounds(skipUpdate, rect) {
        this.text.updateText(true);

        if (this.text._textureID === -1) {
            skipUpdate = false;
        }

        return super.getBounds(skipUpdate, rect);
    }

    getLocalBounds(rect) {
        this.updateText(true);

        return super.getLocalBounds(this, rect);
    }


    destroy(options) {
        this.texture.off("update", this.textureUpdated, this);

        super.destroy(options);
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
