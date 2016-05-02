/**
 * Remove dashes from a guid with length 36.
 * @param guid
 */
export function guidRemoveDashes(guid: string) {
    if (!guid)
        throw new Error("guidRemoveDashes: Empty guid");

    if (guid.length != 36)
        throw new Error("Guid '" + guid + "' has wrong length");

    return guid.replace(/-/g, "");
}

/**
 * Add dashes to a guid with length 32.
 * @param guid
 */
export function guidAddDashes(guid: string) {
    if (!guid)
        throw new Error("guidAddDashes: Empty guid");

    if (guid.length != 32)
        throw new Error("Guid '" + guid + "' has wrong length");

    return guid.substring(0, 8)
        + "-" + guid.substring(8, 12)
        + "-" + guid.substring(12, 16)
        + "-" + guid.substring(16, 20)
        + "-" + guid.substring(20);
}

/**
 * Generate a guid, by default with dashes (length 36). Pass skipDashes
 * to get a guid without them (length 32).
 * @param skipDashes
 */
export function newGuid(skipDashes?: boolean) {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    var separator = "";
    if (!skipDashes)
        separator = '-';

    return s4() + s4() + separator + s4() + separator + s4() + separator +
        s4() + separator + s4() + s4() + s4();
};
