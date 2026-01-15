export interface FetchOptions {
    cutoffTimestamp?: number
    max?: number
}

export type TimePeriod = 'alltime' | 'days' | 'weeks' | 'months' | 'years';