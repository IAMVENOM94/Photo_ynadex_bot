import fs from 'node:fs';
const c=JSON.parse(process.env.BOT_CONFIG_JSON||'{}');
for(const k of ['yandexToken','googleClientId','googleClientSecret','googleRefreshToken','spreadsheetId','sheetName']){
  if(typeof c[k]!=='string'||!c[k].trim()) throw new Error('Missing configuration field: '+k);
}
if(!Array.isArray(c.allowedUserIds)||!c.allowedUserIds.length||!c.allowedUserIds.every(id=>/^\d+$/.test(String(id)))) throw new Error('Missing or invalid allowedUserIds');
c.yandexRoot=c.yandexRoot||'disk:/EmployeePhotos';
if(!/^(disk|app):\/[^/]+$/.test(c.yandexRoot)) throw new Error('Use a single root folder');
fs.writeFileSync('tgcloud/lib/config.js','export default '+JSON.stringify(c)+';\n',{mode:0o600});
