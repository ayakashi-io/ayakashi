const fs = require("fs");
const path = require("path");

const flatten = arr => arr.reduce((acc, val) =>
    acc.concat(Array.isArray(val) ? flatten(val) : val), []);

//eslint-disable-next-line
Array.prototype.flatten = function() {
    return flatten(this);
};

function walk(dir) {
    return fs.readdirSync(dir)
        .map(file => fs.statSync(path.join(dir, file)).isDirectory()
            ? walk(path.join(dir, file))
            : path.join(dir, file).replace(/\\/g, "/")).flatten();
}

const files = walk("./src").concat(walk("./__tests__"));

let typoCount = 0;
const filesWithTypo = [];

files.forEach(function(file) {
    const content = fs.readFileSync(file, "utf8");
    if (content.match(/scrapper/gi)) {
        typoCount += (content.match(/scrapper/gi) || []).length;
        filesWithTypo.push(file);
    }
});

//there are already 11 typos on the deprecation warnings
if (typoCount > 11) {
    console.error(`${typoCount - 11} typo(s) found on these files:`);
    console.error(filesWithTypo);
    process.exit(1);
}
