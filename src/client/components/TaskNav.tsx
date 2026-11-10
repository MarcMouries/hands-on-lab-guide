import React from 'react'
import { LabSection, LabTask, TaskResult } from '../services/participantApi'
import { flattenTasks, taskStateMeta } from '../utils/taskStatus'

interface Props {
    sections: LabSection[]
    selectedTaskId: string
    resultFor: (task: LabTask) => TaskResult | null
    onSelect: (taskId: string) => void
}

export function TaskNav({ sections, selectedTaskId, resultFor, onSelect }: Props) {
    const all = flattenTasks(sections)

    return (
        <nav className="holg-nav" aria-label="Plan tasks">
            {/* Narrow screens: a native dropdown instead of the full tree. */}
            <div className="holg-nav__compact">
                <label className="holg-field__label" htmlFor="holg-task-select">
                    Task
                </label>
                <select
                    id="holg-task-select"
                    className="holg-select"
                    value={selectedTaskId}
                    onChange={(event) => onSelect(event.target.value)}
                >
                    {sections.map((section) => (
                        <optgroup
                            label={section.title || 'Untitled section'}
                            key={section.sys_id}
                        >
                            {section.tasks.map((task) => (
                                <option value={task.sys_id} key={task.sys_id}>
                                    {taskStateMeta(resultFor(task)).label +
                                        ' \u2014 ' +
                                        task.title}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <p className="holg-nav__count">{all.length + ' tasks in this plan'}</p>
            </div>

            {/* Wide screens: sections with their tasks beneath. */}
            <ol className="holg-nav__sections">
                {sections.map((section) => (
                    <li className="holg-nav__section" key={section.sys_id}>
                        <h2 className="holg-nav__sectionTitle">
                            {section.title || 'Untitled section'}
                        </h2>
                        <ul className="holg-nav__tasks">
                            {section.tasks.map((task) => {
                                const meta = taskStateMeta(resultFor(task))
                                const active = task.sys_id === selectedTaskId
                                return (
                                    <li key={task.sys_id}>
                                        <button
                                            type="button"
                                            className={
                                                'holg-nav__task' +
                                                (active ? ' holg-nav__task--active' : '')
                                            }
                                            aria-current={active ? 'true' : undefined}
                                            onClick={() => onSelect(task.sys_id)}
                                        >
                                            <span
                                                className={
                                                    'holg-icon holg-icon--' + meta.state
                                                }
                                                aria-hidden="true"
                                            >
                                                {meta.glyph}
                                            </span>
                                            <span className="holg-nav__taskTitle">
                                                {task.title}
                                            </span>
                                            <span className="holg-sr-only">
                                                {' (' + meta.label + ')'}
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
