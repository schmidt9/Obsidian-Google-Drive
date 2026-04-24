import { test, describe } from "node:test"
import * as assert from "node:assert/strict"
import * as path from "./helpers/path"
import { FileMetadata } from "helpers/drive"

describe("Path tests", () => {

    const shortFileName = "test note with a short name.md"
    // 136 bytes in UTF-8 encoding
    const longFileNameEn = "test note with a long long long long long long long long long long long long long long long long long long name longer than 124 bytes.md"
    // 241 bytes in UTF-8 encoding
    const longFileNameRu = "тестовая заметка c длинным длинным длинным длинным длинным длинным длинным длинным длинным длинным именем, которое больше 124 байт.md"
    // 223 bytes in UTF-8 encoding
    const longFileNameMixed = "test note with a long long name, тестовая заметка c длинным длинным именем, 😀😀😀😀😀 世界 世界 これは非常に長いテキストです"
    const pathKey = path.PATH_KEY

    test("splitPath", () => {
        const assertMaxKeyValueLength = (record: Record<string, string>, numEntries: number) => {
            assert.equal(Object.keys(record).length, numEntries)

            for (const [key, value] of Object.entries(result)) {
                assert.ok(
                    path.getByteLength(key) + path.getByteLength(value) <= path.MAX_KEY_VALUE_LENGTH
                )
            }
        }

        // test short en name

        var result = path.splitPath(pathKey, shortFileName)

        console.log(result)

        assert.equal(Object.keys(result).length, 1)
        assert.strictEqual(Object.values(result)[0], shortFileName)
        assertMaxKeyValueLength(result, 1)

        // test long en name

        result = path.splitPath(pathKey, longFileNameEn)
        console.log("en name: ", result)
        assertMaxKeyValueLength(result, 2)

        // test long ru name

        result = path.splitPath(pathKey, longFileNameRu)
        console.log("ru name: ", result)
        assertMaxKeyValueLength(result, 3)

        // test long mixed name

        result = path.splitPath(pathKey, longFileNameMixed)
        console.log("mixed name: ", result)
        assertMaxKeyValueLength(result, 3)
    })

    test("joinPath", () => {
        const fileNames = [
            shortFileName, longFileNameEn, longFileNameRu, longFileNameMixed
        ]

        for (const fileName of fileNames) {
            var properties = path.splitPath(pathKey, fileName)
            var result = path.joinPath(pathKey, properties)
            assert.strictEqual(result, fileName)
        }
    })

    test("restorePath", () => {
        var properties = path.splitPath(pathKey, longFileNameEn)
        const metadata: FileMetadata = {
            properties: properties,
            id: "",
            name: "",
            description: "",
            mimeType: "",
            starred: false,
            modifiedTime: ""
        }
        path.restorePath(metadata)

        assert.equal(Object.keys(metadata.properties).length, 1)
        assert.strictEqual(metadata.properties.path, longFileNameEn)
    })

})