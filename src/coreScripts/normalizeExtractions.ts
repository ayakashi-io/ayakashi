type Extraction = {
    [key: string]: {
        [key: string]: unknown
    }[]
};

type NormalizedExtraction = {
    [key: string]: unknown
}[];

export default function(
    input: Extraction
): NormalizedExtraction {
    if (!input) return [];
    if (typeof input !== "object") return [];
    const output: NormalizedExtraction = [];
    Object.entries(input).forEach(function([propName, entry]) {
        if (!entry) return;
        if (!Array.isArray(entry)) return;
        entry.forEach(function(extraction, index) {
            const nExtraction: {
                [key: string]: unknown
            } = {};
            Object.entries(extraction).forEach(function(e) {
                nExtraction[e[0]] = e[1];
            });
            if (!output[index]) output[index] = {};
            Object.keys(output[index]).forEach(function(key) {
                if (key in nExtraction) {
                    nExtraction[`${propName}_${key}`] = nExtraction[key];
                    delete nExtraction[key];
                }
            });
            output[index] = {...nExtraction, ...output[index]};
        });
    });
    return output;
}
