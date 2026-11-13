import React from 'react'
import { AuthorSection, AuthorTask, NodeType } from '../services/authoringApi'

export interface Selection {
    type: NodeType
    sys_id: string
}

interface RowProps {
    label: string
    kind: string
    selected: boolean
    depth: number
    busy: boolean
    onSelect: () => void
    onUp: (() => void) | null
    onDown: (() => void) | null
    onDelete: () => void
}

/**
 * One line of the tree: a select button, then reorder and delete.
 *
 * Up and down are plain buttons rather than a drag handle. They work with a
 * keyboard and on a phone without a library, and each click is one move the
 * server can resequence from - a drag would need the same endpoint anyway.
 */
function Row({
    label,
    kind,
    selected,
    depth,
    busy,
    onSelect,
    onUp,
    onDown,
    onDelete,
}: RowProps) {
    return (
        <div
            className={'holg-tree__row' + (selected ? ' holg-tree__row--on' : '')}
            style={{ paddingLeft: 8 + depth * 14 }}
        >
            <button
                type="button"
                className="holg-tree__pick"
                onClick={onSelect}
                aria-current={selected ? 'true' : undefined}
            >
                <span className="holg-tree__kind">{kind}</span>
                <span className="holg-tree__label">{label || '(untitled)'}</span>
            </button>

            <span className="holg-tree__tools">
                <button
                    type="button"
                    className="holg-iconbtn"
                    disabled={busy || !onUp}
                    onClick={onUp || undefined}
                    title={'Move ' + kind + ' up'}
                    aria-label={'Move ' + kind + ' "' + label + '" up'}
                >
                    {'▲'}
                </button>
                <button
                    type="button"
                    className="holg-iconbtn"
                    disabled={busy || !onDown}
                    onClick={onDown || undefined}
                    title={'Move ' + kind + ' down'}
                    aria-label={'Move ' + kind + ' "' + label + '" down'}
                >
                    {'▼'}
                </button>
                <button
                    type="button"
                    className="holg-iconbtn holg-iconbtn--danger"
                    disabled={busy}
                    onClick={onDelete}
                    title={'Delete ' + kind}
                    aria-label={'Delete ' + kind + ' "' + label + '"'}
                >
                    {'×'}
                </button>
            </span>
        </div>
    )
}

interface Props {
    planName: string
    planStatus: string
    sections: AuthorSection[]
    selected: Selection | null
    busy: boolean
    onSelect: (selection: Selection) => void
    onAdd: (type: NodeType, parentId: string) => void
    onMove: (type: NodeType, sysId: string, direction: 'up' | 'down') => void
    onDelete: (type: NodeType, sysId: string, label: string) => void
}

