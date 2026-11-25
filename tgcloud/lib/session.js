import { db } from 'sdk';
import { sql } from 'sdk/db';
export const getDraft = id => db.get(sql`SELECT * FROM drafts WHERE user_id=${id}`);
export const clearDraft = id => db.run(sql`DELETE FROM drafts WHERE user_id=${id}`);
export async function begin(id){
  await db.run(sql`INSERT INTO drafts(user_id,stage) VALUES(${id},'badge') ON CONFLICT(user_id) DO NOTHING`);
  return getDraft(id);
}
export const setBadge = (id,badge) => db.run(sql`UPDATE drafts SET badge=${badge},stage='first' WHERE user_id=${id} AND stage='badge'`);
export const setFirst = (id,first) => db.run(sql`UPDATE drafts SET first=${first},stage='last' WHERE user_id=${id} AND stage='first'`);
export const setLast = (id,last) => db.run(sql`UPDATE drafts SET last=${last},stage='photo' WHERE user_id=${id} AND stage='last'`);
export const setPhoto = (id,file) => db.run(sql`UPDATE drafts SET file_id=${file},stage='retry' WHERE user_id=${id} AND stage='photo'`);
export const setUrl = (id,url) => db.run(sql`UPDATE drafts SET public_url=${url} WHERE user_id=${id} AND stage='retry'`);
export async function acquire(owner){
  const now=Date.now();
  const r=await db.run(sql`INSERT INTO locks(name,owner,expires) VALUES('save',${owner},${now+600000}) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE locks.expires<${now}`);
  return r.rowsAffected===1;
}
export const release = owner => db.run(sql`DELETE FROM locks WHERE name='save' AND owner=${owner}`);
