module.exports = async function(_input, params) {
    return {page: `http://localhost:${params.staticServerPort}/json`};
};
