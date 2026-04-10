import { test, describe } from "node:test"
import * as assert from "node:assert/strict"
import * as path from "./helpers/path"

describe("Path tests", () => {

    const fileName = "test note with a long long long long long long long long long long long long long long long long long long name longer than 124 bytes.md"
    const pathKey = "path"

    test("splitPath", () => {
        const result = path.splitPath(pathKey, fileName)

        console.log(result)

        assert.equal(Object.keys(result).length, 2)
        assert.notEqual(result["path"], undefined)
        assert.notEqual(result["path_1"], undefined)
    })

    test("joinPath", () => {
        const properties = path.splitPath(pathKey, fileName)
        const result = path.joinPath(pathKey, properties)

        assert.strictEqual(result, fileName)
    })

})