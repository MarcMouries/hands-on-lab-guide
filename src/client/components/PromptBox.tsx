import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Markdown, { Components } from 'react-markdown'
import { LabPrompt } from '../services/participantApi'
import { PromptTokens, substituteTokens } from '../utils/promptTokens'
import './PromptBox.css'

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

/** Flattens a rendered subtree back to plain text, for the clipboard. */
function nodeText(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node)
    }
    if (Array.isArray(node)) {
        return node.map(nodeText).join('')
    }
    if (React.isValidElement(node)) {
        return nodeText((node.props as { children?: React.ReactNode }).children)
    }
    return ''
}

/**
 * Where we are in the list nesting, so only the OUTERMOST ordered list becomes
 * the step timeline. `steps` is true for the children of that list alone -
 * nesting depth is not enough on its own, because a bullet list at the top
 * level would otherwise make its own children look like steps.
 */
interface ListContextValue {
    depth: number
    steps: boolean
}

const ListContext = createContext<ListContextValue>({ depth: 0, steps: false })

/**
 * A fenced block plus its own Copy button.
 *
 * A step whose instruction IS a prompt needs the prompt on the clipboard, not
 * the prose around it, so the button copies this block's text rather than the
 * whole of prompt_text. Its own component because each block keeps its own
 * copied/failed state and timer.
 */
function CodeBlock({ children }: { children?: React.ReactNode }) {
    const [copied, setCopied] = useState(false)
    const [failed, setFailed] = useState(false)
    const timer = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (timer.current !== null) {
                window.clearTimeout(timer.current)
            }
        }
    }, [])

    const onCopy = useCallback(() => {
        const settle = (ok: boolean) => {
            setCopied(ok)
            setFailed(!ok)
            if (timer.current !== null) {
                window.clearTimeout(timer.current)
            }
            timer.current = window.setTimeout(() => {
                setCopied(false)
                setFailed(false)
                timer.current = null
            }, COPIED_MS)
        }
        writeClipboard(nodeText(children))
            .then(() => settle(true))
            .catch(() => settle(false))
    }, [children])

    return (
        <div className="holg-code">
            <pre className="holg-prompt__code">{children}</pre>
            <button
                type="button"
                className="holg-btn holg-btn--sm holg-code__copy"
                onClick={onCopy}
            >
                {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy'}
            </button>
            <span className="holg-sr-only" aria-live="polite">
                {copied ? 'Copied to the clipboard' : ''}
            </span>
        </div>
    )
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
        return <CodeBlock>{children}</CodeBlock>
    },

    /*
     * The outermost ordered list IS the step list, so a whole task can be
     * authored as one Markdown document and still render as a numbered
     * timeline. Deeper lists render as ordinary lists.
     */
    ol({ children }) {
        const { depth } = useContext(ListContext)
        const outermost = depth === 0
        return (
            <ListContext.Provider value={{ depth: depth + 1, steps: outermost }}>
                {outermost ? (
                    <ol className="holg-steps">{children}</ol>
                ) : (
                    <ol>{children}</ol>
                )}
            </ListContext.Provider>
        )
    },

    ul({ children }) {
        const { depth } = useContext(ListContext)
        return (
            <ListContext.Provider value={{ depth: depth + 1, steps: false }}>
                <ul>{children}</ul>
            </ListContext.Provider>
        )
    },

    /*
     * The badge is empty and numbered by a CSS counter, so the step number
     * never has to be authored or counted in JS. aria-hidden because the
     * <ol>/<li> already numbers the step for a screen reader - announcing it
     * twice would be worse than not showing it at all.
     */
    li({ children }) {
        const { steps } = useContext(ListContext)
        if (!steps) {
            return <li>{children}</li>
        }
        return (
            <li className="holg-step">
                <span className="holg-step__num" aria-hidden="true" />
                <div className="holg-step__body">{children}</div>
            </li>
        )
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

/**
 * prompt_text rendered exactly as a participant sees it.
 *
 * Exported so the authoring preview can mount the real renderer rather than a
 * lookalike: a preview that drifts from the participant view is worse than no
 * preview, because it is believed.
 */
export function PromptMarkdown({ source }: { source: string }) {
    return <Markdown components={MARKDOWN_COMPONENTS}>{source}</Markdown>
}

interface Props {
    prompt: LabPrompt
    index: number
    /** `{{token}}` values for this participant. */
    tokens: PromptTokens
}

export function PromptBox({ prompt, index, tokens }: Props) {
    /*
     * Tokens are filled in on the SOURCE, before rendering, so a Copy button
     * hands over Markdown rather than rendered text - just with this
     * participant's values in it. Copying `{{prefix}}` would be worse than
     * useless when the whole point of the token is to tell them what to type.
     */
    const source = useMemo(
        () => substituteTokens(prompt.prompt_text, tokens),
        [prompt.prompt_text, tokens],
    )

    const label = prompt.label || 'Prompt ' + (index + 1)

    // Re-parsed only when the source text changes.
    const body = useMemo(() => <PromptMarkdown source={source} />, [source])

    /*
     * No Copy button on the header. Copying a whole step document put the
     * prose on the clipboard along with the prompt, so Copy now belongs to
     * each fenced block (see CodeBlock) - what a participant actually pastes
     * into Build Agent, and nothing else.
     */
    return (
        <div className="holg-prompt">
            <div className="holg-prompt__head">
                <span className="holg-prompt__label">{label}</span>
            </div>
            <div className="holg-prompt__text holg-prompt__text--md">{body}</div>
        </div>
    )
}
