import { describe, it, expect } from 'vitest';
import { STATUSES, filterApplications, statistics } from '../shared/domain.js';
import { weeklyActivity } from '../src/Charts.jsx';

const items = STATUSES.map((status, index) => ({ id: index + 1, company: index === 0 ? 'HORIZON' : 'Autre', position: 'Développeuse', status, appliedAt: index ? `2026-03-${20 + index}` : '' }));

describe('statistics', () => {
  it('calculates responses among sent applications, interviews and rejections', () => {
    expect(statistics(items)).toEqual({ total: 5, responseRate: 75, interviews: 1, rejected: 1 });
  });
  it('handles an empty database and unsent applications', () => {
    expect(statistics([])).toEqual({ total: 0, responseRate: 0, interviews: 0, rejected: 0 });
    expect(statistics([items[0]]).responseRate).toBe(0);
  });
});
describe('search, filters and sort', () => {
  it('searches company and position without case sensitivity', () => {
    expect(filterApplications(items, { query: ' horizon ' })).toHaveLength(1);
    expect(filterApplications(items, { query: 'DÉVELOPPEUSE' })).toHaveLength(5);
  });
  it('combines status and search', () => {
    expect(filterApplications(items, { query: 'Autre', status: STATUSES[2] }).map((item) => item.id)).toEqual([3]);
  });
  it('sorts application dates and always puts missing dates last without mutating input', () => {
    expect(filterApplications(items).map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
    expect(filterApplications(items, { sort: 'asc' }).map((item) => item.id)).toEqual([2, 3, 4, 5, 1]);
    expect(items[0].id).toBe(1);
  });
});
describe('weekly chart', () => {
  it('includes Monday/Sunday boundaries and excludes future and missing dates', () => {
    const weeks = weeklyActivity([
      { appliedAt: '2026-03-16' }, { appliedAt: '2026-03-22' },
      { appliedAt: '2026-03-23' }, { appliedAt: '2026-03-27' }, { appliedAt: '' },
    ], new Date('2026-03-25T12:00:00'));
    expect(weeks).toHaveLength(8);
    expect(weeks[6].count).toBe(2);
    expect(weeks[7].count).toBe(1);
  });
});
