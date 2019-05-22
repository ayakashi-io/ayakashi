const hexCharacters = "a-f\\d";
const match3or4Hex = `#?[${hexCharacters}]{3}[${hexCharacters}]?`;
const match6or8Hex = `#?[${hexCharacters}]{6}([${hexCharacters}]{2})?`;
const nonHexChars = new RegExp(`[^#${hexCharacters}]`, "gi");
const validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, "i");

export function handleStyleColors(val: string | string[]): string | string[] {
    //handle array of colors (for in/nin)
    if (Array.isArray(val)) {
        //@ts-ignore
        return val.map(handleStyleColors);
    }

    //invalid color
    if (typeof val !== "string" || val.length === 0) {
        return "";
    }

    //handle hex colors
    if (!nonHexChars.test(val) && validHexSize.test(val)) {
        let hex = val.replace(/^#/, "");

        if (hex.length === 8) {
            hex = hex.slice(0, 6);
        }

        if (hex.length === 4) {
            hex = hex.slice(0, 3);
        }

        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        const num = parseInt(hex, 16);
        //tslint:disable no-bitwise
        const red = num >> 16;
        const green = (num >> 8) & 255;
        const blue = num & 255;
        //tslint:enable no-bitwise

        return `rgb(${red}, ${green}, ${blue})`;
    }

    //format rgb colors
    if (val.match(/rgb\(/)) {
        const rgb = val.replace("rgb(", "").replace(")", "").replace(/\s/g, "").split(",");
        return `rgb(${rgb.join(", ")})`;
    }

    //format rgba colors
    if (val.match(/rgba\(/)) {
        const rgba = val.replace("rgba(", "").replace(")", "").replace(/\s/g, "").split(",");
        return `rgba(${rgba.join(", ")})`;
    }

    //literal color
    return val;
}
