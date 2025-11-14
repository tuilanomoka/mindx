async function loadMathLive() {
    const mathlive = await import('https://cdn.jsdelivr.net/npm/mathlive/dist/mathlive.min.mjs');
    return mathlive;
}