const test=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const L=require('../src/live-update.js');
function fixture(html){const {document}=parseHTML('<html><body></body></html>');const tree=value=>{const n=document.createElement('div');n.className='motion-layer';n.innerHTML=value;return n;};const root=tree(html);document.body.append(root);L.seed(root);return{document,root,tree,patch:html=>L.patch(root,tree(html))};}
test('resource changes retain the hovered card, skin, animated number and event listeners',()=>{
 const h=fixture('<div class="resource-card" data-resource-card="commendations"><strong>0</strong><button data-resource="commendations:1">+</button></div>');
 const card=h.root.firstChild,number=card.querySelector('strong'),button=card.querySelector('button'),skin=h.document.createElement('i');skin.className='frame-skin';card.prepend(skin);card.classList.add('kinetic-frame','frame-info','motion-hover');card.dataset.hoverBound='true';card.style.setProperty('--frame-edge','32px');let clicks=0;button.addEventListener('click',()=>clicks++);
 h.patch('<div class="resource-card" data-resource-card="commendations"><strong class="debt">-1</strong><button data-resource="commendations:1">+</button></div>');
 assert.equal(h.root.firstChild,card);assert.equal(card.querySelector('.frame-skin'),skin);assert.equal(card.querySelector('strong'),number);assert.equal(number.textContent,'-1');assert.equal(number.classList.contains('debt'),true);assert.equal(card.classList.contains('motion-hover'),true);assert.equal(card.dataset.hoverBound,'true');assert.equal(card.style.getPropertyValue('--frame-edge'),'32px');button.click();assert.equal(clicks,1);
});
test('adding and removing a reward does not replace adjacent keyed panels',()=>{
 const h=fixture('<section class="panel" data-live-key="qa"><b>3</b></section><section class="panel" data-live-key="life"><p>0</p></section>'),qa=h.root.firstChild,life=h.root.lastChild;
 h.patch('<section class="panel" data-live-key="qa"><b>2</b></section><div class="reward">奖励</div><section class="panel" data-live-key="life"><p>1</p></section>');assert.equal(h.root.firstChild,qa);assert.equal(h.root.lastChild,life);assert.equal(qa.textContent,'2');assert.equal(life.textContent,'1');
 h.patch('<section class="panel" data-live-key="qa"><b>1</b></section><section class="panel" data-live-key="life"><p>2</p></section>');assert.equal(h.root.lastChild,life);assert.equal(h.root.querySelector('.reward'),null);
});
test('editing within a transition wrapper preserves the wrapper and its existing card',()=>{
 const h=fixture('<div class="editor-content"><section class="panel"><output>3</output></section></div>'),content=h.root.firstChild,card=content.firstChild;
 const layer=h.document.createElement('div');layer.className='motion-layer';layer.append(card);content.append(layer);L.seed(layer);
 h.patch('<div class="editor-content"><section class="panel"><output>2</output></section></div>');assert.equal(content.firstChild,layer);assert.equal(layer.firstChild,card);assert.equal(card.textContent,'2');
});
test('controls, SVG triangles and a staged fingerprint keep their nodes while values and states change',()=>{
 const h=fixture('<div class="identity-name-row"><input id="name" value="林零"><button id="fingerprint-pad" aria-pressed="false"></button></div><svg><polygon class="filled" fill="red"/></svg>');const input=h.root.querySelector('input'),finger=h.root.querySelector('button'),poly=h.root.querySelector('polygon');
 h.patch('<div class="identity-name-row"><input id="name" value="林零"><button id="fingerprint-pad" aria-pressed="true"></button></div><svg><polygon class="spent" fill="none"/></svg>');
 assert.equal(h.root.querySelector('input'),input);assert.equal(h.root.querySelector('button'),finger);assert.equal(h.root.querySelector('polygon'),poly);assert.equal(finger.getAttribute('aria-pressed'),'true');assert.equal(poly.getAttribute('fill'),'none');
});
test('source attributes may clear while runtime scroll, hover and frame styles remain',()=>{
 const h=fixture('<div class="panel" aria-disabled="true" style="color:red;width:10px"><input value="a"></div>');const panel=h.root.firstChild;panel.style.setProperty('--frame-polygon','triangle');panel.dataset.scrollState='inertia';
 h.patch('<div class="panel" style="color:blue"><input value="b"></div>');assert.equal(panel.getAttribute('aria-disabled'),null);assert.equal(panel.style.getPropertyValue('width'),undefined);assert.equal(panel.style.getPropertyValue('color'),'blue');assert.equal(panel.style.getPropertyValue('--frame-polygon'),'triangle');assert.equal(panel.dataset.scrollState,'inertia');assert.equal(panel.querySelector('input').value,'b');
});
