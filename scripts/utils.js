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

export function cleanData(data, { inplace = false, deletionKeys = false, keepOthers = true, partial = false }) {
    const flatData = foundry.utils.flattenObject(data);
    let newData = {};

    if (deletionKeys || inplace) {
        for (const key of (partial ? [] : Object.keys(DEFAULT_FLAGS)).concat(Object.keys(flatData))) {
            if (!(key.startsWith(`flags.${MODULE_ID}.`) && !key.includes(".-="))) {
                continue;
            }

            const split = key.split(".");

            for (let i = partial ? split.length - 1 : 1; i < split.length; i++) {
                newData[`${split.slice(0, i).join(".")}.-=${split[i]}`] = null;
            }
        }
    }

    for (let [key, value] of Object.entries(flatData)) {
        if (!(key.startsWith(`flags.${MODULE_ID}.`) && !key.includes(".-="))) {
            if (keepOthers && !inplace) {
                newData[key] = value;
            }

            continue;
        }

        if (!(key in DEFAULT_FLAGS)) {
            continue;
        }

        const defaultValue = DEFAULT_FLAGS[key];
        const normalizeValue = value => {
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

            return value;
        };

        if (value instanceof Array) {
            value = value.map(normalizeValue);
        } else {
            value = normalizeValue(value);
        }

        if (value != null && value !== defaultValue && !value.equals?.(defaultValue)) {
            newData[key] = value;

            if (deletionKeys || inplace) {
                const split = key.split(".");

                for (let i = 1; i < split.length; i++) {
                    delete newData[`${split.slice(0, i).join(".")}.-=${split[i]}`];
                }
            }
        } else if (!deletionKeys) {
            newData[key] = foundry.utils.deepClone(defaultValue);
        }
    }

    if (deletionKeys || inplace) {
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

    newData = foundry.utils.expandObject(Object.fromEntries(Object.entries(newData).sort((a, b) => b[0].length - a[0].length)));

    if (!inplace) {
        return newData;
    }

    foundry.utils.mergeObject(data, newData, { performDeletions: true });

    if (deletionKeys) {
        foundry.utils.mergeObject(data, newData);
    }

    if (!keepOthers) {
        foundry.utils.filterObject(data, foundry.utils.expandObject(DEFAULT_FLAGS));
    }

    return data;
}
