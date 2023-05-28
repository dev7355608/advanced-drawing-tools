import { MODULE_ID } from "./const.js";
import { cleanData, saveValue, stringifyValue } from "./utils.js";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(MODULE_ID, "DrawingConfig.prototype._getSubmitData", function (wrapped, ...args) {
        const data = foundry.utils.flattenObject(wrapped(...args));

        if (this.form.querySelector(`input[class="${MODULE_ID}--lineStyle-dash"]`).checked) {
            data[`flags.${MODULE_ID}.lineStyle.dash`] = [
                Number(data[`flags.${MODULE_ID}.lineStyle.dash`][0]) || 8,
                Number(data[`flags.${MODULE_ID}.lineStyle.dash`][1]) || 5
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

            if (data[name].every(v => v === null)) {
                data[name] = null;
            }
        };

        processStringArray(`flags.${MODULE_ID}.textStyle.fill`);
        processNumberArray(`flags.${MODULE_ID}.textStyle.fillGradientStops`);

        return foundry.utils.flattenObject(cleanData(data, { deletionKeys: !this.options.configureDefault }));
    }, libWrapper.WRAPPER);
});

Hooks.on("renderDrawingConfig", (app, html) => {
    const document = app.document;
    const ls = document.getFlag(MODULE_ID, "lineStyle") ?? {};
    const fs = document.getFlag(MODULE_ID, "fillStyle") ?? {};
    const ts = document.getFlag(MODULE_ID, "textStyle") ?? {};

    html.find(`input[name="text"]`).replaceWith(`
        <textarea name="text" style="font-family: var(--font-primary); min-height: calc(var(--form-field-height) + 3px); height: 0; border-color: var(--color-border-light-tertiary);">${document.text ?? ""}</textarea>
    `);

    html.find(`input[name="strokeWidth"]`).closest(".form-group").after(`
        <div class="form-group">
            <label>Dashed <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <label>Dash</label>
                <input type="number" name="flags.${MODULE_ID}.lineStyle.dash" min="0.1" step="0.1" placeholder="8" value="${ls.dash?.[0] ?? "8"}">
                <label>Gap</label>
                <input type="number" name="flags.${MODULE_ID}.lineStyle.dash" min="0.1" step="0.1" placeholder="5" value="${ls.dash?.[1] ?? "5"}">
                &nbsp;&nbsp;&nbsp;
                <input type="checkbox" class="${MODULE_ID}--lineStyle-dash" ${ls.dash ? "checked" : ""}>
            </div>
        </div>
    `);

    html.find(`div[data-tab="fill"]`).append(`
        <div class="form-group">
            <label>Texture Size <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.width" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Width" value="${stringifyValue(fs.texture?.width) ?? ""}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.height" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Height" value="${stringifyValue(fs.texture?.height) ?? ""}">
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
                <option value="normal" ${ts.fontStyle === "normal" || ts.fontStyle == null ? "selected" : ""}>Normal</option>
                <option value="italic" ${ts.fontStyle === "italic" ? "selected" : ""}>Italic</option>
                <option value="oblique" ${ts.fontStyle === "oblique" ? "selected" : ""}>Oblique</option>
            </select>
        </div>
        <div class="form-group">
            <label>Font Variant</label>
            <select name="flags.${MODULE_ID}.textStyle.fontVariant">
                <option value="normal" ${ts.fontVariant === "normal" || ts.fontVariant == null ? "selected" : ""}>Normal</option>
                <option value="small-caps" ${ts.fontVariant === "small-caps" ? "selected" : ""}>Small Caps</option>
            </select>
        </div>
        <div class="form-group">
            <label>Font Weight</label>
            <select name="flags.${MODULE_ID}.textStyle.fontWeight">
                <option value="normal" ${ts.fontWeight === "normal" || ts.fontWeight == null ? "selected" : ""}>Normal</option>
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

    html.find(`input[name="fontSize"]`).closest(".form-group").after(`
        <div class="form-group">
            <label>Leading <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.leading" min="0" step="0.1" placeholder="0" value="${ts.leading ?? "0"}">
        </div>
        <div class="form-group">
            <label>Letter Spacing <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.letterSpacing" min="0" step="0.1" placeholder="0" value="${ts.letterSpacing ?? "0"}">
        </div>
        <div class="form-group">
            <label>Word Wrap Width <span class="units">(Pixels or %)</span></label>
            <input type="text" name="flags.${MODULE_ID}.textStyle.wordWrapWidth" title="Pixels (px) or Percent (%)" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="100%" value="${stringifyValue(ts.wordWrapWidth) ?? "100%"}">
        </div>
    `);

    html.find(`input[name="textColor"]`).closest(".form-fields").append(`
        &nbsp;
        <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="" title="Color Stop" value="${ts?.fillGradientStops?.[0] ?? ""}">
        &nbsp;
        <a title="Add Color" class="${MODULE_ID}--textStyle-fill--add" style="flex: 0;"><i class="fas fa-plus fa-fw" style="margin: 0;"></i></a>
        <a title="Remove Color" class="${MODULE_ID}--textStyle-fill--remove" style="flex: 0;"><i class="fas fa-minus fa-fw" style="margin: 0;"></i></a>
    `);
    html.find(`a[class="${MODULE_ID}--textStyle-fill--add"]`).click(event => {
        html.find(`input[name="textColor"]`).closest(".form-group").after(createTextColor(
            html.find(`input[name="textColor"]`).val(),
            html.find(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).eq(0).val()
        ));
        app.setPosition(app.position);
    });
    html.find(`a[class="${MODULE_ID}--textStyle-fill--remove"]`).click(event => {
        html.find(`input[name="textColor"],input[data-edit="textColor"]`).val(
            html.find(`input[name="flags.${MODULE_ID}.textStyle.fill"]`).eq(0).val() || "#ffffff"
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
                    <input class="color" type="text" name="flags.${MODULE_ID}.textStyle.fill" value="${fill || "#ffffff"}">
                    <input type="color" data-edit="" value="${fill || "#ffffff"}">
                    &nbsp;
                    <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="" title="Color Stop" value="${stop ?? ""}">
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
                <option value="" ${ts.align == null ? "selected" : ""}>Default</option>
                <option value="left" ${ts.align === "left" || ts.align === "justify" ? "selected" : ""}>Left</option>
                <option value="center" ${ts.align === "center" ? "selected" : ""}>Center</option>
                <option value="right" ${ts.align === "right" ? "selected" : ""}>Right</option>
            </select>
        </div>
        <div class="form-group">
            <label>Stroke Color</label>
            <div class="form-fields">
                <input class="color" type="text" name="flags.${MODULE_ID}.textStyle.stroke" placeholder="" value="${ts.stroke || ""}">
                <input type="color" value="${ts.stroke || "#000000"}" data-edit="flags.${MODULE_ID}.textStyle.stroke">
            </div>
        </div>
        <div class="form-group">
            <label>Stroke Thickness <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.strokeThickness" min="0" step="0.1" placeholder="Default" value="${ts.strokeThickness ?? ""}">
        </div>
        <div class="form-group">
            <label>Drop Shadow</label>
            <input type="checkbox" name="flags.${MODULE_ID}.textStyle.dropShadow" ${(ts.dropShadow ?? true) ? "checked" : ""}>
        </div>
        <div class="form-group">
            <label>Drop Shadow Blur <span class="units">(Pixels)</span></label>
            <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowBlur" min="0" step="0.1" placeholder="Default" value="${ts.dropShadowBlur ?? ""}">
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
    `);

    const updateStrokeColorPlaceholder = (event) => {
        let textColor;

        if (event?.target.type === "color") {
            textColor = html.find(`input[data-edit="textColor"]`).val();
        } else {
            textColor = html.find(`input[name="textColor"]`).val();
        }

        const strokeColor = Color.from(textColor || "#ffffff").hsv[2] > 0.6 ? "#000000" : "#ffffff";

        html.find(`input[name="flags.advanced-drawing-tools.textStyle.stroke"]`).attr("placeholder", strokeColor);
        html.find(`input[data-edit="flags.advanced-drawing-tools.textStyle.stroke"]`).val(strokeColor);
    };

    updateStrokeColorPlaceholder();

    html.find(`input[name="textColor"],input[data-edit="textColor"]`).change(event => updateStrokeColorPlaceholder(event));

    const updateStrokeThicknessPlaceholder = () => {
        const fontSize = html.find(`input[name="fontSize"]`).val();

        html.find(`input[name="flags.advanced-drawing-tools.textStyle.strokeThickness"]`).attr(
            "placeholder",
            Math.max(Math.round(fontSize / 32), 2)
        );
    };

    updateStrokeThicknessPlaceholder();

    html.find(`input[name="fontSize"]`).change(event => updateStrokeThicknessPlaceholder(event));

    const updateDropShadowBlurPlaceholder = () => {
        const fontSize = html.find(`input[name="fontSize"]`).val();

        html.find(`input[name="flags.advanced-drawing-tools.textStyle.dropShadowBlur"]`).attr(
            "placeholder",
            Math.max(Math.round(fontSize / 16), 2)
        );
    };

    updateDropShadowBlurPlaceholder();

    html.find(`input[name="fontSize"]`).change(event => updateDropShadowBlurPlaceholder(event));

    app.options.height = "auto";
    app.position.height = "auto";
    app.setPosition(app.position);
});
