import { MODULE_ID } from "./const.mjs";
import { cleanData, saveValue, stringifyValue } from "./utils.mjs";

Hooks.once("libWrapper.Ready", () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.applications.sheets.DrawingConfig.prototype._processFormData",
        function (wrapped, event, form, formData) {
            const data = foundry.utils.flattenObject(wrapped(event, form, formData));

            if (form.querySelector(`input[class="${MODULE_ID}--lineStyle-dash"]`).checked) {
                data[`flags.${MODULE_ID}.lineStyle.dash`] = [
                    Number(data[`flags.${MODULE_ID}.lineStyle.dash`][0]) || 8,
                    Number(data[`flags.${MODULE_ID}.lineStyle.dash`][1]) || 5,
                ];
            } else {
                data[`flags.${MODULE_ID}.lineStyle.dash`] = null;
            }

            const processValue = (name) => {
                data[name] = saveValue(data[name]);
            };

            processValue(`flags.${MODULE_ID}.fillStyle.texture.width`);
            processValue(`flags.${MODULE_ID}.fillStyle.texture.height`);
            processValue(`flags.${MODULE_ID}.fillStyle.transform.position.x`);
            processValue(`flags.${MODULE_ID}.fillStyle.transform.position.y`);
            processValue(`flags.${MODULE_ID}.fillStyle.transform.pivot.x`);
            processValue(`flags.${MODULE_ID}.fillStyle.transform.pivot.y`);
            processValue(`flags.${MODULE_ID}.textStyle.wordWrapWidth`);

            const processStringArray = (name) => {
                if (data[name] == null) {
                    data[name] = [];
                } else if (!Array.isArray(data[name])) {
                    data[name] = [data[name]];
                }

                if (data[name].every((v) => !v)) {
                    data[name] = null;
                }
            };

            const processNumberArray = (name) => {
                if (data[name] == null) {
                    data[name] = [];
                } else if (!Array.isArray(data[name])) {
                    data[name] = [data[name]];
                }

                if (data[name].every((v) => v === null)) {
                    data[name] = null;
                }
            };

            processStringArray(`flags.${MODULE_ID}.textStyle.fill`);
            processNumberArray(`flags.${MODULE_ID}.textStyle.fillGradientStops`);

            return foundry.utils.expandObject(cleanData(data, { deletionKeys: !this.options.configureDefault }));
        },
        libWrapper.WRAPPER,
    );
});

