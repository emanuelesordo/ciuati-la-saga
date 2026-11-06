import Link from 'next/link';
import NarrativeInput from '../components/NarrativeInput';
export default function Contributi(){
 return <main className="shell identikit-shell">
  <div className="eyebrow">LE VOCI DELLA CERCHIA</div>
  <h1>Contributi</h1>
  <p>Arricchisci personaggi, relazioni e memoria della Saga oppure proponi uno spunto per un episodio.</p>
  <p><Link href="/personaggi">Ciuati</Link> · <Link href="/archivio-personaggi">Altri personaggi</Link></p>
  <NarrativeInput/>
 </main>;
}
