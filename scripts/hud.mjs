import { MODULE_ID, MODULE_NAME } from "./const.mjs";

Hooks.on("renderDrawingHUD", (hud, html) => {
    const edit = document.createElement("button");

    edit.setAttribute("type", "button");
    edit.classList.add("control-icon");
    edit.classList.toggle("active", hud.object._editMode);
    edit.dataset.tooltip = "Edit";
    edit.dataset.action = `${MODULE_ID}.edit`;
    edit.innerHTML = `<i class="fas fa-draw-polygon"></i>`;

    html.querySelector(".col.left").append(edit);
    html.querySelector(`.control-icon[data-action="${MODULE_ID}.edit"]`).addEventListener("click", async (event) => {
        await unlockDrawing(hud.object);

        const drawing = hud.object;

        if (drawing.document.locked) {
            return;
        }

        await drawing._convertToPolygon({ confirm: true });

        if (drawing.document.shape.type === "p") {
            drawing._toggleEditMode();
            hud.render(true);
        }
    });

    if (hud.object.document.shape.type === "p") {
        const flipH = document.createElement("button");

        flipH.setAttribute("type", "button");
        flipH.classList.add("control-icon");
        flipH.dataset.tooltip = "Flip horizontally";
        flipH.dataset.action = `${MODULE_ID}.flip-h`;
        flipH.innerHTML = `<i class="fas fa-arrows-alt-h"></i>`;

        html.querySelector(".col.left").append(flipH);
        html.querySelector(`.control-icon[data-action="${MODULE_ID}.flip-h"]`).addEventListener("click", async (event) => {
            await unlockDrawing(hud.object);

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

        const flipV = document.createElement("button");

        flipV.setAttribute("type", "button");
        flipV.classList.add("control-icon");
        flipV.dataset.tooltip = "Flip vertically";
        flipV.dataset.action = `${MODULE_ID}.flip-v`;
        flipV.innerHTML = `<i class="fas fa-arrows-alt-v"></i>`;

        html.querySelector(".col.left").append(flipV);
        html.querySelector(`.control-icon[data-action="${MODULE_ID}.flip-v"]`).addEventListener("click", async (event) => {
            await unlockDrawing(hud.object);

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

async function unlockDrawing(drawing) {
    if (drawing.document.locked) {
        const unlock = await foundry.applications.api.DialogV2.confirm({
            window: { title: `${MODULE_NAME}: Unlock Drawing` },
            content: `<p>Unlock this Drawing?</p>`,
        });

        if (!unlock) {
            return;
        }
    }

    await drawing.document.update({ locked: false });
}
