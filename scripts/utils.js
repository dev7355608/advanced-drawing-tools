import { DEFAULT_FLAGS, MODULE_ID } from "./const.js";

export function parseValue(value) {
    if (value == null) {
        return null;
    }

    let unit;

    if (typeof value === "object") {
        unit = value.unit || "px";
        value = value.value;
    } else if (typeof value === "array") {
        unit = value[1] || "px";
        value = value[0];
    } else if (typeof value === "string") {
        value = value.match(/^\s*([+-]?\d*\.?\d+)\s*(px|%)?\s*$/i);

        if (!value) {
            return null;
        }

        unit = value[2] || "px";
        value = parseFloat(value[1]);
    } else if (typeof value === "number") {
        unit = "px";
    }

    if (value == null || unit == null) {
        return null;
    }

    return { value, unit };
}

export function calculateValue(value, base) {
    value = parseValue(value);

    if (!value) {
        return null;
    }

    const unit = value.unit;

    value = value.value;

    if (unit === "%") {
        return base * (value / 100);
    }

    return value;
}

export function stringifyValue(value) {
    value = parseValue(value);

    if (!value) {
        return null;
    }

    const unit = value.unit;

    value = value.value;

    if (unit === "%") {
        return `${value}%`;
    }

    return `${value}px`;
}

export function saveValue(value) {
    value = parseValue(value);

    if (!value) {
        return null;
    }

    const unit = value.unit;

    value = value.value;

    if (unit === "%") {
        return `${value}%`;
    }

    return value;
}

export function cleanData(data, type) {
    data = foundry.utils.flattenObject(data);

    const defaultFlags = DEFAULT_FLAGS[type];
    const newData = {};
    let deleteAll = true;

    for (const key of Object.keys(defaultFlags).concat(Object.keys(data))) {
        if (!key.startsWith(`flags.${MODULE_ID}.`)) {
            continue;
        }

        const split = key.split(".");

        for (let i = 2; i < split.length; i++) {
            newData[`${split.slice(0, i).join(".")}.-=${split[i]}`] = null;
        }
    }

    for (let [key, value] of Object.entries(data)) {
        if (!key.startsWith(`flags.${MODULE_ID}.`)) {
            newData[key] = value;

            continue;
        }

        if (!(key in defaultFlags)) {
            continue;
        }

        const defaultValue = defaultFlags[key];

        value = value ?? null;

        if (parseValue(defaultValue)) {
            value = saveValue(value);
        } else if (typeof value === "string") {
            if (!value) {
                value = null;
            } else {
                value = value.trim().toLowerCase();
            }
        }

        if (value !== defaultValue) {
            newData[key] = value;

            const split = key.split(".");

            for (let i = 2; i < split.length; i++) {
                delete newData[`${split.slice(0, i).join(".")}.-=${split[i]}`];
            }

            deleteAll = false;
        }
    }

    if (deleteAll) {
        newData[`flags.-=${MODULE_ID}`] = null;
    }

    // TODO: Remove once https://gitlab.com/foundrynet/foundryvtt/-/issues/6875 is fixed
    return Object.fromEntries(Object.entries(newData).sort((a, b) => b[0].length - a[0].length));
}
