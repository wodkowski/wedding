import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
export const main={firstName:'Anna',lastName:'Testowa',attendance:'yes',menu:'classic',stay:'no',notes:'Wiadomość',email:'anna@example.com'};
export const invited={firstName:'Jan',lastName:'Testowy',attendance:'yes',menu:'vegan',stay:'yes',phone:'+48 600 123 456'};
export function harness() {
  const tables={Zgloszenia:[['Data wpisu (Europe/Warsaw)','Imię','Nazwisko','Obecność','Menu','Nocleg','Alergie','Uwagi']]};
  let held=false,writes=0,now=Date.parse('2026-10-30T11:34:56Z'),selection=null;
  const properties=new Map([['SPREADSHEET_ID','book']]);
  const dateCalls=[],copies=[],triggers=[];
  const cloud={failCopy:false,folders:0};
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const sheet=name=>tables[name]&&({
    getName:()=>name,getLastRow:()=>tables[name].length,
    getDataRange:()=>({getValues:()=>tables[name].map(row=>row.slice())}),
    appendRow:row=>tables[name].push(row),setFrozenRows(){},insertColumnsAfter:(column,count)=>tables[name].forEach(row=>row.splice(column,0,...Array(count).fill(''))),
    getRange:(r,c)=>({getValue:()=>tables[name][r-1]?.[c-1],setValues:rows=>{writes++;rows.forEach((row,i)=>{tables[name][r-1+i]||=[];row.forEach((value,j)=>{tables[name][r-1+i][c-1+j]=value;});});}})
  });
  const book={getId:()=> 'book',getSheetByName:sheet,insertSheet:name=>{tables[name]=[];return sheet(name);},getActiveRange:()=>selection};
  const folder={getId:()=> 'folder1'};
  const formatDate=(date,zone,format)=>{
    dateCalls.push({date,zone,format});
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
    const mapping={yyyy:parts.year,MM:parts.month,dd:parts.day,HH:parts.hour,mm:parts.minute,ss:parts.second};
    return format.replace(/yyyy|MM|dd|HH|mm|ss/g,key=>mapping[key]);
  };
  const context=vm.createContext({
    Date:ClockDate,console,
    LockService:{getScriptLock:()=>({waitLock:()=>{if(held)throw Error('Nested lock');held=true;},hasLock:()=>held,releaseLock:()=>{held=false;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key)||null,setProperty:(key,value)=>properties.set(key,value)})},
    SpreadsheetApp:{openById:()=>book,getActiveSpreadsheet:()=>book,flush(){}},
    Utilities:{getUuid:randomUUID,formatDate},
    DriveApp:{createFolder:()=>{cloud.folders++;return folder;},getFolderById:()=>folder,getFileById:()=>({makeCopy:name=>{
      if(cloud.failCopy)throw Error('Drive unavailable');
      const url='https://example.test/copy/'+(copies.length+1);
      copies.push({name,url,tables:structuredClone(tables)});return {getUrl:()=>url};
    }})},
    ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:handler=>{
      const trigger={handler,getHandlerFunction:()=>handler};
      const builder={timeBased:()=>builder,atHour:value=>{trigger.hour=value;return builder;},everyDays:value=>{trigger.days=value;return builder;},inTimezone:value=>{trigger.zone=value;return builder;},create:()=>{triggers.push(trigger);return trigger;}};
      return builder;
    }},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>JSON.parse(value)})}
  });
  vm.runInContext(readFileSync(new URL('../../google-apps-script/Code.gs',import.meta.url),'utf8'),context);
  return {setProtection:patch=>vm.runInContext('Object.assign(PROTECTION,'+JSON.stringify(patch)+')',context),tables,context,dateCalls,properties,copies,triggers,cloud,get writes(){return writes;},advance:ms=>{now+=ms;},selectRows:(first,last=first)=>{selection={getSheet:()=>sheet('Do sprawdzenia'),getRow:()=>first,getLastRow:()=>last};},send:(people=[main],extra={})=>context.doPost({postData:{contents:JSON.stringify({version:7,people,...extra})}})};
}