Hooks.on("renderDrawingConfig", (app, html) => {
    const document = app.document;
    const ls = document.getFlag(MODULE_ID, "lineStyle") ?? {};
    const fs = document.getFlag(MODULE_ID, "fillStyle") ?? {};
    const ts = document.getFlag(MODULE_ID, "textStyle") ?? {};

    html.querySelector(`[name="text"]`).insertAdjacentHTML("afterend", `<textarea name="text"></textarea>`);
    html.querySelector(`[name="text"]`).remove();
    html.querySelector(`[name="text"]`).textContent = document.text ?? "";

    html.querySelector(`[name="strokeWidth"]`).closest(".form-group").insertAdjacentHTML("afterend", `
        <div class="form-group">
            <label>Dashed <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <label>Dash</label>
                <input type="number" name="flags.${MODULE_ID}.lineStyle.dash" min="0.1" step="0.1" placeholder="8" value="${Handlebars.Utils.escapeExpression(ls.dash?.[0] ?? "8")}">
                <label>Gap</label>
                <input type="number" name="flags.${MODULE_ID}.lineStyle.dash" min="0.1" step="0.1" placeholder="5" value="${Handlebars.Utils.escapeExpression(ls.dash?.[1] ?? "5")}">
                <input type="checkbox" class="${MODULE_ID}--lineStyle-dash" ${ls.dash ? "checked" : ""}>
            </div>
        </div>
    `);

    html.querySelector(`div[data-tab="fill"]`).insertAdjacentHTML("beforeend", `
        <div class="form-group slim">
            <label>Texture Size <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.width" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Width" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.texture?.width) ?? "")}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.texture.height" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="Height" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.texture?.height) ?? "")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Texture Position <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.position.x" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.transform?.position?.x) ?? "0px")}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.position.y" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.transform?.position?.y) ?? "0px")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Texture Pivot <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.pivot.x" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.transform?.pivot?.x) ?? "0px")}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.pivot.y" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="0px" value="${Handlebars.Utils.escapeExpression(stringifyValue(fs.transform?.pivot?.y) ?? "0px")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Texture Scale</label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.scale.x" data-dtype="Number" placeholder="1" value="${Handlebars.Utils.escapeExpression(fs.transform?.scale?.x ?? "1")}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.scale.y" data-dtype="Number" placeholder="1" value="${Handlebars.Utils.escapeExpression(fs.transform?.scale?.y ?? "1")}">
            </div>
        </div>
        <div class="form-group">
            <label>Texture Rotation <span class="units">(Degrees)</span></label>
            <div class="form-fields">
                <range-picker type="text" name="flags.${MODULE_ID}.fillStyle.transform.rotation" min="0" max="360" step="1" placeholder="0" value="${Handlebars.Utils.escapeExpression(fs.transform?.rotation ?? "0")}"></range-picker>
            </div>
        </div>
        <div class="form-group slim">
            <label>Texture Skew <span class="units">(Degrees)</span></label>
            <div class="form-fields">
                <label>X</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.skew.x" data-dtype="Number" placeholder="0" value="${Handlebars.Utils.escapeExpression(fs.transform?.skew?.x ?? "0")}">
                <label>Y</label>
                <input type="text" name="flags.${MODULE_ID}.fillStyle.transform.skew.y" data-dtype="Number" placeholder="0" value="${Handlebars.Utils.escapeExpression(fs.transform?.skew?.y ?? "0")}">
            </div>
        </div>
    `);

    html.querySelector(`div[data-tab="text"]`).classList.add("scrollable");

    html.querySelector(`[name="fontFamily"]`).closest(".form-group").insertAdjacentHTML("afterend", `
        <div class="form-group">
            <label>Font Style</label>
            <div class="form-fields">
                <select name="flags.${MODULE_ID}.textStyle.fontStyle">
                    <option value="normal" ${ts.fontStyle === "normal" || ts.fontStyle == null ? "selected" : ""}>Normal</option>
                    <option value="italic" ${ts.fontStyle === "italic" ? "selected" : ""}>Italic</option>
                    <option value="oblique" ${ts.fontStyle === "oblique" ? "selected" : ""}>Oblique</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Font Variant</label>
            <div class="form-fields">
                <select name="flags.${MODULE_ID}.textStyle.fontVariant">
                    <option value="normal" ${ts.fontVariant === "normal" || ts.fontVariant == null ? "selected" : ""}>Normal</option>
                    <option value="small-caps" ${ts.fontVariant === "small-caps" ? "selected" : ""}>Small Caps</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Font Weight</label>
            <div class="form-fields">
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
        </div>
    `);

    html.querySelector(`[name="fontSize"]`).closest(".form-group").insertAdjacentHTML("afterend", `
        <div class="form-group slim">
            <label>Leading <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.textStyle.leading" min="0" step="0.1" placeholder="0" value="${Handlebars.Utils.escapeExpression(ts.leading ?? "0")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Letter Spacing <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.textStyle.letterSpacing" min="0" step="0.1" placeholder="0" value="${Handlebars.Utils.escapeExpression(ts.letterSpacing ?? "0")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Word Wrap Width <span class="units">(Pixels or %)</span></label>
            <div class="form-fields">
                <input type="text" name="flags.${MODULE_ID}.textStyle.wordWrapWidth" pattern="\\s*(\\d*\\.?\\d+)\\s*(px|%)?\\s*" placeholder="100%" value="${Handlebars.Utils.escapeExpression(stringifyValue(ts.wordWrapWidth) ?? "100%")}">
            </div>
        </div>
    `);

    html.querySelector(`[name="textColor"]`).closest(".form-fields").insertAdjacentHTML("beforeend", `
        <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="" data-tooltip="Color Stop" value="${Handlebars.Utils.escapeExpression(ts?.fillGradientStops?.[0] ?? "")}">
        <a data-tooltip="Add Color" class="${MODULE_ID}--textStyle-fill--add" style="flex: 0;"><i class="fas fa-plus fa-fw" style="margin: 0;"></i></a>
        <a data-tooltip="Remove Color" class="${MODULE_ID}--textStyle-fill--remove" style="flex: 0;"><i class="fas fa-minus fa-fw" style="margin: 0;"></i></a>
    `);
    html.querySelector(`a[class="${MODULE_ID}--textStyle-fill--add"]`).addEventListener("click", (event) => {
        html.querySelector(`[name="textColor"]`).closest(".form-group").insertAdjacentElement("afterend", createTextColor(
            html.querySelector(`[name="textColor"]`).value,
            html.querySelector(`[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).value,
        ));
    });
    html.querySelector(`a[class="${MODULE_ID}--textStyle-fill--remove"]`).addEventListener("click", (event) => {
        html.querySelector(`[name="textColor"],input[data-edit="textColor"]`).value = html.querySelector(`input[name="flags.${MODULE_ID}.textStyle.fill"]`)?.value || "#ffffff";
        html.querySelector(`[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`).value = html.querySelectorAll(`input[name="flags.${MODULE_ID}.textStyle.fillGradientStops"]`)[1]?.value ?? "";
        html.querySelector(`[name="flags.${MODULE_ID}.textStyle.fill"]`)?.closest(".form-group").remove();
    });

    const createTextColor = (fill, stop) => {
        const group = window.document.createElement("div");

        group.classList.add("form-group");
        group.innerHTML = `
            <label></label>
            <div class="form-fields">
                <color-picker name="flags.${MODULE_ID}.textStyle.fill" placeholder="#ffffff" value="${Handlebars.Utils.escapeExpression(fill || "#ffffff")}"></color-picker>
                <input type="number" name="flags.${MODULE_ID}.textStyle.fillGradientStops" min="0" max="1" step="0.001" placeholder="" data-tooltip="Color Stop" value="${Handlebars.Utils.escapeExpression(stop ?? "")}">
                <a data-tooltip="Add Color" style="flex: 0;"><i class="fas fa-plus fa-fw" style="margin: 0;"></i></a>
                <a data-tooltip="Remove Color" style="flex: 0;"><i class="fas fa-minus fa-fw" style="margin: 0;"></i></a>
            </div>
        `;

        const [add, remove] = group.querySelectorAll(`a`);

        add.addEventListener("click", (event) => {
            event.target.closest(".form-group").insertAdjacentElement("afterend", createTextColor(
                group.querySelector(`color-picker`).value,
                group.querySelector(`input`).value,
            ));
        });
        remove.addEventListener("click", (event) => {
            event.target.closest(".form-group").remove();
        });

        return group;
    };

    if (ts.fill) {
        const fill = Array.isArray(ts.fill) ? ts.fill : [ts.fill];

        for (let i = fill.length - 1; i >= 0; i--) {
            html.querySelector(`[name="textColor"]`).closest(".form-group").insertAdjacentElement(
                "afterend",
                createTextColor(fill[i], ts?.fillGradientStops?.[i + 1]),
            );
        }
    }

    html.querySelector(`[name="textAlpha"]`).closest(".form-group").insertAdjacentHTML("beforebegin", `
        <div class="form-group">
            <label>Text Color Gradient</label>
            <div class="form-fields">
                <select name="flags.${MODULE_ID}.textStyle.fillGradientType" data-dtype="Number">
                    <option value="0" ${ts.fillGradientType === 0 || ts.fillGradientType == null ? "selected" : ""}>Vertical</option>
                    <option value="1" ${ts.fillGradientType === 1 ? "selected" : ""}>Horizontal</option>
                </select>
            </div>
        </div>
    `);

    html.querySelector(`[name="textAlpha"]`).closest(".form-group").insertAdjacentHTML("afterend", `
        <div class="form-group">
            <label>Text Alignment</label>
            <div class="form-fields">
                <select name="flags.${MODULE_ID}.textStyle.align">
                    <option value="" ${ts.align == null ? "selected" : ""}>Default</option>
                    <option value="left" ${ts.align === "left" || ts.align === "justify" ? "selected" : ""}>Left</option>
                    <option value="center" ${ts.align === "center" ? "selected" : ""}>Center</option>
                    <option value="right" ${ts.align === "right" ? "selected" : ""}>Right</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Stroke Color</label>
            <div class="form-fields">
                <color-picker name="flags.${MODULE_ID}.textStyle.stroke" placeholder="Automatic" value="${Handlebars.Utils.escapeExpression(ts.stroke || "")}"></color-picker>
            </div>
        </div>
        <div class="form-group slim">
            <label>Stroke Thickness <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.textStyle.strokeThickness" min="0" step="0.1" value="${Handlebars.Utils.escapeExpression(ts.strokeThickness ?? "")}">
            </div>
        </div>
        <div class="form-group">
            <label>Drop Shadow</label>
            <div class="form-fields">
                <input type="checkbox" name="flags.${MODULE_ID}.textStyle.dropShadow" ${(ts.dropShadow ?? true) ? "checked" : ""}>
            </div>
        </div>
        <div class="form-group slim">
            <label>Drop Shadow Blur <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowBlur" min="0" step="1" value="${Handlebars.Utils.escapeExpression(ts.dropShadowBlur ?? "")}">
            </div>
        </div>
        <div class="form-group slim">
            <label>Drop Shadow Distance <span class="units">(Pixels)</span></label>
            <div class="form-fields">
                <input type="number" name="flags.${MODULE_ID}.textStyle.dropShadowDistance" min="0" step="1" placeholder="0" value="${Handlebars.Utils.escapeExpression(ts.dropShadowDistance ?? "0")}">
            </div>
        </div>
        <div class="form-group">
            <label>Drop Shadow Angle <span class="units">(Degrees)</span></label>
            <div class="form-fields">
                <range-picker name="flags.${MODULE_ID}.textStyle.dropShadowAngle" step="1" min="0" max="360" placeholder="0" value="${Handlebars.Utils.escapeExpression(ts.dropShadowAngle ?? "0")}"></range-picker>
            </div>
        </div>
        <div class="form-group">
            <label>Drop Shadow Color</label>
            <div class="form-fields">
                <color-picker name="flags.${MODULE_ID}.textStyle.dropShadowColor" placeholder="#000000" value="${Handlebars.Utils.escapeExpression(ts.dropShadowColor || "#000000")}"></color-picker>
            </div>
        </div>
        <div class="form-group">
            <label>Drop Shadow Alpha</label>
            <div class="form-fields">
                <range-picker name="flags.${MODULE_ID}.textStyle.dropShadowAlpha" min="0" max="1" step="0.1" value="${Handlebars.Utils.escapeExpression(ts.dropShadowAlpha ?? "1")}"></range-picker>
            </div>
        </div>
        <div class="form-group">
            <label>Arc <span class="units">(Degrees)</span></label>
            <div class="form-fields">
                <range-picker name="flags.${MODULE_ID}.textStyle.arc" step="1" min="-360" max="360" placeholder="0" value="${Handlebars.Utils.escapeExpression(ts.arc ?? "0")}"></range-picker>
            </div>
        </div>
    `);

    const updateStrokeThicknessPlaceholder = () => {
        const fontSize = html.querySelector(`[name="fontSize"]`).value;

        html.querySelector(`[name="flags.${MODULE_ID}.textStyle.strokeThickness"]`).placeholder = Math.max(Math.round(fontSize / 32), 2);
    };

    updateStrokeThicknessPlaceholder();

    html.querySelector(`[name="fontSize"]`).addEventListener("change", updateStrokeThicknessPlaceholder);

    const updateDropShadowBlurPlaceholder = () => {
        const fontSize = html.querySelector(`[name="fontSize"]`).value;

        html.querySelector(`[name="flags.${MODULE_ID}.textStyle.dropShadowBlur"]`).placeholder = Math.max(Math.round(fontSize / 16), 2);
    };

    updateDropShadowBlurPlaceholder();

    html.querySelector(`[name="fontSize"]`).addEventListener("change", updateDropShadowBlurPlaceholder);
});