export function AuthoringTree({
    planName,
    planStatus,
    sections,
    selected,
    busy,
    onSelect,
    onAdd,
    onMove,
    onDelete,
}: Props) {
    const isOn = (type: NodeType, sysId: string) =>
        !!selected && selected.type === type && selected.sys_id === sysId

    const taskChildren = (task: AuthorTask) => (
        <>
            {task.prompts.map((prompt, index) => (
                <Row
                    key={prompt.sys_id}
                    kind="Prompt"
                    label={prompt.label || prompt.prompt_text.slice(0, 40)}
                    depth={3}
                    busy={busy}
                    selected={isOn('prompt', prompt.sys_id)}
                    onSelect={() => onSelect({ type: 'prompt', sys_id: prompt.sys_id })}
                    onUp={index > 0 ? () => onMove('prompt', prompt.sys_id, 'up') : null}
                    onDown={
                        index < task.prompts.length - 1
                            ? () => onMove('prompt', prompt.sys_id, 'down')
                            : null
                    }
                    onDelete={() => onDelete('prompt', prompt.sys_id, prompt.label || 'this prompt')}
                />
            ))}

            {task.criteria.map((criterion, index) => (
                <Row
                    key={criterion.sys_id}
                    kind="Criterion"
                    label={criterion.criterion.slice(0, 40)}
                    depth={3}
                    busy={busy}
                    selected={isOn('criterion', criterion.sys_id)}
                    onSelect={() => onSelect({ type: 'criterion', sys_id: criterion.sys_id })}
                    onUp={index > 0 ? () => onMove('criterion', criterion.sys_id, 'up') : null}
                    onDown={
                        index < task.criteria.length - 1
                            ? () => onMove('criterion', criterion.sys_id, 'down')
                            : null
                    }
                    onDelete={() =>
                        onDelete('criterion', criterion.sys_id, criterion.criterion.slice(0, 40))
                    }
                />
            ))}

            <div className="holg-tree__adds" style={{ paddingLeft: 8 + 3 * 14 }}>
                <button
                    type="button"
                    className="holg-btn holg-btn--sm"
                    disabled={busy}
                    onClick={() => onAdd('prompt', task.sys_id)}
                >
                    + Prompt
                </button>
                <button
                    type="button"
                    className="holg-btn holg-btn--sm"
                    disabled={busy}
                    onClick={() => onAdd('criterion', task.sys_id)}
                >
                    + Criterion
                </button>
            </div>
        </>
    )

    return (
        <nav className="holg-tree" aria-label="Plan contents">
            <Row
                kind="Plan"
                label={planName + (planStatus && planStatus !== 'published' ? ' (' + planStatus + ')' : '')}
                depth={0}
                busy={busy}
                selected={!!selected && selected.type === 'plan'}
                onSelect={() => onSelect({ type: 'plan', sys_id: '' })}
                onUp={null}
                onDown={null}
                onDelete={() => onDelete('plan', '', planName)}
            />

            {sections.map((section, sectionIndex) => (
                <React.Fragment key={section.sys_id}>
                    <Row
                        kind="Section"
                        label={section.title}
                        depth={1}
                        busy={busy}
                        selected={isOn('section', section.sys_id)}
                        onSelect={() => onSelect({ type: 'section', sys_id: section.sys_id })}
                        onUp={sectionIndex > 0 ? () => onMove('section', section.sys_id, 'up') : null}
                        onDown={
                            sectionIndex < sections.length - 1
                                ? () => onMove('section', section.sys_id, 'down')
                                : null
                        }
                        onDelete={() => onDelete('section', section.sys_id, section.title)}
                    />

                    {section.tasks.map((task, taskIndex) => (
                        <React.Fragment key={task.sys_id}>
                            <Row
                                kind="Task"
                                label={task.title}
                                depth={2}
                                busy={busy}
                                selected={isOn('task', task.sys_id)}
                                onSelect={() => onSelect({ type: 'task', sys_id: task.sys_id })}
                                onUp={taskIndex > 0 ? () => onMove('task', task.sys_id, 'up') : null}
                                onDown={
                                    taskIndex < section.tasks.length - 1
                                        ? () => onMove('task', task.sys_id, 'down')
                                        : null
                                }
                                onDelete={() => onDelete('task', task.sys_id, task.title)}
                            />
                            {isOn('task', task.sys_id) ||
                            task.prompts.some((p) => isOn('prompt', p.sys_id)) ||
                            task.criteria.some((c) => isOn('criterion', c.sys_id))
                                ? taskChildren(task)
                                : null}
                        </React.Fragment>
                    ))}

                    <div className="holg-tree__adds" style={{ paddingLeft: 8 + 2 * 14 }}>
                        <button
                            type="button"
                            className="holg-btn holg-btn--sm"
                            disabled={busy}
                            onClick={() => onAdd('task', section.sys_id)}
                        >
                            + Task
                        </button>
                    </div>
                </React.Fragment>
            ))}

            <div className="holg-tree__adds" style={{ paddingLeft: 8 + 14 }}>
                <button
                    type="button"
                    className="holg-btn holg-btn--sm"
                    disabled={busy}
                    onClick={() => onAdd('section', '')}
                >
                    + Section
                </button>
            </div>
        </nav>
    )
}
