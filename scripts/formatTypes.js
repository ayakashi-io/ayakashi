const execFile = require("child_process").execFile;
const fs = require("fs");

async function format() {
    const filePaths = await getFiles();
    filePaths.forEach(formatFile);
}

function getFiles() {
    return new Promise(function(resolve, reject) {
        execFile("find", ["lib/"], function(err, stdout) {
            if (err) return reject(err);
            const list = stdout.split("\n");
            const fileList = list.filter(entry => {
                if (entry && !fs.lstatSync(entry).isDirectory()) {
                    return entry;
                }
            });
            resolve(fileList);
        });
    });
}

function formatFile(filePath) {
    const file = fs.readFileSync(filePath, "utf8");
    const lines = file.split("\n");
    let inCommentBlock = false;

    const formattedLines = lines.map(function(line) {
        if (inCommentBlock && !line.includes("*/")) {
            if (line.includes("```")) {
                return line.replace(/^\s+/g, "");
            } else {
                return line.replace(/^\s{4}/g, "");
            }
        } else if (line.includes("/**")) {
            inCommentBlock = true;
            return line.replace(/^\s{4}/g, "");
        } else if (line.includes("*/")) {
            inCommentBlock = false;
            return line.replace(/^\s{4}/g, "");
        } else {
            return line;
        }
    });

    fs.writeFileSync(filePath, formattedLines.join("\n"));
}

format();
