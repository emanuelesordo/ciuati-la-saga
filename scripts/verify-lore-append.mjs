#!/usr/bin/env node
// Identikit are editorially revisable. Append-only applies only to narrative history.
import {execFileSync} from 'node:child_process';
const [base,head]=process.argv.slice(2);
if(!base||!head){console.error('Usage: verify-lore-append.mjs <base-ref> <head-ref>');process.exit(2);}
const git=(...args)=>execFileSync('git',args,{encoding:'buffer',maxBuffer:10*1024*1024});
const files=git('diff','--name-only','--diff-filter=ACDMR',base,head,'--','lore/relazioni/','lore/eventi/').toString('utf8').split('\n').filter(Boolean);
let failed=false;
for(const file of files){
 if(!/^lore\/(relazioni|eventi)\/[a-z0-9-]+\.md$/.test(file)){console.error('Invalid historical lore path:',file);failed=true;continue;}
 let oldValue,newValue;
 try{oldValue=git('show',base+':'+file);}catch{console.log('New history file requires editorial review:',file);continue;}
 try{newValue=git('show',head+':'+file);}catch{console.error('History file removed:',file);failed=true;continue;}
 if(newValue.length<=oldValue.length||!newValue.subarray(0,oldValue.length).equals(oldValue)){console.error('Non-append historical change blocked:',file);failed=true;continue;}
 const added=newValue.subarray(oldValue.length).toString('utf8');
 if(!/^\s*### \d{4}-\d{2}-\d{2} · /.test(added)){console.error('Append missing dated heading:',file);failed=true;continue;}
 console.log('Append-only validated:',file);
}
if(!files.length)console.log('No append-only history changed.');
if(failed)process.exit(1);
