export function replaceLastUrlPart(url: string, newPart: string): string {
    if (!url || !newPart) {
        throw new Error("Parameters should be non null.");
    }
    var split = url.split('/');
    if (!split || split.length<2) {
        throw new Error("Url parameter doesn't look like a url.");
    }
    split.splice(-1, 1, newPart);
    var result = split.join('/');
    if (result === url) {
        throw new Error('Output should NOT be same as input.');
    }
    console.log(result);
    return result;
}