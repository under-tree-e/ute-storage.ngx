#!/usr/bin/env node

import * as fs from "graceful-fs";

(async () => {
    // manually detect option-specific help
    // https://github.com/raineorshine/npm-check-updates/issues/787
    const rawArgs = process.argv.slice(2);
    const indexWasm = rawArgs.findIndex((arg) => arg === "--wasm" || arg === "-w");

    if (indexWasm !== -1) {
        try {
            const assets: string = process.cwd() + "./src/assets/";
            fs.mkdirSync(assets, { recursive: true });
            fs.copyFileSync("./node_modules/sql.js/dist/sql-wasm.wasm", "./src/assets/sql-wasm.wasm");
        } catch {
            console.error("Wasm file not found! Check './node_modules/sql.js/dist/sql-wasm.wasm'");
        }
    }
    process.exit();
})();
