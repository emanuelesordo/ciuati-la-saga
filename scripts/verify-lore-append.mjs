#!/usr/bin/env node
// Validate an append-only change between two Git revisions.
// Usage: node scripts/verify-lore-append.mjs <base-ref> <head-ref>
import {execFileSync} from 'node:child_process';
const [base,head]=process.argv.slice(2);
if(!base||!head){console.error('Usage: verify-lore-append.mjs <base-ref> <head-ref>');process.exit(2);}
const git=(...args)=>execFileSync('git',args,{encoding:'buffer',maxBuffer:10*1024*1024});
const changed=git('diff','--name-only','--diff-filter=ACDMR',base,head,'--','lore/personaggi/').toString('utf8').split('\n').filter(Boolean);
let failed=false;
for(const file of changed){
 if(!/^lore\/personaggi\/[a-z0-9-]+\.md$/.test(file)){console.error('Invalid character lore path:',file);failed=true;continue;}
 let oldValue,newValue;
 try{oldValue=git('show',base+':'+file);}catch{console.error('New canon file requires manual initial review:',file);failed=true;continue;}
 try{newValue=git('show',head+':'+file);}catch{console.error('Character lore file removed:',file);failed=true;continue;}
 if(newValue.length<=oldValue.length||!newValue.subarray(0,oldValue.length).equals(oldValue)){
  console.error('Non-append change blocked:',file);failed=true;continue;
 }
 const added=newValue.subarray(oldValue.length).toString('utf8');
 if(!/^\s*### \d{4}-\d{2}-\d{2} · /.test(added)){
  console.error('Append missing dated entry heading:',file);failed=true;continue;
 }
 console.log('Append-only validated:',file);
}
if(!changed.length)console.log('No character lore files changed.');
if(failed)process.exit(1);
