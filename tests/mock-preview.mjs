// Wyłącznie lokalne QA: prywatny arkusz jest zastąpiony fikcyjnymi danymi w pamięci.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {harness} from './support/google-fixture.mjs';
const fixture=harness();
const root=resolve('.');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/test-api' && req.method==='POST') {
      let body='';for await(const chunk of req) {body+=chunk;if(body.length>500000)throw Error('Too large');}
      const data=JSON.parse(body);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(fixture.send(data.people,data)));return;
    }
    if(pathname==='/test-records') {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(fixture.tables.Zgloszenia));return;}
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
    if(!file.startsWith(root+sep))throw Error('Invalid path');
    let body=await readFile(file);
    if(pathname==='/config.js')body=body.toString().replace(/appsScriptUrl:\s*'[^']*'/,"appsScriptUrl: '/test-api'");
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch {res.writeHead(400);res.end('Bad request');}
}).listen(4180,'127.0.0.1',()=>console.log('Testy UI: http://127.0.0.1:4180 (dowolni goście, dopisywanie do arkusza w pamięci)'));
