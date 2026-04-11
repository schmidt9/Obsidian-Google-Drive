import { test, describe } from "node:test"
import * as assert from "node:assert/strict"
import * as path from "./helpers/path"
import { FileMetadata } from "helpers/drive"

describe("Path tests", () => {

    const shortFileName = "test note with a short name.md"
    const longFileName = "test note with a long long long long long long long long long long long long long long long long long long name longer than 124 bytes.md"
    const pathKey = path.PATH_KEY

    test("splitPath", () => {
        // test short name

        var result = path.splitPath(pathKey, shortFileName)

        console.log(result)

        assert.equal(Object.keys(result).length, 1)
        assert.strictEqual(result[path.PATH_KEY], shortFileName)

        // test long name

        result = path.splitPath(pathKey, longFileName)

        console.log(result)

        assert.equal(Object.keys(result).length, 2)
        assert.notEqual(result[path.PATH_KEY], undefined)
        assert.notEqual(result[path.PATH_KEY + "_" + 1], undefined)
    })

    test("joinPath", () => {
        // test short name

        var properties = path.splitPath(pathKey, shortFileName)
        var result = path.joinPath(pathKey, properties)

        assert.strictEqual(result, shortFileName)

        // test long name

        properties = path.splitPath(pathKey, longFileName)
        result = path.joinPath(pathKey, properties)

        assert.strictEqual(result, longFileName)
    })

    test("restorePath", () => {
        var properties = path.splitPath(pathKey, longFileName)
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
        assert.strictEqual(metadata.properties.path, longFileName)
    })

})