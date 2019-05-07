const jsonDoc = require("../doc.json");
const fs = require("fs");

const coreActions = jsonDoc.children
    .filter(ch => ch.name === "\"../prelude/prelude\"")[0]
    .children[0]
    .children
    .map(ch => {
        return {
            name: ch.name,
            description: ch.comment ? buildText(ch.comment.shortText) : [],
            signature: buildSignature(ch.type.declaration.signatures[0])
        };
    });

function buildSignature(signature) {
    let stringSignature = "(";
    stringSignature += signature.parameters.map(p => {
        if (p.type.type === "union") {
            return p.type.types.reduce((acc, val, i) => {
                if (val.type === "array") {
                    return val.elementType.name + "[]";
                } else {
                    if (i === 0) {
                        return p.name + (p.flags.isOptional ? "?: " : ": ") + val.name;
                    } else {
                        return acc + " | " + val.name;
                    }
                }
            }, p.name + ": ");
        } else if (p.type.type === "reflection") {
            return p.name;
        } else {
            return p.name + (p.flags.isOptional ? "?: " : ": ") + p.type.name;
        }
    }).join(", ");
    stringSignature += ") => ";
    stringSignature += signature.type.name;
    //Promise<type> parsing
    //generic promises will just return "Promise"
    if (signature.type.typeArguments && signature.type.typeArguments[0].name !== "T") {
        stringSignature += "<";
        stringSignature += signature.type.typeArguments.map(t => {
            return t.name;
        }).join(" | ") || "{}";
        stringSignature += ">";
    }

    return stringSignature;
}

function buildText(text) {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
    const lines = text.split("\n");
    const finalText = [];
    let inCodeBlock = false;
    let currentCodeBlock = null;
    lines.forEach(function(line) {
        if (inCodeBlock && !line.includes("```")) {
            currentCodeBlock.text += (line + "\n");
        } else if (line.includes("```js")) {
            inCodeBlock = true;
            currentCodeBlock = {
                text: "",
                type: "code"
            };
            finalText.push(currentCodeBlock);
        } else if (line.includes("```")) {
            inCodeBlock = false;
            currentCodeBlock = null;
        } else {
            //formats links to an "a" html tag
            //works only for the first link per line
            const link = line.match(urlRegex);
            if (link && link[0]) {
                line = line.replace(
                    link[0],
                    `<a href="${link[0]}">${link[0]}</a>`
                );
            }
            finalText.push({
                text: line,
                type: "text"
            });
        }
    });

    return finalText;
}

fs.writeFileSync("./core_actions.json", JSON.stringify(coreActions, null, 4));
