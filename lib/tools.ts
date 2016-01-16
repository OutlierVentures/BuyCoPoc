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