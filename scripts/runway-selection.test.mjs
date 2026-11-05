import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectRunway } from '../src/lib/runwaySelection.mjs';
test('existing visits retain selection and newly added products replace the oldest',()=>{
 const a={id:'a',image:'/a.jpg',created_at:'2026-11-01T00:00:00Z'},b={id:'b',image:'/b.jpg',created_at:'2026-11-02T00:00:00Z'},c={id:'c',image:'/c.jpg',created_at:'2026-11-05T00:00:00Z'};
 const previous={ids:['a','b'],lastSeenAt:'2026-11-04T00:00:00Z'};
 assert.deepEqual(selectRunway([b,a],previous,2).map(p=>p.id),['a','b']);
 assert.deepEqual(selectRunway([c,b,a],previous,2).map(p=>p.id),['c','b']);
 assert.deepEqual(selectRunway([],previous),[]);
 assert.deepEqual(selectRunway([b],previous).map(p=>p.id),['b']);
});
