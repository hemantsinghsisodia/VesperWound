import { Lifetime } from '../core/lifetime';
import { writeChanged } from '../ui/write-changed';
import { CHECKPOINTS, PORTALS, SECTORS } from './definition';
import type { ChapterSimulation } from './simulation';
import type { ChapterPresentation } from './presentation';
import './style.css';
export class ChapterHud {
  private readonly lifetime=new Lifetime();
  private readonly launch=document.createElement('div');
  private readonly panel=document.createElement('section');
  private readonly menu=document.createElement('section');
  private readonly confirm=document.createElement('div');
  private readonly elements=new Map<string,HTMLElement>();
  constructor(private readonly root:HTMLElement,actions:{start(fresh:boolean):void;restart():void;leave():void;retry():void;map():void;cancel():void}){
    this.launch.innerHTML='<p>LAST DEPARTURE · NAVIGATION PREVIEW</p><button id="chapter-new">New chapter</button><button id="chapter-continue" hidden>Continue chapter</button><p id="chapter-launch-status" role="status"></p><button id="chapter-cancel" hidden>Cancel chapter load</button>';
    root.querySelector('#mission-hud')!.append(this.launch);
    this.confirm.hidden=true;this.confirm.innerHTML='<p>Start a new chapter? This replaces your saved chapter progress.</p><button id="chapter-confirm-new">Start new chapter</button><button id="chapter-keep-save">Keep current progress</button>';this.launch.append(this.confirm);
    this.panel.id='chapter-hud';this.panel.hidden=true;this.panel.innerHTML='<small>LAST DEPARTURE · NAVIGATION PREVIEW</small><h2 id="chapter-objective"></h2><p id="chapter-clue"></p><p id="chapter-feedback" role="status"></p><p id="chapter-save-status" role="status"></p><button id="chapter-map-open">District map / pause</button><button id="chapter-retry" hidden>Retry area loading</button><button id="chapter-complete-leave" hidden>Return to practice</button>';
    root.querySelector('.experience')!.append(this.panel);
    this.menu.id='chapter-menu';this.menu.hidden=true;this.menu.innerHTML='<h3>District map</h3><svg id="chapter-map" viewBox="-12 -14 86 74" role="img" aria-label="Discovered district and current objective"></svg><p class="chapter-map-legend">White: Medic · Amber: objective · Mint: opened shortcut</p><p id="chapter-checkpoint"></p><button id="chapter-restart">Restart from checkpoint</button><button id="chapter-leave">Return to practice</button>';
    root.querySelector('#scene-tools-slot')!.prepend(this.menu);
    const click=(id:string,fn:()=>void)=>this.lifetime.listen(this.get(id),'click',fn);
    click('chapter-new',()=>{this.confirm.hidden=false;});click('chapter-confirm-new',()=>{this.confirm.hidden=true;actions.start(true);});click('chapter-keep-save',()=>{this.confirm.hidden=true;});
    click('chapter-continue',()=>actions.start(false));click('chapter-restart',actions.restart);click('chapter-leave',actions.leave);click('chapter-complete-leave',actions.leave);click('chapter-retry',actions.retry);click('chapter-map-open',actions.map);click('chapter-cancel',actions.cancel);
  }
  private get<T extends HTMLElement=HTMLElement>(id:string):T{let e=this.elements.get(id);if(!e){e=this.root.querySelector<HTMLElement>(`#${id}`)!;this.elements.set(id,e);}return e as T;}
  update(chapter:ChapterSimulation|null,view:ChapterPresentation|null,loading:boolean,saveAvailable:boolean,message:string):void {
    const active=chapter?.active??false;
    writeChanged(this.root.dataset,'chapter',active?(chapter!.progress.complete?'complete':chapter!.sector):'inactive');
    writeChanged(this.root.dataset,'chapterLoading',String(loading));
    writeChanged(this.panel,'hidden',!active||this.root.dataset.inspection==='active'||!['running','paused'].includes(this.root.dataset.state??''));
    writeChanged(this.menu,'hidden',!active);writeChanged(this.launch,'hidden',active);
    writeChanged(this.get('chapter-continue'),'hidden',!saveAvailable);writeChanged(this.get<HTMLButtonElement>('chapter-new'),'disabled',loading);writeChanged(this.get<HTMLButtonElement>('chapter-continue'),'disabled',loading);
    writeChanged(this.get('chapter-cancel'),'hidden',!loading);writeChanged(this.get('chapter-launch-status'),'textContent',loading?'Preparing chapter. Practice remains available.':message);
    if(!active||!chapter)return;
    const p=chapter.encounter.player.state,objective=chapter.objective,interaction=chapter.canAct?chapter.interaction:undefined;
    writeChanged(this.get('chapter-objective'),'textContent',objective.title);writeChanged(this.get('chapter-clue'),'textContent',objective.clue);
    writeChanged(this.get('chapter-feedback'),'textContent',view?.errors.size?'Area unavailable. You can backtrack or retry.':chapter.feedback);
    writeChanged(this.get('chapter-save-status'),'textContent',message);writeChanged(this.get('chapter-retry'),'hidden',!view?.errors.size);
    writeChanged(this.get('chapter-complete-leave'),'hidden',!chapter.progress.complete);
    if(interaction)writeChanged(this.get('pickup'),'ariaLabel',interaction.label);
    if(p.weapon==='baton'||interaction){writeChanged(this.get('pickup'),'hidden',!interaction);writeChanged(this.get<HTMLButtonElement>('pickup'),'disabled',false);writeChanged(this.get('pickup'),'textContent',interaction?.id==='hoist'?'Move hoist':interaction?.id.startsWith('checkpoint:')?'Rest / save':interaction?.id.startsWith('gate:')?'Open gate':'Interact');writeChanged(this.get('pickup-status'),'textContent',interaction?`F — ${interaction.label}`:'');}
    writeChanged(this.get('restart-player'),'textContent','Restart from checkpoint');
    writeChanged(this.get('pressure-value'),'textContent',`${Math.floor(p.pressure)} / ${chapter.encounter.player.maximumPressure}`);writeChanged(this.get<HTMLProgressElement>('pressure'),'max',chapter.encounter.player.maximumPressure);
    writeChanged(this.get('chapter-checkpoint'),'textContent',`Checkpoint: ${CHECKPOINTS[chapter.progress.checkpoint].name}`);
    // Small SVG is rebuilt only when map content changes, not each render tick.
    const map=this.get('chapter-map'),key=JSON.stringify([chapter.progress.discovered,chapter.progress.shortcuts,chapter.sector,Math.round(p.position.x),Math.round(p.position.z),objective.title]);
    if(map.dataset.key!==key){map.dataset.key=key;map.innerHTML=SECTORS.map(s=>{const b=s.bounds,known=chapter.progress.discovered.includes(s.id);return `<rect x="${b.minX}" y="${b.minZ}" width="${b.maxX-b.minX}" height="${b.maxZ-b.minZ}" fill="${known?'#3b5754':'#182527'}" stroke="#87968a" stroke-width=".3"/><text x="${(b.minX+b.maxX)/2}" y="${(b.minZ+b.maxZ)/2}" text-anchor="middle" fill="#e1dccb" font-size="2">${known?s.name:'Undiscovered'}</text>`;}).join('')+PORTALS.filter(q=>q.shortcut&&chapter.progress.shortcuts.includes(q.shortcut)).map(q=>`<circle cx="${q.position.x}" cy="${q.position.z}" r="1" fill="#89c6ac"/>`).join('')+`<circle cx="${p.position.x}" cy="${p.position.z}" r=".9" fill="white"/><circle cx="${objective.position.x}" cy="${objective.position.z}" r="1.1" fill="#d7ae62"/>`;}
    writeChanged(this.root.dataset,'chapterProgress',JSON.stringify(chapter.progress));writeChanged(this.root.dataset,'chapterSectors',String(view?.count??0));
  }
  dispose():void{this.lifetime.dispose();this.panel.remove();this.menu.remove();this.launch.remove();this.elements.clear();}
}
