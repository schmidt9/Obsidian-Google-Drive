import { FileMetadata } from "./drive"

export const PATH_KEY = "path"
const PART_DIVIDER = "_"
/**
 * Maximum of 124 bytes size limit on (key + value) string in UTF-8 encoding for a single property
 * https://developers.google.com/workspace/drive/api/reference/rest/v2/properties
 */
export const MAX_KEY_VALUE_LENGTH = 124

export const splitPath = (pathKey: string, pathValue: string) => {
    return splitStringToRecord(pathKey, PART_DIVIDER, pathValue, MAX_KEY_VALUE_LENGTH)
}

/**
 * Splits a string into key-value pairs where each key + value does not exceed maxBytes bytes.
 * Multi-byte characters are preserved (never split in the middle).
 * 
 * @param baseKey - Base key name (e.g., "part")
 * @param keyPartDivider - String used as a divider to divide baseKey and part index
 * @param value - The string to split
 * @param maxBytes - Maximum total bytes per entry
 * @returns Record with keys like "part_1", "part_2", etc. and corresponding value chunks
 */
const splitStringToRecord = (
    baseKey: string,
    keyPartDivider: string,
    value: string,
    maxBytes: number
) => {
    const result: Record<string, string> = {};

    if (value.length === 0) {
        return result;
    }

    let partNumber = 0;
    let remainingValue = value;

    while (remainingValue.length > 0) {
        const currentKey = partNumber == 0 ? baseKey : `${baseKey}${keyPartDivider}${partNumber}`;
        const keyBytes = getByteLength(currentKey);

        // Calculate available bytes for the value
        const maxValueBytes = maxBytes - keyBytes;

        if (maxValueBytes <= 0) {
            throw new Error(
                `Key "${currentKey}" (${keyBytes} bytes) already exceeds or equals ` +
                `maxBytes (${maxBytes}). Cannot fit any value.`
            );
        }

        // Find the longest prefix of remainingValue that fits in maxValueBytes
        let chunkStart = 0;
        let chunkEnd = 0;
        let currentBytes = 0;

        // Iterate through the string by code points (handles surrogate pairs correctly)
        for (const char of remainingValue) {
            const charBytes = getByteLength(char);

            // If a single character itself exceeds maxValueBytes, throw error
            if (charBytes > maxValueBytes) {
                throw new Error(
                    `Character "${char}" (${charBytes} bytes) exceeds available ` +
                    `space (${maxValueBytes} bytes) for value in key "${currentKey}"`
                );
            }

            // If adding this character would exceed the limit, stop
            if (currentBytes + charBytes > maxValueBytes) {
                break;
            }

            currentBytes += charBytes;
            chunkEnd++;
        }

        // Extract the chunk and add to result
        const chunk = remainingValue.slice(chunkStart, chunkEnd);
        result[currentKey] = chunk;

        // Update remaining value
        remainingValue = remainingValue.slice(chunkEnd);
        partNumber++;
    }

    return result;
}

/**
 * Returns the byte length of a string in UTF-8 encoding
 * 
 * @param str - Input string
 * @returns Number of bytes in UTF-8
 */
export const getByteLength = (str: string) => {
    const encoder = new TextEncoder();
    return encoder.encode(str).length;
}

export const joinPath = (pathKey: string, properties: Record<string, string>) => {
    const pathKeyWithDivider = pathKey + PART_DIVIDER

    return Object.entries(properties)
        .filter(([key, _]) => {
            return key === pathKey || key.startsWith(pathKeyWithDivider)
        })
        .sort((v1, v2) => {
            const key1 = v1[0]
            const key1Index = Number(key1.split(PART_DIVIDER)[1])

            const key2 = v2[0]
            const key2Index = Number(key2.split(PART_DIVIDER)[1])

            if (Number.isNaN(key1Index)) {
                return -1;
            }

            if (Number.isNaN(key2Index)) {
                return 1;
            }

            return key1Index - key2Index
        })
        .reduce((acc, v) => {
            return acc + v[1]
        }, "")
}

export const restorePath = (metadata: FileMetadata) => {
    const hasPathKey = Object.prototype.hasOwnProperty.call(metadata.properties, PATH_KEY)
    const hasPathParts = Object.keys(metadata.properties).some((key) => {
        return key.startsWith(PATH_KEY + PART_DIVIDER)
    })

    if (hasPathKey || hasPathParts) {
        metadata.properties.path = joinPath(PATH_KEY, metadata.properties);
        // remove path parts since they are already joined in metadata.properties.path
        Object.keys(metadata.properties).forEach((key) => {
            if (key.startsWith(PATH_KEY + PART_DIVIDER)) {
                delete metadata.properties[key]
            }
        });
    }
}