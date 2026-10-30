import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export const main={firstName:'Anna',lastName:'Testowa',attendance:'yes',menu:'classic',stay:'no',notes:'Wiadomość'};
export const invited={firstName:'Jan',lastName:'Testowy',attendance:'yes',menu:'vegan',stay:'yes'};
export function harness() {
  const tables={Zgloszenia:[['Data wpisu (Europe/Warsaw)','Imię','Nazwisko','Obecność','Menu','Nocleg','Alergie','Uwagi']]};
  let held=false,writes=0;
  const dateCalls=[];
  const sheet=name=>tables[name]&&({
    getLastRow:()=>tables[name].length,
    getDataRange:()=>({getValues:()=>tables[name].map(row=>row.slice())}),
    appendRow:row=>tables[name].push(row),setFrozenRows(){},
    getRange:(r,c)=>({setValues:rows=>{writes++;rows.forEach((row,i)=>{tables[name][r-1+i]||=[];row.forEach((value,j)=>{tables[name][r-1+i][c-1+j]=value;});});}})
  });
  const book={getId:()=> 'book',getSheetByName:sheet,insertSheet:name=>{tables[name]=[];return sheet(name);}};
  const context=vm.createContext({
    LockService:{getScriptLock:()=>({waitLock:()=>{held=true;},hasLock:()=>held,releaseLock:()=>{held=false;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'book',setProperty(){}})},
    SpreadsheetApp:{openById:()=>book,getActiveSpreadsheet:()=>book,flush(){}},
    Utilities:{formatDate:(date,zone,format)=>{dateCalls.push({date,zone,format});return '2026-10-30 12:34:56';}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>JSON.parse(value)})}
  });
  vm.runInContext(readFileSync(new URL('../../google-apps-script/Code.gs',import.meta.url),'utf8'),context);
  return {tables,context,dateCalls,get writes(){return writes;},send:(people=[main],extra={})=>context.doPost({postData:{contents:JSON.stringify({version:4,people,...extra})}})};
}
