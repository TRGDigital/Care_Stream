import test from 'node:test'
import assert from 'node:assert/strict'
import { decide } from './verdict'

const w = (impressions: number, clicks = 0, position: number | null = 30, sessions = 0) => ({ impressions, clicks, position, sessions })
const base = { submitted: true, signups: 0, topQueries: [] as any[] }

test('too early before day 14', () => assert.equal(decide({ ...base, ageDays: 5, cur: w(0), prev: null }).key, 'new'))
test('not submitted and no impressions flags indexing', () => assert.equal(decide({ ...base, submitted: false, ageDays: 20, cur: w(0), prev: null }).key, 'not_indexed'))
test('low data is not judged', () => assert.equal(decide({ ...base, ageDays: 40, cur: w(40), prev: null }).key, 'not_enough_data'))
test('85 days with almost nothing is a prune candidate', () => assert.equal(decide({ ...base, ageDays: 90, cur: w(20), prev: null }).key, 'prune'))
test('old page with some impressions is only watched', () => assert.equal(decide({ ...base, ageDays: 140, cur: w(75), prev: null }).key, 'not_enough_data'))
test('position 8 to 20 is striking distance', () => assert.equal(decide({ ...base, ageDays: 60, cur: w(400, 3, 12.4), prev: null }).key, 'striking_distance'))
test('top 10 with poor click through gets a title test', () => assert.equal(decide({ ...base, ageDays: 60, cur: w(500, 2, 6), prev: null }).key, 'title_test'))
test('a 30% fall is a refresh', () => assert.equal(decide({ ...base, ageDays: 120, cur: w(200, 4, 5), prev: w(400, 8, 5) }).key, 'declining'))
test('strong page is left alone', () => assert.equal(decide({ ...base, ageDays: 120, cur: w(300, 30, 3), prev: w(280, 25, 3) }).key, 'winning'))
test('traffic without sign ups points at the CTA', () => assert.equal(decide({ ...base, ageDays: 60, cur: w(300, 5, 5, 80), prev: null }).key, 'cta'))
test('a page refreshed within 28 days is left alone', () => assert.equal(decide({ ...base, ageDays: 10, baselineKind: 'refreshed', cur: w(400, 3, 12), prev: null }).key, 'recently_refreshed'))
test('a refresh older than 28 days is judged again', () => assert.notEqual(decide({ ...base, ageDays: 40, baselineKind: 'refreshed', cur: w(400, 3, 12), prev: null }).key, 'recently_refreshed'))
