import { Live } from '../Live'
import { getCFMultiplier } from '../skills/cf'
import {
    getComboMultiplier,
    getHeartBonus,
    judgmentMultiplier,
} from '../tap-score'

export type HitEvent = {
    time: number
    type: 'hit'
    position: number
    isStar: boolean
    isSwing: boolean
    perfectJudgments: true[]
}

export function processHitEvent(live: Live, event: HitEvent) {
    const triggers: [number][] = []

    const isPlockActive = live.plockState.value > 0
    const paramMultiplier = live.paramState.value
    const sparkBonus = live.sparkState.value
    const psuBonus = live.psuState.value
    const cfBonus = live.cfState.value

    const baseJudgments = event.perfectJudgments.map(
        live.context.getRandomJudgment
    )
    const judgments = isPlockActive
        ? baseJudgments.map((judgment) => (judgment <= 2 ? 0 : judgment))
        : baseJudgments

    const isPerfect = judgments.every((judgment) => judgment === 0)
    const plockMultiplier =
        isPlockActive && baseJudgments.every((judgment) => judgment === 0)
            ? 1.08
            : 1
    const trickMultiplier = isPlockActive ? 1 : 0
    const heartMultiplier = 1 + live.hearts * getHeartBonus(live.context.maxHp)

    live.notes++
    live.combo++
    if (isPlockActive) live.covered++

    live.context.comboTriggers.forEach(([i, count]) => {
        live.triggerCounters[i]++

        if (live.triggerCounters[i] < count) return
        live.triggerCounters[i] -= count

        triggers.push([i])
    })

    if (isPerfect) {
        live.context.perfectTriggers.forEach(([i, count]) => {
            live.triggerCounters[i]++

            if (live.triggerCounters[i] < count) return
            live.triggerCounters[i] -= count

            triggers.push([i])
        })

        if (event.isStar) {
            live.context.starPerfectTriggers.forEach(([i, count]) => {
                live.triggerCounters[i]++

                if (live.triggerCounters[i] < count) return
                live.triggerCounters[i] -= count

                triggers.push([i])
            })
        }
    }

    const totalJudgmentMultiplier = judgments.reduce(
        (acc, judgment) => acc * judgmentMultiplier[judgment],
        1
    )
    const comboMultiplier = getComboMultiplier(live.combo)
    const groupMultiplier = live.context.groupMultipliers[event.position]
    const attributeMultiplier =
        live.context.attributeMultipliers[event.position]
    const noteMultiplier = event.isSwing ? 0.5 : 1
    const cfMultiplier = getCFMultiplier(live.combo)

    const totalStat =
        live.context.stat.base +
        live.context.stat.trick * trickMultiplier +
        live.context.stat.param * paramMultiplier

    live.score +=
        totalStat *
        0.01 *
        totalJudgmentMultiplier *
        comboMultiplier *
        groupMultiplier *
        attributeMultiplier *
        noteMultiplier *
        plockMultiplier *
        heartMultiplier *
        live.context.tapScoreMultiplier

    live.score += sparkBonus

    if (isPerfect) live.score += psuBonus

    live.score += Math.min(1000, cfBonus * cfMultiplier)

    return triggers
}
