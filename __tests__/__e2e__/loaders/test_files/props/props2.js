Object.defineProperty(exports, "__esModule", {value: true});

function default_1(ayakashi) {
    ayakashi
        .select("author")
        .where({itemprop: {eq: "author"}});
}

exports.default = default_1;
