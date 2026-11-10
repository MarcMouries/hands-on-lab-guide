import React from 'react'
import { FacilitatorSummary } from '../services/facilitatorApi'
import { averagePercent, percentLabel, ratePercent } from '../utils/format'

interface Tile {
    label: string
    value: string
    hint: string
}

export function SummaryTiles({ summary }: { summary: FacilitatorSummary }) {
    const participants = summary.participants
    const completed = participants.filter((row) => row.status === 'complete').length

    const average = averagePercent(participants.map((row) => row.percent_complete))

    let pass = 0
    let fail = 0
    for (let i = 0; i < summary.results_by_task.length; i++) {
        pass += summary.results_by_task[i].pass
        fail += summary.results_by_task[i].fail
    }
    const overall = ratePercent(pass, fail)

    const tiles: Tile[] = [
        {
            label: 'Participants',
            value: String(participants.length),
            hint: 'Enrolled in this plan',
        },
        {
            label: 'Completed',
            value: String(completed),
            hint: 'Every task submitted',
        },
        {
            label: 'Avg. complete',
            value: percentLabel(average),
            hint: 'Mean progress across participants',
        },
        {
            label: 'Overall pass rate',
            value: percentLabel(overall),
            hint: pass + fail > 0 ? pass + ' pass / ' + fail + ' fail' : 'Nothing graded yet',
        },
    ]

    return (
        <dl className="holg-tiles">
            {tiles.map((tile) => (
                <div className="holg-tile" key={tile.label}>
                    <dt className="holg-tile__label">{tile.label}</dt>
                    <dd className="holg-tile__value">{tile.value}</dd>
                    <p className="holg-tile__hint">{tile.hint}</p>
                </div>
            ))}
        </dl>
    )
}
