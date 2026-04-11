import { FileMetadata } from "./drive"

export const PATH_KEY = "path"
const PART_DIVIDER = "_"
/**
 * 2 digits for part number should be enough to cover max custom properties count
 * see https://developers.google.com/workspace/drive/api/reference/rest/v2/properties
 */
const PART_NUMBER_SUFFIX_LENGTH = 2
/**
 * Maximum of 124 bytes size limit on (key + value) string in UTF-8 encoding for a single property
 * https://developers.google.com/workspace/drive/api/reference/rest/v2/properties
 */
const MAX_KEY_VALUE_LENGTH = 124

export const splitPath = (pathKey: string, pathValue: string) => {

    const result: Record<string, string> = {}

    if (pathKey.length == 0 || pathValue.length == 0) {
        return result
    }

    const pathPartSuffixLength = PART_DIVIDER.length + PART_NUMBER_SUFFIX_LENGTH

    const keyLength = pathKey.length
    const maxValueLength = MAX_KEY_VALUE_LENGTH - pathPartSuffixLength - keyLength

    if (maxValueLength <= 0) {
        // it can happen if key is very long
        return result
    }

    const partsCount = Math.ceil(pathValue.length / maxValueLength)
    var offset = 0

    for (let i = 0; i < partsCount; i++) {
        const key = i == 0 ? pathKey : pathKey + PART_DIVIDER + i
        const value = pathValue.substring(offset, offset + maxValueLength)
        result[key] = value

        offset += maxValueLength
    }

    return result
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
    if (metadata && metadata.properties) {
        metadata.properties.path = joinPath(PATH_KEY, metadata.properties);

        // remove path parts since they are already joined in metadata.properties.path
        Object.keys(metadata.properties).forEach((key) => {
            if (key.startsWith(PATH_KEY + PART_DIVIDER)) {
                delete metadata.properties[key]
            }
        });
    }
}