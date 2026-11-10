import React from 'react'
import { LabSection, LabTask } from '../services/participantApi'
import { PromptBox } from './PromptBox'

/** A labelled text block, rendered only when the value is non-empty. */
function Block({ label, value }: { label: string; value: string }) {
    if (!value) {
        return null
    }
    return (
        <div className="holg-block">
            <h3 className="holg-block__label">{label}</h3>
            <p className="holg-block__text">{value}</p>
        </div>
    )
}

interface Props {
    section: LabSection
    task: LabTask
}

export function TaskPanel({ section, task }: Props) {
    return (
        <article className="holg-task">
            {section.overview ? (
                <aside className="holg-sectionOverview">
                    <h2 className="holg-sectionOverview__title">
                        {section.title || 'Section'}
                    </h2>
                    <p className="holg-sectionOverview__text">{section.overview}</p>
                </aside>
            ) : null}

            <h2 className="holg-task__title">{task.title}</h2>

            <Block label="Description" value={task.description} />
            <Block label="Scenario" value={task.scenario} />
            <Block label="How to test" value={task.how_to_test} />
            <Block label="Dependency note" value={task.dependency_note} />

            {task.prompts.length ? (
                <div className="holg-prompts">
                    <h3 className="holg-block__label">
                        {task.prompts.length === 1 ? 'Prompt' : 'Prompts'}
                    </h3>
                    {task.prompts.map((prompt, index) => (
                        <React.Fragment key={prompt.sys_id}>
                            <PromptBox prompt={prompt} index={index} />
                        </React.Fragment>
                    ))}
                </div>
            ) : null}

            {task.success_criteria.length ? (
                <div className="holg-block">
                    <h3 className="holg-block__label">Success criteria</h3>
                    <ol className="holg-criteria">
                        {task.success_criteria.map((criterion) => (
                            <li key={criterion.sys_id}>{criterion.criterion}</li>
                        ))}
                    </ol>
                </div>
            ) : null}
        </article>
    )
}
