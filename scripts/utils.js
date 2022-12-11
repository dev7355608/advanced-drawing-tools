import { DEFAULT_FLAGS, MODULE_ID } from "./const.js";

export function parseValue(value) {
    if (value == null) {
        return null;
    }

    let unit;

    if (typeof value === "string") {
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

export function cleanData(data, deletionKeys = true) {
    data = foundry.utils.flattenObject(data);

    const newData = {};

    if (deletionKeys) {
        for (const key of Object.keys(DEFAULT_FLAGS).concat(Object.keys(data))) {
            if (!key.startsWith(`flags.${MODULE_ID}.`)) {
                continue;
            }

            const split = key.split(".");

            for (let i = 1; i < split.length; i++) {
                newData[`${split.slice(0, i).join(".")}.-=${split[i]}`] = null;
            }
        }
    }

    for (let [key, value] of Object.entries(data)) {
        if (!key.startsWith(`flags.${MODULE_ID}.`)) {
            newData[key] = value;

            continue;
        }

        if (!(key in DEFAULT_FLAGS)) {
            continue;
        }

        const defaultValue = DEFAULT_FLAGS[key];

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

        if (value !== defaultValue && value !== null) {
            newData[key] = value;

            if (deletionKeys) {
                const split = key.split(".");

                for (let i = 1; i < split.length; i++) {
                    delete newData[`${split.slice(0, i).join(".")}.-=${split[i]}`];
                }
            }
        }
    }

    if (deletionKeys) {
        for (const key in newData) {
            if (!key.startsWith(`flags.${MODULE_ID}.`) && !key.startsWith(`flags.-=${MODULE_ID}`)) {
                continue;
            }

            const split = key.split(".");

            if (!split[split.length - 1].startsWith("-=")) {
                continue;
            }

            const prefix = `${split.slice(0, split.length - 1).join(".")}.${split[split.length - 1].slice(2)}.`;

            delete newData[prefix.slice(0, prefix.length - 1)];

            for (const otherKey in newData) {
                if (!otherKey.startsWith(prefix)) {
                    continue;
                }

                delete newData[otherKey];
            }
        }
    }

    return foundry.utils.expandObject(Object.fromEntries(Object.entries(newData).sort((a, b) => b[0].length - a[0].length)));
}
