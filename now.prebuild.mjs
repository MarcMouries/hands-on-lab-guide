import { servicenowFrontEndPlugins, rollup, glob } from '@servicenow/isomorphic-rollup'

/**
 * vfile - pulled in by react-markdown via unified - reaches its platform shims
 * through Node `imports` subpath specifiers (#minpath / #minproc / #minurl,
 * declared in vfile's own package.json). The SDK's resolver does not read that
 * field: it looks for them next to the project root, logs a TS213 warning, and
 * then leaves them in the output as bare external imports. The build still
 * reports success, but the browser cannot resolve `#minpath`, so loading
 * participant.jsdbx throws and the lab renders nothing.
 *
 * Map them to vfile's browser shims, which is what the `default` condition in
 * that imports field selects. Keyed by exact specifier so nothing else is
 * caught; if react-markdown is removed, these resolve nothing and are inert.
 */
const VFILE_BROWSER_SHIMS = {
    '#minpath': 'vfile/lib/minpath.browser.js',
    '#minproc': 'vfile/lib/minproc.browser.js',
    '#minurl': 'vfile/lib/minurl.browser.js',
}

/**
 * Prebuild script for building the client assets of the application before running the rest of the build.
 * Export an async function that accepts useful modules for building the application as arguments.
 * This function returns a Promise that resolves when the build is complete.
 * You can also export an array of functions if you want to run multiple prebuild steps.
 */
export default async ({ rootDir, config, fs, path, logger, registerExplicitId }) => {
    // This is where all the client source files are located
    const clientDir = path.join(rootDir, config.clientDir)
    // Check to make sure we have something to build before we start
    const htmlFilePattern = path.join(clientDir, '**', '*.html')
    const htmlFiles = await glob(htmlFilePattern, { fs })
    if (!htmlFiles.length) {
        logger.warn(`No HTML files found in ${clientDir}, skipping UI build.`)
        return
    }

    // This is the destination for the build output
    const staticContentDir = path.join(rootDir, config.staticContent.buildDir)
    // Clean up any previous build output
    fs.rmSync(staticContentDir, { recursive: true, force: true })

    // Call the rollup build
    const rollupBundle = await rollup({
        // Use the file system module provided by the build environment
        fs,
        // Search all HTML files in the client directory to find entry points
        input: htmlFilePattern,
        // Use the default set of ServiceNow plugins for Rollup
        // configured for the scope name and root directory
        plugins: [
            {
                name: 'holg-vfile-browser-imports',
                resolveId(source) {
                    const shim = VFILE_BROWSER_SHIMS[source]
                    return shim ? path.join(rootDir, 'node_modules', shim) : null
                },
            },
            servicenowFrontEndPlugins({
                scope: config.scope,
                rootDir: clientDir,
                projectRootDir: rootDir,
                registerExplicitId,
                // When true -- Pages built with NowSDK will be editable on instance and through Build Agent
                //
                //   Set editableSourceCodeOnInstance to the value below to override
                //   which files are included when deployed to a ServiceNow instance
                //   editableSourceCodeOnInstance: {
                //       excludePatterns: [
                //         '**/node_modules/**',
                //         '**/dist/**',
                //         '**/build/**',
                //         '**/.now/**',
                //         '**/.git/**',
                //         '**/*.min.js',
                //         '**/*.bundle.js',
                //     ],
                //   },
                editableSourceCodeOnInstance: config.packageSourceCodeOnInstance,
            }),
        ],
    })
    // Write the build output to the configured destination
    // including source maps for JavaScript files
    const rollupOutput = await rollupBundle.write({
        dir: staticContentDir,
        sourcemap: true,
    })
    // Print the build results
    rollupOutput.output.forEach((file) => {
        if (file.type === 'asset') {
            logger.info(`Bundled asset: ${file.fileName} (${file.source.length} bytes)`)
        } else if (file.type === 'chunk') {
            logger.info(`Bundled chunk: ${file.fileName} (${file.code.length} bytes)`)
        }
    })
}
