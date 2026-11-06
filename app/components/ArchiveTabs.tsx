import Link from 'next/link';

type Section = 'ciuati' | 'antagonisti' | 'altri';

export default function ArchiveTabs({active}:{active:Section}) {
 const tabs: {id:Section;title:string;href:string}[] = [
  {id:'ciuati',title:'Ciuati',href:'/personaggi'},
  {id:'antagonisti',title:'Antagonisti',href:'/archivio-personaggi?categoria=antagonisti'},
  {id:'altri',title:'Altri personaggi',href:'/archivio-personaggi?categoria=altri'}
 ];
 return <nav className="archive-tabs" aria-label="Categorie dell'archivio">
  {tabs.map(tab=><Link key={tab.id} href={tab.href} aria-current={active===tab.id?'page':undefined}>{tab.title}</Link>)}
 </nav>;
}
