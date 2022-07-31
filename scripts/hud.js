import { MODULE_ID, MODULE_NAME } from "./const.js";

Hooks.on("renderDrawingHUD", (hud, html) => {
    const edit = document.createElement("div");

    edit.classList.add("control-icon");

    if (hud.object._editMode) {
        edit.classList.add("active");
    }

    edit.setAttribute("title", "Edit");
    edit.dataset.action = `${MODULE_ID}.edit`;
    edit.innerHTML = `<i class="fas fa-draw-polygon"></i>`;

    html.find(".col.left").append(edit);
    html.find(`.control-icon[data-action="${MODULE_ID}.edit"]`).click(async event => {
        await unlockDrawing(hud);

        const drawing = hud.object;

        if (drawing.document.locked) {
            return;
        }

        await drawing._convertToPolygon({ confirm: true });

        if (drawing.document.shape.type === CONST.DRAWING_TYPES.POLYGON) {
            drawing._toggleEditMode();
            hud.render(true);
        }
    });

    if (hud.object.document.shape.type === CONST.DRAWING_TYPES.POLYGON) {
        const flipH = document.createElement("div");

        flipH.classList.add("control-icon");
        flipH.setAttribute("title", "Flip horizontally");
        flipH.dataset.action = `${MODULE_ID}.flip-h`;
        flipH.innerHTML = `<i class="fas fa-arrows-alt-h"></i>`;

        html.find(".col.left").append(flipH);
        html.find(`.control-icon[data-action="${MODULE_ID}.flip-h"]`).click(async event => {
            await unlockDrawing(hud);

            if (hud.object.document.locked) {
                return;
            }

            const document = hud.object.document;
            const width = Math.abs(document.shape.width);
            const points = foundry.utils.deepClone(document.shape.points);

            for (let i = 0; i < points.length; i += 2) {
                points[i] = width - points[i];
            }

            await document.update({ shape: { points } });
        });

        const flipV = document.createElement("div");

        flipV.classList.add("control-icon");
        flipV.setAttribute("title", "Flip vertically");
        flipV.dataset.action = `${MODULE_ID}.flip-v`;
        flipV.innerHTML = `<i class="fas fa-arrows-alt-v"></i>`;

        html.find(".col.left").append(flipV);
        html.find(`.control-icon[data-action="${MODULE_ID}.flip-v"]`).click(async event => {
            await unlockDrawing(hud);

            if (hud.object.document.locked) {
                return;
            }

            const document = hud.object.document;
            const height = Math.abs(document.shape.height);
            const points = foundry.utils.deepClone(document.shape.points);

            for (let i = 1; i < points.length; i += 2) {
                points[i] = height - points[i];
            }

            await document.update({ shape: { points } });
        });
    }
});

async function unlockDrawing(hud) {
    return await new Promise(resolve => {
        if (hud.object.document.locked) {
            new Dialog({
                title: `${MODULE_NAME}: Unlock Drawing`,
                content: `<p>Unlock this Drawing?</p>`,
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
            resolve(false);
        }
    }).then(async result => {
        if (!result) {
            return;
        }

        await hud.object.document.update({ locked: false });
        hud.render(true);
    });
}
