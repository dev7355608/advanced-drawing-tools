import { MODULE_ID } from "./const.js";
import { cleanData, saveValue, stringifyValue } from "./utils.js";

Hooks.once("init", () => {
    libWrapper.register(MODULE_ID, "DrawingConfig.prototype._getSubmitData", function (wrapped, ...args) {
        const data = foundry.utils.flattenObject(wrapped(...args));

        if (this.form.elements[`${MODULE_ID}.lineStyle.dash`].checked) {
            data[`flags.${MODULE_ID}.lineStyle.dash`] = [
                Number(this.form.elements[`flags.${MODULE_ID}.lineStyle.dash.0`].value) || 8,
                Number(this.form.elements[`flags.${MODULE_ID}.lineStyle.dash.1`].value) || 5
            ];
        } else {
            data[`flags.${MODULE_ID}.lineStyle.dash`] = null;
        }

        const processValue = name => {
            data[name] = saveValue(data[name]);
        };

        processValue(`flags.${MODULE_ID}.fillStyle.texture.width`);
        processValue(`flags.${MODULE_ID}.fillStyle.texture.height`);
        processValue(`flags.${MODULE_ID}.fillStyle.transform.position.x`);
        processValue(`flags.${MODULE_ID}.fillStyle.transform.position.y`);
        processValue(`flags.${MODULE_ID}.fillStyle.transform.pivot.x`);
        processValue(`flags.${MODULE_ID}.fillStyle.transform.pivot.y`);
        processValue(`flags.${MODULE_ID}.textStyle.wordWrapWidth`);
        processValue(`flags.${MODULE_ID}.textStyle.lineHeight`);

        const processStringArray = name => {
            if (data[name] == null) {
                data[name] = [];
            } else if (!Array.isArray(data[name])) {
                data[name] = [data[name]];
            }

            if (data[name].every(v => !v)) {
                data[name] = null;
            }
        };

        const processNumberArray = name => {
            if (data[name] == null) {
                data[name] = [];
            } else if (!Array.isArray(data[name])) {
                data[name] = [data[name]];
            }

            // TODO: Remove once https://gitlab.com/foundrynet/foundryvtt/-/issues/6986 is fixed
            data[name] = data[name].map(v => v !== "" ? Number(v) : null);

            if (data[name].every(v => v === null)) {
                data[name] = null;
            }
        };

        processStringArray(`flags.${MODULE_ID}.textStyle.fill`);
        processNumberArray(`flags.${MODULE_ID}.textStyle.fillGradientStops`);

        if (this.options.configureDefault) {
            return data;
        }

        return cleanData(data, data.type || this.object.data.type);
    }, "WRAPPER");

    // TODO: Remove once https://gitlab.com/foundrynet/foundryvtt/-/issues/6846 is fixed
    libWrapper.register(MODULE_ID, "DrawingConfig.prototype._updateObject", async function (event, formData) {
        if (!this.object.isOwner) throw new Error("You do not have the ability to configure this Drawing object.");

        // Configure the default Drawing settings
        if (this.options.configureDefault) {
            formData.author = game.user.id;
            const newDefault = new DrawingDocument(foundry.utils.expandObject(formData));
            return game.settings.set("core", DrawingsLayer.DEFAULT_CONFIG_SETTING, newDefault.toJSON());
        }

        // Create or update a Drawing
        if (this.object.id) return this.object.update(formData);
        return this.object.constructor.create(formData);
    }, "OVERRIDE");
});

