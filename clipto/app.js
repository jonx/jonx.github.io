import { convert, htmlToPlain, previewDocument, MAX_LENGTH } from './convert.js';
const $=id=>document.getElementById(id);
const meta={rich:{name:'Texte enrichi',copy:'Copier le texte enrichi',ext:'.html',help:'Du HTML et du texte brut, pour les applications qui acceptent le collage avec mise en forme.'},markdown:{name:'Markdown',copy:'Copier le Markdown',ext:'.md',help:'Des titres, des listes et des liens, prêts pour votre éditeur Markdown.'},plain:{name:'Texte brut',copy:'Copier le texte brut',ext:'.txt',help:'Le contenu sans syntaxe Markdown ni mise en forme. Les liens et les retours à la ligne restent lisibles.'},html:{name:'Code HTML',copy:'Copier le code HTML',ext:'.html',help:'Le code HTML comme texte, prêt à être collé dans un éditeur. Pour le rendu visuel, choisissez Texte enrichi.'}};
let source={text:'',html:'',types:[]},target='markdown',result=null,loading=false,copying=false;
const mimeNames={'text/plain':'Texte','text/html':'HTML','text/rtf':'RTF · non converti','application/rtf':'RTF · non converti','image/png':'Image PNG · non convertie','Files':'Fichier · non converti'};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function setSource(next,origin){
  source=next;$('input').value=next.text||'';$('input-mode').value='auto';$('source-origin').textContent=origin;
  $('formats').replaceChildren();
  for(const type of next.types){const chip=document.createElement('span');chip.className='format-chip'+(!['text/plain','text/html'].includes(type)?' unsupported':'');chip.textContent=mimeNames[type]||type;chip.title=type;$('formats').append(chip);}
  if(!next.types.length){const chip=document.createElement('span');chip.className='empty-chip';chip.textContent='En attente de contenu';$('formats').append(chip);}
  render();
}
function render(){
  const info=meta[target],has=Boolean(source.text||source.html);
  $('preview-title').textContent='APERÇU · '+info.name.toLocaleUpperCase('fr');$('target-help').textContent=info.help;$('extension').textContent=info.ext;
  $('copy').replaceChildren(document.createTextNode(info.copy+' '));const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');$('copy').append(arrow);
  result=null;
  try{if(has)result=convert(source,target,$('input-mode').value);}catch(e){status(e.message,true);}
  $('empty-state').hidden=Boolean(result);$('output').hidden=!result||target==='rich';$('rich-preview').hidden=!result||target!=='rich';
  $('copy').disabled=!result||loading||copying;$('download').disabled=!result;$('clear').disabled=!has;$('read').disabled=loading;
  $('count').textContent=new Intl.NumberFormat('fr').format(result?.text.length||0)+' caractère'+((result?.text.length||0)>1?'s':'');
  $('output').value=result?.text||'';
  if(result&&target==='rich')$('rich-preview').srcdoc=previewDocument(result.html);else $('rich-preview').removeAttribute('srcdoc');
  $('copy-hint').textContent=target==='rich'?'La mise en forme finale dépend de l’application de destination.':'Copié en texte uniquement, sans ancien format HTML ou RTF.';
  document.querySelectorAll('[data-target]').forEach(b=>{b.classList.toggle('selected',b.dataset.target===target);b.setAttribute('aria-pressed',String(b.dataset.target===target));});
}

$('read').addEventListener('click',async()=>{
  if(loading)return;loading=true;render();status('Lecture du presse-papiers…');
  try{
    if(!navigator.clipboard)throw new Error('Accès direct indisponible. Collez votre contenu dans la zone de gauche.');
    let next={text:'',html:'',types:[]};
    if(navigator.clipboard.read){
      const items=await navigator.clipboard.read();
      // Text apps normally expose one item. Never combine formats from unrelated items.
      const item=items.find(i=>i.types.includes('text/html')||i.types.includes('text/plain'))||items[0];
      if(item){next.types=[...item.types];for(const type of ['text/plain','text/html'])if(item.types.includes(type)){const blob=await item.getType(type);if(blob.size>MAX_LENGTH*4)throw new Error('Ce contenu est trop long. Essayez de copier un extrait.');next[type==='text/plain'?'text':'html']=await blob.text();}}
      if(items.length>1)status('Plusieurs éléments détectés : le premier élément textuel est utilisé.');
    }else{
      next.text=await navigator.clipboard.readText();next.types=['text/plain'];
    }
    if(!next.text&&next.html)next.text=htmlToPlain(next.html);
    setSource(next,'Presse-papiers');
    if(next.text||next.html)status('Contenu lu. Choisissez un format, puis copiez le résultat.');
    else status(next.types.length?'Les formats détectés ne contiennent pas de texte convertible. Essayez de copier une sélection de texte.':'Le presse-papiers ne contient pas de texte.',true);
  }catch(e){
    status(e.name==='NotAllowedError'||e.name==='SecurityError'?'Lecture non autorisée. Cliquez dans la zone de gauche et collez avec le raccourci habituel.':e.message,true);$('input').focus();
  }finally{loading=false;render();}
});

