/**
 * Mounts a lab bundle into its root node, waiting for that node to exist.
 *
 * `#react-root` is NOT guaranteed to be in the document when this module runs.
 * On the Service Portal the shell widget injects the bundle from its
 * controller, and the widget's own template can still be a digest away; once
 * the asset is warm in the browser cache the module frequently wins that race.
 * Both entries used to bail out in that case (`if (mount) { ... }`), which
 * showed as a blank page that a reload sometimes - but only sometimes - fixed.
 */

const MOUNT_ID = 'react-root'

/** Marks a mounted node, so a re-injected bundle does not mount it twice. */
const MOUNTED_ATTRIBUTE = 'data-holg-mounted'

/** Retry budget: 50ms apart, so about five seconds in total. */
const RETRY_MS = 50
const MAX_ATTEMPTS = 100

export function mountLabApp(render: (mount: HTMLElement) => void): void {
    let attempts = 0

    const attempt = (): void => {
        const mount = document.getElementById(MOUNT_ID)

        if (mount) {
            /*
             * A portal route change re-injects the bundle, so a second copy of
             * this module can be handed a node that already carries a React
             * root. Mounting again would leave two roots fighting over it.
             */
            if (mount.getAttribute(MOUNTED_ATTRIBUTE)) {
                return
            }
            mount.setAttribute(MOUNTED_ATTRIBUTE, 'true')
            render(mount)
            return
        }

        attempts += 1
        if (attempts > MAX_ATTEMPTS) {
            // Nothing to render into, so this is the one failure the app can
            // only report to the console.
            console.error(
                '[x_snc_holg] #' + MOUNT_ID + ' never appeared; the lab app did not mount.',
            )
            return
        }

        // setTimeout rather than requestAnimationFrame: a background tab stops
        // painting, and the app should still be there when it comes forward.
        window.setTimeout(attempt, RETRY_MS)
    }

    attempt()
}
