export const MODULE_ID = "advanced-drawing-tools";
export const MODULE_NAME = "Advanced Drawing Tools";
export const DEFAULT_FLAGS = {};

DEFAULT_FLAGS[CONST.DRAWING_TYPES.POLYGON] = DEFAULT_FLAGS[CONST.DRAWING_TYPES.FREEHAND] = Object.freeze({
    [`flags.${MODULE_ID}.fillStyle.texture.height`]: null,
    [`flags.${MODULE_ID}.fillStyle.texture.width`]: null,
    [`flags.${MODULE_ID}.fillStyle.transform.pivot.x`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.pivot.y`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.position.x`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.position.y`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.rotation`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.scale.x`]: 1,
    [`flags.${MODULE_ID}.fillStyle.transform.scale.y`]: 1,
    [`flags.${MODULE_ID}.fillStyle.transform.skew.x`]: 0,
    [`flags.${MODULE_ID}.fillStyle.transform.skew.y`]: 0,
    [`flags.${MODULE_ID}.lineStyle.alignment`]: 0.5,
    [`flags.${MODULE_ID}.lineStyle.cap`]: "butt",
    [`flags.${MODULE_ID}.lineStyle.dash`]: null,
    [`flags.${MODULE_ID}.lineStyle.join`]: "miter",
    [`flags.${MODULE_ID}.textStyle.align`]: "center",
    [`flags.${MODULE_ID}.textStyle.breakWords`]: false,
    [`flags.${MODULE_ID}.textStyle.dropShadow`]: true,
    [`flags.${MODULE_ID}.textStyle.dropShadowAlpha`]: 1,
    [`flags.${MODULE_ID}.textStyle.dropShadowAngle`]: 0,
    [`flags.${MODULE_ID}.textStyle.dropShadowBlur`]: null,
    [`flags.${MODULE_ID}.textStyle.dropShadowColor`]: "#000000",
    [`flags.${MODULE_ID}.textStyle.dropShadowDistance`]: 0,
    [`flags.${MODULE_ID}.textStyle.fontStyle`]: "normal",
    [`flags.${MODULE_ID}.textStyle.fontVariant`]: "normal",
    [`flags.${MODULE_ID}.textStyle.fontWeight`]: "normal",
    [`flags.${MODULE_ID}.textStyle.leading`]: 0,
    [`flags.${MODULE_ID}.textStyle.letterSpacing`]: 0,
    [`flags.${MODULE_ID}.textStyle.lineHeight`]: null,
    [`flags.${MODULE_ID}.textStyle.lineJoin`]: "miter",
    [`flags.${MODULE_ID}.textStyle.miterLimit`]: 10,
    [`flags.${MODULE_ID}.textStyle.padding`]: null,
    [`flags.${MODULE_ID}.textStyle.stroke`]: "#111111",
    [`flags.${MODULE_ID}.textStyle.strokeThickness`]: null,
    [`flags.${MODULE_ID}.textStyle.textBaseline`]: "alphabetic",
    [`flags.${MODULE_ID}.textStyle.trim`]: false,
    [`flags.${MODULE_ID}.textStyle.whiteSpace`]: "pre",
    [`flags.${MODULE_ID}.textStyle.wordWrap`]: true,
    [`flags.${MODULE_ID}.textStyle.wordWrapWidth`]: "150%"
});

DEFAULT_FLAGS[CONST.DRAWING_TYPES.RECTANGLE] = DEFAULT_FLAGS[CONST.DRAWING_TYPES.ELLIPSE] = Object.freeze(
    foundry.utils.flattenObject(
        foundry.utils.mergeObject(
            DEFAULT_FLAGS[CONST.DRAWING_TYPES.POLYGON],
            {
                [`flags.${MODULE_ID}.lineStyle.-=alignment`]: null
            },
            { inplace: false }
        )
    )
);

DEFAULT_FLAGS[CONST.DRAWING_TYPES.TEXT] = Object.freeze(
    foundry.utils.flattenObject(
        foundry.utils.mergeObject(
            DEFAULT_FLAGS[CONST.DRAWING_TYPES.RECTANGLE],
            {
                [`flags.${MODULE_ID}.textStyle.align`]: "left",
                [`flags.${MODULE_ID}.textStyle.wordWrap`]: false
            },
            { inplace: false }
        )
    )
);

Object.freeze(DEFAULT_FLAGS);
