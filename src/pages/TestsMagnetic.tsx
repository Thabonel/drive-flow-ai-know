import React, { useMemo } from 'react';
import {
  applyMagneticReflow,
  itemsToBlocks,
  getMinutesFromMidnight,
  createTimestampFromMinutes,
  MagneticTimelineItem,
} from '@/lib/magneticTimelineUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function makeItem(id: string, startMin: number, duration: number, opts?: Partial<MagneticTimelineItem>): MagneticTimelineItem {
  return {
    id,
    user_id: 'test',
    title: id,
    start_time: createTimestampFromMinutes(startMin, new Date()),
    duration_minutes: duration,
    color: '#3b82f6',
    is_locked_time: false,
    is_flexible: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...opts,
  } as MagneticTimelineItem;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  const results: { name: string; ok: boolean; details?: string }[] = [];

  // Test 1: Proportional expansion removes internal gap between items
  try {
    // Item A (60m), gap 60m, Item B (120m)
    const items = [
      makeItem('A', 60, 60, { is_flexible: true, original_duration: 60 }),
      makeItem('B', 180, 120, { is_flexible: true, original_duration: 120 }),
    ];
    const re = applyMagneticReflow(items);
    const blocks = itemsToBlocks(re).sort((a, b) => a.startMinutes - b.startMinutes);
    // After reflow, items should be contiguous: B starts when A ends
    assert(blocks[0].endMinutes === blocks[1].startMinutes, 'Items are not contiguous after reflow');
    // Gap was 60; proportional split: weights 60 and 120 => 1:2 => expansions 20 and 40 (sum 60)
    const a = re.find(i => i.title === 'A')!;
    const b = re.find(i => i.title === 'B')!;
    assert(a.duration_minutes === 80, `Expected A=80, got ${a.duration_minutes}`);
    assert(b.duration_minutes === 160, `Expected B=160, got ${b.duration_minutes}`);
    results.push({ name: 'Proportional gap fill', ok: true });
  } catch (e: any) {
    results.push({ name: 'Proportional gap fill', ok: false, details: e?.message });
  }

  // Test 2: Overlap resolution clamps min duration and shifts next if needed
  try {
    // Current (flexible 30m) from 60..90, Next (unlocked) starting at 80 for 60m -> 10m overlap
    const items = [
      makeItem('C', 60, 30, { is_flexible: true }),
      makeItem('D', 80, 60, { is_locked_time: false, is_flexible: false }),
    ];
    const re = applyMagneticReflow(items);
    const c = re.find(i => i.title === 'C')!;
    const d = re.find(i => i.title === 'D')!;
    const cEnd = getMinutesFromMidnight(c.start_time) + c.duration_minutes;
    const dStart = getMinutesFromMidnight(d.start_time);
    assert(cEnd <= dStart, 'Overlap not resolved');
    assert(c.duration_minutes >= 15, 'Compressed below 15 minutes');
    results.push({ name: 'Overlap resolution clamp + shift', ok: true });
  } catch (e: any) {
    results.push({ name: 'Overlap resolution clamp + shift', ok: false, details: e?.message });
  }

  // Test 3: Locked item stays in place when filling gaps by shifting
  try {
    const items = [
      makeItem('Lock', 100, 30, { is_locked_time: true, is_flexible: false }),
      makeItem('Flex', 200, 30, { is_flexible: true }),
    ];
    const re = applyMagneticReflow(items);
    const locked = re.find(i => i.title === 'Lock')!;
    assert(getMinutesFromMidnight(locked.start_time) === 100, 'Locked item moved');
    results.push({ name: 'Locked items do not move', ok: true });
  } catch (e: any) {
    results.push({ name: 'Locked items do not move', ok: false, details: e?.message });
  }

  return results;
}

export default function TestsMagnetic() {
  const results = useMemo(runTests, []);
  const okCount = results.filter(r => r.ok).length;

  return (
    <div className="container mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Magnetic Timeline Algorithm Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            {okCount}/{results.length} tests passed
          </div>
          <ul className="space-y-2">
            {results.map((r, idx) => (
              <li key={idx} className={r.ok ? 'text-green-600' : 'text-red-600'}>
                {r.ok ? '✓' : '✗'} {r.name}
                {!r.ok && r.details && (
                  <div className="text-xs text-muted-foreground">{r.details}</div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

