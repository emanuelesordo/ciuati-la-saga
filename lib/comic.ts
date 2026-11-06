import {createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';

export type ComicDialogue={speaker:string;text:string};
export type ComicPanel={
 id:string;run_id:string;panel_number:number;source_hash:string;scene:string;
 caption:string;dialogue:ComicDialogue[];cast_names:string[];mentions:string[];
 image_path:string|null;status:string;error_message:string|null;
};
export type ComicSupporting={id:string;slug:string;display_name:string;description:string;portrait_path:string|null};
export type ComicMain={id:string;slug:string;display_name:string;avatar_path:string|null;biography:string};
export const COMIC_BUCKET='comic-drafts';
export const comicHash=(text:string)=>createHash('sha256').update(text).digest('hex');
export const slugifyComic=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
export const normalComic=(name:string)=>slugifyComic(name.trim());
export const isUuid=(x:unknown):x is string=>typeof x==='string'&&/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(x);
export const shortComicText=(x:unknown,max:number):string=>typeof x==='string'?x.trim().slice(0,max):'';
export const comicNames=(x:unknown):string[]=>Array.isArray(x)?[...new Set(x.filter((v):v is string=>typeof v==='string').map(v=>v.trim().slice(0,100)).filter(Boolean))].slice(0,20):[];
export const comicDialogue=(x:unknown):ComicDialogue[]=>Array.isArray(x)?x.slice(0,7).filter(v=>v&&typeof v==='object').map(v=>({speaker:shortComicText(v.speaker,80),text:shortComicText(v.text,250)})).filter(v=>v.text):[];
export async function adminComicClient(request:NextRequest):Promise<{db:SupabaseClient;userId:string}>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Configurazione database incompleta.');
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer '))throw new Error('Accesso amministratore richiesto.');
 const token=header.slice(7);
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user||user.app_metadata?.role!=='admin')throw new Error('Accesso amministratore non autorizzato.');
 return {db,userId:user.id};
}
export async function comicCharacters(db:SupabaseClient){
 const [mainResult,supportResult]=await Promise.all([
  db.from('characters').select('id,slug,display_name,avatar_path,biography').eq('is_published',true),
  db.from('comic_supporting_characters').select('id,slug,display_name,description,portrait_path')
 ]);
 if(mainResult.error||supportResult.error)throw new Error('Personaggi non disponibili.');
 return {main:(mainResult.data||[]) as ComicMain[],support:(supportResult.data||[]) as ComicSupporting[]};
}
export function resolveComicName(name:string,main:ComicMain[],support:ComicSupporting[]){
 const key=normalComic(name);
 const aliases:Record<string,string>={'cece':'cece','ceceno':'cece','viper':'scema','scema':'scema','fromage':'le-fromage','le-fromage':'le-fromage'};
 const mainKey=aliases[key]||key;
 const character=main.find(c=>normalComic(c.slug)===mainKey||normalComic(c.display_name)===key);
 if(character)return {ready:!!character.avatar_path,kind:'main' as const,character};
 const side=support.find(c=>normalComic(c.slug)===key||normalComic(c.display_name)===key);
 if(side)return {ready:!!side.portrait_path&&side.description.trim().length>=15,kind:'support' as const,character:side};
 return {ready:false,kind:'missing' as const,character:null};
}
