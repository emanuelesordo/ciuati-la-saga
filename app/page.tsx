import Link from 'next/link';
import NarrativeInput from './components/NarrativeInput';

const destinations=[
 {href:'/personaggi',icon:'♜',title:'La Cerchia',detail:'Incontra i sei Ciuati'},
 {href:'/archivio-personaggi',icon:'⚔',title:'Le Fazioni',detail:'Alleati, rivali e misteri'},
 {href:'/cronache',icon:'✦',title:'Le Cronache',detail:'Le pagine della leggenda'},
 {href:'/luoghi',icon:'⌖',title:'Atlante',detail:'Esplora le terre della Saga'}
];
export default function Home(){
 return <main className="shell saga-home">
  <header className="saga-home-header">
   <span className="saga-home-kicker">LE CRONACHE DEI CIUATI</span>
   <Link className="saga-home-account" href="/accedi">Accedi <span aria-hidden="true">↗</span></Link>
  </header>
  <section className="saga-home-hero" aria-labelledby="saga-home-title">
   <div className="saga-home-crest" aria-hidden="true">⚔</div>
   <div className="saga-home-copy">
    <span className="saga-home-chapter">UN MONDO DI LEGGENDE IMPROBABILI</span>
    <h1 id="saga-home-title">CIUATI <span>LA SAGA</span></h1>
    <p>Sei destini. Una cerchia. Un'epopea in cui perfino il campo di battaglia può diventare un campo da gioco.</p>
    <div className="saga-home-actions"><Link className="saga-home-primary" href="/cronache">Entra nella Saga <span aria-hidden="true">→</span></Link><Link className="saga-home-secondary" href="/personaggi">Scopri i Ciuati</Link></div>
   </div>
  </section>
  <section className="saga-home-menu" aria-labelledby="saga-menu-title">
   <div className="saga-home-section-title"><h2 id="saga-menu-title">Scegli il tuo percorso</h2><span>MENU DELLA SAGA</span></div>
   <div className="saga-home-destinations">{destinations.map((d,i)=><Link className="saga-home-destination" href={d.href} key={d.href}><span className="saga-home-destination-icon" aria-hidden="true">{d.icon}</span><span className="saga-home-destination-copy"><strong>{d.title}</strong><small>{d.detail}</small></span><span className="saga-home-destination-arrow" aria-hidden="true">→</span></Link>)}</div>
  </section>
  <section className="saga-home-teaser"><span className="saga-home-chapter">DALLE CRONACHE</span><h2>Il richiamo dell'Auronerum</h2><p>Una congregazione giallonera, una cerchia di improbabili eroi e una rivalità destinata a lasciare il segno.</p><Link href="/cronache">Esplora le cronache →</Link></section>
  <details className="saga-home-contribute"><summary>Contribuisci alla leggenda <span aria-hidden="true">＋</span></summary><NarrativeInput/></details>
 </main>;
}
