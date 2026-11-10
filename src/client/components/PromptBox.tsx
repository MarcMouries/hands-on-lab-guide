import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Markdown, { Components } from 'react-markdown'
import { LabPrompt } from '../services/participantApi'

const COPIED_MS = 2000

/** Clipboard write with a textarea fallback for contexts that block the API. */
function writeClipboard(value: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(value)
    }
    return new Promise((resolve, reject) => {
        try {
            const area = document.createElement('textarea')
            area.value = value
            area.setAttribute('readonly', 'true')
            area.style.position = 'fixed'
            area.style.left = '-9999px'
            document.body.appendChild(area)
            area.select()
            const ok = document.execCommand('copy')
            document.body.removeChild(area)
            if (ok) {
                resolve()
            } else {
                reject(new Error('copy rejected'))
            }
        } catch (e) {
            reject(e instanceof Error ? e : new Error('copy failed'))
        }
    })
}

/**
 * Markdown renderers for prompt_text.
 *
 * No rehype-raw: react-markdown drops raw HTML by default, and prompt_text is
 * author-editable table data, so enabling it would be a stored-XSS vector.
 * No remark-gfm either - nested lists, inline code, blockquotes and images are
 * all core CommonMark.
 *
 * urlTransform is left at the default. It only strips URLs whose leading
 * protocol is outside the allowlist, so ServiceNow-relative targets such as
 * /sys_attachment.do?sys_id=... and /<name>.iix pass through untouched.
 *
 * Defined at module scope: a map rebuilt per render would remount every node.
 */
const MARKDOWN_COMPONENTS: Components = {
    /*
     * Fenced blocks. The `inline` prop was removed from `code` in v9, so the
     * block/inline split has to happen here - bare inline <code> is styled in
     * CSS instead.
     */
    pre({ children }) {
        return <pre className="holg-prompt__code">{children}</pre>
    },

    /*
     * Screenshots. An image with no usable alt text is worse than no image for
     * a screen reader, so anything missing or blank-but-not-empty falls back to
     * a generic label. A deliberately empty alt ("![](url)") stays empty, which
     * is how an author marks a decorative image.
     */
    img({ src, alt, title }) {
        const decorative = alt === ''
        return (
            <img
                className="holg-prompt__img"
                src={src}
                alt={decorative ? '' : alt && alt.trim() ? alt : 'Lab screenshot'}
                title={title}
                loading="lazy"
            />
        )
    },

    /* External links open in a new tab, without handing it window.opener. */
    a({ href, children, title }) {
        const external = /^https?:\/\//i.test(href || '')
        return (
            <a
                className="holg-prompt__link"
                href={href}
                title={title}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
            >
                {children}
            </a>
        )
    },
}

export function PromptBox({ prompt, index }: { prompt: LabPrompt; index: number }) {
    const [copied, setCopied] = useState(false)
    const [failed, setFailed] = useState(false)
    const timer = useRef<number | null>(null)

    const clearTimer = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current)
            timer.current = null
        }
    }, [])

    // Clear on unmount and whenever the prompt changes, so a pending timeout
    // can never fire into an unmounted or switched-out component.
    useEffect(() => {
        setCopied(false)
        setFailed(false)
        return clearTimer
    }, [prompt.sys_id, clearTimer])

    const onCopy = useCallback(() => {
        clearTimer()
        // Copies the stored Markdown source, not the rendered text.
        writeClipboard(prompt.prompt_text)
            .then(() => {
                setFailed(false)
                setCopied(true)
                timer.current = window.setTimeout(() => {
                    setCopied(false)
                    timer.current = null
                }, COPIED_MS)
            })
            .catch(() => {
                setCopied(false)
                setFailed(true)
                timer.current = window.setTimeout(() => {
                    setFailed(false)
                    timer.current = null
                }, COPIED_MS)
            })
    }, [prompt.prompt_text, clearTimer])

    const label = prompt.label || 'Prompt ' + (index + 1)

    // Re-parsed only when the stored text changes, not on every copy-state tick.
    const body = useMemo(
        () => <Markdown components={MARKDOWN_COMPONENTS}>{prompt.prompt_text}</Markdown>,
        [prompt.prompt_text],
    )

    return (
        <div className="holg-prompt">
            <div className="holg-prompt__head">
                <span className="holg-prompt__label">{label}</span>
                <button type="button" className="holg-btn holg-btn--sm" onClick={onCopy}>
                    {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy'}
                </button>
            </div>
            <div className="holg-prompt__text holg-prompt__text--md">{body}</div>
            <span className="holg-sr-only" aria-live="polite">
                {copied ? label + ' copied to the clipboard' : ''}
            </span>
        </div>
    )
}
