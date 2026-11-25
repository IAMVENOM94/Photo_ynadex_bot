import {test} from 'node:test';
import assert from 'node:assert/strict';
import {headers,validBadge,validName,rowForBadge,quotedSheet} from '../tgcloud/lib/logic.js';
test('badge preserves zeros and rejects path traversal',()=>{assert.ok(validBadge('00123'));assert.ok(!validBadge('../x'));});
test('names',()=>{assert.ok(validName('Анна-Мария'));assert.ok(!validName('=1+1'));});
test('find existing or new badge',()=>{const rows=[headers,['Иван','Иванов','001','https://x']];assert.equal(rowForBadge(rows,'001'),2);assert.equal(rowForBadge(rows,'002'),null);});
test('reject duplicate and incorrect headers',()=>{assert.throws(()=>rowForBadge([headers,['a','b','1'],['c','d','1']],'1'));assert.throws(()=>rowForBadge([['wrong']],'1'));});
test('escape sheet tab name',()=>assert.equal(quotedSheet("O'Brien"),"'O''Brien'"));
