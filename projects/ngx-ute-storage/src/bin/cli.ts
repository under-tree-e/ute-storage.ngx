#!/usr/bin/env node
import * as fs from "graceful-fs";

(async () => {
    // manually detect option-specific help
    // https://github.com/raineorshine/npm-check-updates/issues/787
    const rawArgs = process.argv.slice(2);
    const indexWasm = rawArgs.findIndex((arg) => arg === "--wasm" || arg === "-w");
    if (indexWasm !== -1 && rawArgs[indexWasm + 1]) {
        fs.copyFileSync("~node_modules/sql.js/dist/sql-wasm.wasm", "src/sql-wasm.wasm");
        process.exit(0);
    }
})();