$('input').addEventListener('paste',e=>{
  const data=e.clipboardData;if(!data)return;
  const text=data.getData('text/plain'),html=data.getData('text/html');
  e.preventDefault();
  if(text.length>MAX_LENGTH||html.length>MAX_LENGTH){status('Ce contenu est trop long. Collez un extrait de moins de 200 000 caractères.',true);return;}
  setSource({text:text||htmlToPlain(html),html,types:[...data.types]},'Collage manuel');
  status(text||html?'Contenu collé. Les formats fournis par le navigateur sont affichés ci-dessus.':'Ce collage ne contient pas de texte convertible.',!(text||html));
});
$('input').addEventListener('input',()=>{const mode=$('input-mode').value;setSource({text:$('input').value,html:'',types:$('input').value?['text/plain']:[]},'Texte édité');$('input-mode').value=mode;status('');render();});
$('input-mode').addEventListener('change',()=>{status('');render();});
document.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>{target=b.dataset.target;status('');render();}));
$('clear').addEventListener('click',()=>{setSource({text:'',html:'',types:[]},'');status('Contenu effacé de cette page. Le presse-papiers système reste inchangé.');$('input').focus();});
$('example').addEventListener('click',()=>{
  const html='<h2>Les idées circulent.</h2><p>Bonjour <strong>l’équipe</strong>,<br>Voici les points pour notre prochain échange :</p><ul><li>Finaliser la <strong>présentation</strong></li><li>Partager les retours dans <em>Slack</em></li><li>Préparer la réunion de jeudi</li></ul><p>Le <a href="https://github.com/jonx/clip-to">projet ClipTo</a> rassemble les détails.</p><p>À bientôt,<br>John</p>';
  setSource({text:htmlToPlain(html),html,types:['text/plain','text/html']},'Exemple');
  status('Exemple chargé. Votre presse-papiers n’a pas été lu ni modifié.');
});
$('copy').addEventListener('click',async()=>{
  if(!result||copying)return;const selected=target,payload={...result};copying=true;$('copy').disabled=true;status('Copie en cours…');
  try{
    if(!navigator.clipboard)throw new Error('Copie directe indisponible. Sélectionnez le résultat et copiez-le manuellement, ou téléchargez-le.');
    if(selected==='rich'){
      if(!window.ClipboardItem||!navigator.clipboard.write||(ClipboardItem.supports&&!ClipboardItem.supports('text/html')))throw new Error('Ce navigateur ne permet pas la copie enrichie ici. Téléchargez le HTML ou choisissez un format texte.');
      // Write immediately in the click handler, preserving Safari user activation.
      await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([payload.html],{type:'text/html'}),'text/plain':new Blob([payload.text],{type:'text/plain'})})]);
    }else await navigator.clipboard.writeText(payload.text);
    status(meta[selected].name+' copié. Vous pouvez maintenant le coller dans votre application.');
  }catch(e){status(e.name==='NotAllowedError'?'Copie non autorisée. Sélectionnez le résultat pour le copier manuellement, ou utilisez le téléchargement.':e.message,true);if(selected!=='rich'){$('output').focus();$('output').select();}}finally{copying=false;$('copy').disabled=!result||loading;}
});
$('download').addEventListener('click',()=>{
  if(!result)return;const html=target==='rich'?previewDocument(result.html,true):result.text;
  const blob=new Blob([html],{type:target==='rich'||target==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='clipto'+meta[target].ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Résultat téléchargé.');
});
if(/Mac|iPhone|iPad/.test(navigator.platform))$('paste-key').textContent='⌘ V';
render();
