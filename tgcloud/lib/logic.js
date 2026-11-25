export const headers = ['Имя','Фамилия','Бейдж','Ссылка на файл'];
export function validBadge(s) { return /^[0-9A-Za-zА-Яа-яЁё_-]{1,40}$/.test(s); }
export function validName(s) { return /^[\p{L}][\p{L} .’'-]{0,79}$/u.test(s); }
export function rowForBadge(rows,badge) {
  if (!rows.length) return null;
  if (headers.some((h,i)=>rows[0][i]!==h)) throw new Error('Invalid sheet headers');
  const matches = rows.map((r,i)=>i>0 && String(r[2]??'').trim()===badge ? i+1 : null).filter(Boolean);
  if(matches.length>1) throw new Error('Duplicate badge in sheet');
  return matches[0]??null;
}
export const quotedSheet = name => "'"+name.replace(/'/g,"''")+"'";
