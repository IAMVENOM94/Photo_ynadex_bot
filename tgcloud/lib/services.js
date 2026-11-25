import { api, fetch } from 'sdk';
import config from './config.js';
import { headers, rowForBadge, quotedSheet } from './logic.js';
const ybase='https://cloud-api.yandex.net/v1/disk/resources';
const enc=encodeURIComponent;
function check(r,label){ if(!r.ok) throw new Error(label+' HTTP '+r.status); return r; }
async function ycall(suffix,method,path,extra=''){
  return fetch(ybase+suffix+'?path='+enc(path)+extra,{method,headers:{Authorization:'OAuth '+config.yandexToken}});
}
export async function uploadPhoto(fileId,badge){
  const root=config.yandexRoot.replace(/\/$/,'');
  const dir=await ycall('','PUT',root);
  if(dir.status!==409) check(dir,'Disk folder');
  else { const meta=await check(await ycall('','GET',root),'Disk folder').json(); if(meta.type!=='dir') throw new Error('Disk root not directory'); }
  const path=root+'/'+badge+'.jpg';
  const bytes=await api.getFileContent(fileId);
  if(bytes.length>20*1024*1024) throw new Error('Photo too large');
  const link=await check(await ycall('/upload','GET',path,'&overwrite=true'),'Disk upload URL').json();
  if(typeof link.href!=='string'||!link.href.startsWith('https://')) throw new Error('Bad upload URL');
  check(await fetch(link.href,{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:bytes}),'Disk upload');
  const publication=await ycall('/publish','PUT',path);
  if(publication.status!==409) check(publication,'Disk publish');
  const meta=await check(await ycall('','GET',path,'&fields=public_url'),'Disk metadata').json();
  if(typeof meta.public_url!=='string'||!meta.public_url.startsWith('https://')) throw new Error('Missing public URL');
  return meta.public_url;
}
async function googleToken(){
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:fetch.body.form({
    client_id:config.googleClientId,client_secret:config.googleClientSecret,
    refresh_token:config.googleRefreshToken,grant_type:'refresh_token'
  })});
  const data=await check(r,'Google OAuth').json();
  if(!data.access_token) throw new Error('Missing access token');
  return data.access_token;
}
export async function writeRow(draft,url){
  const token=await googleToken();
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+enc(config.spreadsheetId)+'/values/';
  const tab=quotedSheet(config.sheetName);
  const h={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const req=async(range,method='GET',query='',values)=>{
    const options={method,headers:h};
    if(values) options.body=JSON.stringify({values});
    return check(await fetch(base+enc(range)+query,options),'Sheets '+method).json();
  };
  let rows=(await req(tab+'!A:D')).values??[];
  if(!rows.length){await req(tab+'!A1:D1','PUT','?valueInputOption=RAW',[headers]); rows=[headers];}
  const row=rowForBadge(rows,draft.badge);
  const values=[[draft.first,draft.last,draft.badge,url]];
  if(row) await req(tab+'!A'+row+':D'+row,'PUT','?valueInputOption=RAW',values);
  else {
    const r=await fetch(base+enc(tab+'!A:D')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',headers:h,body:JSON.stringify({values})});
    check(r,'Sheets append');
  }
}