Hooks.on("renderDrawingConfig", (app, html) => {
    const document = app.object;
    const configureDefault = app.options.configureDefault;
    const isText = !configureDefault && document.data.type === CONST.DRAWING_TYPES.TEXT;
    const ls = document.getFlag(MODULE_ID, "lineStyle") ?? {};
    const fs = document.getFlag(MODULE_ID, "fillStyle") ?? {};
    const ts = document.getFlag(MODULE_ID, "textStyle") ?? {};

    html.find(`input[name="text"]`).replaceWith(`
        <textarea name="text" style="font-family: var(--font-primary); min-height: calc(var(--form-field-height) + 3px); height: 0; border-color: var(--color-border-light-tertiary);">${document.data.text ?? ""}</textarea>
    `);

    html.find(`input[name="strokeWidth"]`).closest(".form-group").after(`
        <div class="form-group">
            <label>Dashed <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <label>Dash</label>
                <input type="number" id="flags.${MODULE_ID}.lineStyle.dash.0" min="0.1" step="0.1" placeholder="8" value="${ls.dash?.[0] ?? "8"}">
                <label>Gap</label>
                <input type="number" id="flags.${MODULE_ID}.lineStyle.dash.1" min="0.1" step="0.1" placeholder="5" value="${ls.dash?.[1] ?? "5"}">
                &nbsp;&nbsp;&nbsp;
                <input type="checkbox" id="${MODULE_ID}.lineStyle.dash" ${ls.dash ? "checked" : ""}>
            </div>
        </div>
    `);

    if (configureDefault || document.data.type === CONST.DRAWING_TYPES.POLYGON || document.data.type === CONST.DRAWING_TYPES.FREEHAND) {
        html.find(`input[name="strokeWidth"]`).closest(".form-group").after(`
            <div class="form-group">
                <label>Line Cap</label>
                <select name="flags.${MODULE_ID}.lineStyle.cap">
                    <option value="butt" ${ls.cap === "butt" ? "selected" : ""}>Butt</option>
                    <option value="round" ${ls.cap === "round" ? "selected" : ""}>Round</option>
                    <option value="square" ${ls.cap === "square" ? "selected" : ""}>Square</option>
                </select>
            </div>
            <div class="form-group">
                <label>Line Join</label>
                <select name="flags.${MODULE_ID}.lineStyle.join">
                    <option value="miter" ${ls.join === "miter" ? "selected" : ""}>Miter</option>
                    <option value="bevel" ${ls.join === "bevel" ? "selected" : ""}>Bevel</option>
                    <option value="round" ${ls.join === "round" ? "selected" : ""}>Round</option>
                </select>
            </div>
            <div class="form-group">
                <label>Line Alignment</label>
                <div class="form-fields">
                    <input type="range" name="flags.${MODULE_ID}.lineStyle.alignment" min="0" max="1" step="0.05" value="${ls.alignment ?? "0.5"}">
                    <span class="range-value">${ls.alignment ?? "0.5"}</span>
                </div>
            </div>
        `);
    }

    html.find(`div[data-tab="fill"]`).append(`
        <div class="form-group">
            <label>Texture Size <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.width" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Auto" value="${stringifyValue(fs.texture?.width) ?? ""}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.height" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Auto" value="${stringifyValue(fs.texture?.height) ?? ""}">
            </div>
        </div>
        <div class="form-group">
            <label>Texture Position <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.position.x" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${stringifyValue(fs.transform?.position?.x) ?? "0px"}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.position.y" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${stringifyValue(fs.transform?.position?.y) ?? "0px"}">
            </div>
        </div>
        <div class="form-group">
            <label>Texture Pivot <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.pivot.x" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${stringifyValue(fs.transform?.pivot?.x) ?? "0px"}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.pivot.y" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${stringifyValue(fs.transform?.pivot?.y) ?? "0px"}">
            </div>
        </div>
        <div class="form-group">
            <label>Texture Scale</label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.scale.x" data-dtype="Number" placeholder="1" value="${fs.transform?.scale?.x ?? "1"}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.scale.y" data-dtype="Number" placeholder="1" value="${fs.transform?.scale?.y ?? "1"}">
            </div>
        </div>
        <div class="form-group">
            <label>Texture Rotation <span class="units">(Degrees)</span></label>
            <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.rotation" data-dtype="Number" placeholder="0" value="${fs.transform?.rotation ?? "0"}">
        </div>
        <div class="form-group">
            <label>Texture Skew <span class="units">(Degrees)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.skew.x" data-dtype="Number" placeholder="0" value="${fs.transform?.skew?.x ?? "0"}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.skew.y" data-dtype="Number" placeholder="0" value="${fs.transform?.skew?.y ?? "0"}">
            </div>
        </div>
    `);

    html.find(`select[name="fontFamily"]`).closest(".form-group").after(`
        <div class="form-group">
            <label>Font Style</label>
            <select name="flags.${MODULE_ID}.textStyle.fontStyle">
                <option value="normal" ${ts.fontStyle === "normal" ? "selected" : ""}>Normal</option>
                <option value="italic" ${ts.fontStyle === "italic" ? "selected" : ""}>Italic</option>
                <option value="oblique" ${ts.fontStyle === "oblique" ? "selected" : ""}>Oblique</option>
            </select>
        </div>
        <div class="form-group">
            <label>Font Variant</label>
            <select name="flags.${MODULE_ID}.textStyle.fontVariant">
                <option value="normal" ${ts.fontVariant === "normal" ? "selected" : ""}>Normal</option>
                <option value="small-caps" ${ts.fontVariant === "small-caps" ? "selected" : ""}>Small Caps</option>
            </select>
        </div>
        <div class="form-group">
            <label>Font Weight</label>
            <select name="flags.${MODULE_ID}.textStyle.fontWeight">
                <option value="normal" ${ts.fontWeight === "normal" ? "selected" : ""}>Normal</option>
                <option value="bold" ${ts.fontWeight === "bold" ? "selected" : ""}>Bold</option>
                <option value="bolder" ${ts.fontWeight === "bolder" ? "selected" : ""}>Bolder</option>
                <option value="lighter" ${ts.fontWeight === "lighter" ? "selected" : ""}>Lighter</option>
                <option value="100" ${ts.fontWeight === "100" ? "selected" : ""}>100</option>
                <option value="200" ${ts.fontWeight === "200" ? "selected" : ""}>200</option>
                <option value="300" ${ts.fontWeight === "300" ? "selected" : ""}>300</option>
                <option value="400" ${ts.fontWeight === "400" ? "selected" : ""}>400</option>
                <option value="500" ${ts.fontWeight === "500" ? "selected" : ""}>500</option>
                <option value="600" ${ts.fontWeight === "600" ? "selected" : ""}>600</option>
                <option value="700" ${ts.fontWeight === "700" ? "selected" : ""}>700</option>
                <option value="800" ${ts.fontWeight === "800" ? "selected" : ""}>800</option>
                <option value="900" ${ts.fontWeight === "900" ? "selected" : ""}>900</option>
            </select>
        </div>
    `);

    html.find(`input[name="textColor"]`).closest(".form-fields").append(`
        &nbsp;
        <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="Auto" title="Color Stop" value="${ts?.fillGradientStops?.[0] ?? ""}">
        &nbsp;
        <a title="Add Color" id="${MODULE_ID}.textStyle.fill:add" style="flex: 0;"><i class="fas fa-plus fa-fw" style="margin: 0;"></i></a>
        <a title="Remove Color" id="${MODULE_ID}.textStyle.fill:remove" style="flex: 0;"><i class="fas fa-minus fa-fw" style="margin: 0;"></i></a>
    `);
    html.find(`a[id="${MODULE_ID}.textStyle.fill:add"]`).click(event => {
        html.find(`input[name="textColor"]`).closest(".form-group").after(createTextColor(
            html.find(`input[name="textColor"]`).val(),
            html.find(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).eq(0).val()
        ));
        app.setPosition(app.position);
    });
    html.find(`a[id="${MODULE_ID}.textStyle.fill:remove"]`).click(event => {
        html.find(`input[name="textColor"],input[data-edit="textColor"]`).val(
            html.find(`input[name="flags.${MODULE_ID}.textStyle.fill"]`).eq(0).val() || "#FFFFFF"
        );
        html.find(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).eq(0).val(
            html.find(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).eq(1).val() ?? ""
        );
        html.find(`input[name="flags.${MODULE_ID}.textStyle.fill"]`).eq(0).closest(".form-group").remove();
        app.setPosition(app.position);
    });

    const createTextColor = (fill, stop) => {
        const group = $(`
            <div class="form-group">
                <label></label>
                <div class="form-fields">
                    <input class="color" type="text" name="flags.${MODULE_ID}.textStyle.fill" value="${fill || "#FFFFFF"}">
                    <input type="color" data-edit="" value="${fill || "#FFFFFF"}">
                    &nbsp;
                    <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="Auto" title="Color Stop" value="${stop ?? ""}">
                    &nbsp;
                    <a title="Add Color" style="flex: 0;"><i class="fas fa-plus fa-fw" style="margin: 0;"></i></a>
                    <a title="Remove Color" style="flex: 0;"><i class="fas fa-minus fa-fw" style="margin: 0;"></i></a>
                </div>
            </div>
        `);

        group.find(`input[type="color"]`).change(event => {
            group.find(`input[class="color"]`).val(event.target.value)
        });
        group.find(`a`).eq(0).click(event => {
            $(event.target).closest(".form-group").after(createTextColor(
                group.find(`input[class="color"]`).val(),
                group.find(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).val()
            ));
            app.setPosition(app.position);
        });
        group.find(`a`).eq(1).click(event => {
            $(event.target).closest(".form-group").remove();
            app.setPosition(app.position);
        });

        return group;
    }

    if (ts.fill) {
        const fill = Array.isArray(ts.fill) ? ts.fill : [ts.fill];

        for (let i = fill.length - 1; i >= 0; i--) {
            html.find(`input[name="textColor"]`).closest(".form-group").after(
                createTextColor(fill[i], ts?.fillGradientStops?.[i + 1])
            );
        }
    }

    html.find(`input[name="textAlpha"]`).closest(".form-group").before(`
        <div class="form-group">
            <label>Text Color Gradient</label>
            <select name="flags.${MODULE_ID}.textStyle.fillGradientType" data-dtype="Number">
                <option value="0" ${ts.fillGradientType === 0 || ts.fillGradientType == null ? "selected" : ""}>Vertical</option>
                <option value="1" ${ts.fillGradientType === 1 ? "selected" : ""}>Horizontal</option>
            </select>
        </div>
    `);

    html.find(`input[name="textAlpha"]`).closest(".form-group").after(`
        <div class="form-group">
            <label>Text Alignment</label>
            <select name="flags.${MODULE_ID}.textStyle.align">
                <option value="left" ${ts.align === "left" || isText && ts.align == null ? "selected" : ""}>Left</option>
                <option value="center" ${ts.align === "center" || !isText && ts.align == null ? "selected" : ""}>Center</option>
                <option value="right" ${ts.align === "right" ? "selected" : ""}>Right</option>
                <option value="justify" ${ts.align === "justify" ? "selected" : ""}>Justify</option>
            </select>
        </div>
        <div class="form-group">
            <label>Text Baseline</label>
            <select name="flags.${MODULE_ID}.textStyle.textBaseline">
                <option value="alphabetic" ${ts.textBaseline === "alphabetic" || ts.textBaseline == null ? "selected" : ""}>Alphabetic</option>
                <option value="top" ${ts.textBaseline === "top" ? "selected" : ""}>Top</option>
                <option value="hanging" ${ts.textBaseline === "hanging" ? "selected" : ""}>Hanging</option>
                <option value="middle" ${ts.textBaseline === "middle" ? "selected" : ""}>Middle</option>
                <option value="ideographic" ${ts.textBaseline === "ideographic" ? "selected" : ""}>Ideographic</option>
                <option value="bottom" ${ts.textBaseline === "bottom" ? "selected" : ""}>Bottom</option>
            </select>
        </div>
        <div class="form-group">
            <label>Stroke Color</label>
            <div class="form-fields">
                <input class="color" type="text" name="flags.${MODULE_ID}.textStyle.stroke" placeholder="#111111" value="${ts.stroke || "#111111"}">
                <input type="color" value="${ts.stroke || "#111111"}" data-edit="flags.${MODULE_ID}.textStyle.stroke">
            </div>
        </div>
        <div class="form-group">
            <label>Stroke Thickness <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.strokeThickness" min="0" step="0.1" placeholder="Auto" value="${ts.strokeThickness ?? ""}">
        </div>
        <div class="form-group">
            <label>Drop Shadow</label>
            <input type="checkbox" name="flags.${MODULE_ID}.textStyle.dropShadow" ${(ts.dropShadow ?? true) ? "checked" : ""}>
        </div>
        <div class="form-group">
            <label>Drop Shadow Blur <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowBlur" min="0" step="0.1" placeholder="Auto" value="${ts.dropShadowBlur ?? ""}">
        </div>
        <div class="form-group">
            <label>Drop Shadow Distance <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowDistance" min="0" step="0.1" placeholder="0" value="${ts.dropShadowDistance ?? "0"}">
        </div>
        <div class="form-group">
            <label>Drop Shadow Angle <span class="units">(Degrees)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowAngle" step="0.1" placeholder="0" value="${ts.dropShadowAngle ?? "0"}">
        </div>
        <div class="form-group">
            <label>Drop Shadow Color</label>
            <div class="form-fields">
                <input class="color" type="text" name="flags.${MODULE_ID}.textStyle.dropShadowColor" placeholder="#000000" value="${ts.dropShadowColor || "#000000"}">
                <input type="color" value="${ts.dropShadowColor || "#000000"}" data-edit="flags.${MODULE_ID}.textStyle.dropShadowColor">
            </div>
        </div>
        <div class="form-group">
            <label>Drop Shadow Alpha</label>
            <div class="form-fields">
                <input type="range" name="flags.${MODULE_ID}.textStyle.dropShadowAlpha" min="0" max="1" step="0.1" value="${ts.dropShadowAlpha ?? "1"}">
                <span class="range-value">${ts.dropShadowAlpha ?? "1"}</span>
            </div>
        </div>
        <div class="form-group">
            <label>Arc <span class="units">(Degrees)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.arc" step="0.1" min="-360" max="360" placeholder="0" value="${ts.arc ?? "0"}">
        </div>
        <div class="form-group">
            <label>Word Wrap</label>
            <input type="checkbox" name="flags.${MODULE_ID}.textStyle.wordWrap" ${ts.wordWrap || ts.wordWrap == null && !isText ? "checked" : ""}>
        </div>
        <div class="form-group">
            <label>Word Wrap Width <span class="units">(Pixels or %)</span></label>
            <input type="text" name="flags.${MODULE_ID}.textStyle.wordWrapWidth" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="150%" value="${stringifyValue(ts.wordWrapWidth) ?? "150%"}">
        </div>
        <div class="form-group">
            <label>Break Words</label>
            <input type="checkbox" name="flags.${MODULE_ID}.textStyle.breakWords" ${ts.breakWords ? "checked" : ""}>
        </div>
        <div class="form-group">
            <label>White Space</label>
            <select name="flags.${MODULE_ID}.textStyle.whiteSpace">
                <option value="normal" ${ts.whiteSpace === "normal" ? "selected" : ""}>Normal</option>
                <option value="pre" ${ts.whiteSpace === "pre" || ts.whiteSpace == null ? "selected" : ""}>Pre</option>
                <option value="pre-line" ${ts.whiteSpace === "pre-line" ? "selected" : ""}>Pre-Line</option>
            </select>
        </div>
        <div class="form-group">
            <label>Leading <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.leading" min="0" step="0.1" placeholder="0" value="${ts.leading ?? "0"}">
        </div>
        <div class="form-group">
            <label>Letter Spacing <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.letterSpacing" min="0" step="0.1" placeholder="0" value="${ts.letterSpacing ?? "0"}">
        </div>
        <div class="form-group">
            <label>Line Height <span class="units">(Pixels or %)</span></label>
            <input type="text" name="flags.${MODULE_ID}.textStyle.lineHeight" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Auto" value="${stringifyValue(ts.lineHeight) ?? ""}">
        </div>
        <div class="form-group">
            <label>Line Join</label>
            <select name="flags.${MODULE_ID}.textStyle.lineJoin">
                <option value="miter" ${ts.lineJoin === "miter" || ts.lineJoin == null ? "selected" : ""}>Miter</option>
                <option value="round" ${ts.lineJoin === "round" ? "selected" : ""}>Round</option>
                <option value="bevel" ${ts.lineJoin === "bevel" ? "selected" : ""}>Bevel</option>
            </select>
        </div>
        <div class="form-group">
            <label>Miter Limit <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.miterLimit" min="0" step="0.1" placeholder="10" value="${ts.miterLimit ?? "10"}">
        </div>
        <div class="form-group">
            <label>Padding <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.padding" min="0" step="0.1" placeholder="Auto" value="${ts.padding ?? ""}">
        </div>
        <div class="form-group">
            <label>Trim</label>
            <input type="checkbox" name="flags.${MODULE_ID}.textStyle.trim" ${(ts.trim ?? false) ? "checked" : ""}>
        </div>
    `);

    app.options.height = "auto";
    app.position.height = "auto";
    app.setPosition(app.position);
});
