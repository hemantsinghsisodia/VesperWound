import { writeChanged } from './write-changed';
import { Lifetime } from '../core/lifetime';
import type { FirstMission } from '../mission/first-mission';

/** Mission DOM and listeners are independent of the practice/inspection controls. */
export class MissionHud {
  private readonly lifetime=new Lifetime();
  private readonly panel:HTMLElement;
  private readonly controls:HTMLElement;
  private readonly fade:HTMLElement;
  private readonly elements = new Map<string, HTMLElement>();
  constructor(private readonly root:HTMLElement,actions:{start():void;restart():void;skip():void;leave():void}){
    writeChanged(this.root.dataset, 'mission', 'inactive');this.panel=document.createElement('section');writeChanged(this.panel, 'hidden', true);this.panel.id='mission-hud';this.panel.setAttribute('aria-label','Mission objective');
    this.panel.innerHTML='<small>ASH QUAY · FIRST MISSION</small><h2 id="mission-title"></h2><p id="mission-detail" role="status"></p><p id="mission-hint"></p><p id="mission-feedback" role="status"></p><button id="mission-start">Start mission</button><button id="mission-replay" hidden>Play again</button><button id="mission-skip" hidden>Skip · Space</button><button id="mission-finish" hidden>Return to practice</button>';
    root.querySelector('.experience')!.append(this.panel);
    this.fade=document.createElement('div');this.fade.id='mission-fade';this.fade.setAttribute('aria-hidden','true');root.querySelector('.experience')!.append(this.fade);
    this.controls=document.createElement('div');writeChanged(this.controls, 'hidden', true);this.controls.className='mission-menu';
    this.controls.innerHTML='<button id="mission-restart">Restart mission</button><button id="mission-leave">Return to practice</button>';
    root.querySelector('#scene-tools-slot')!.prepend(this.controls);
    this.lifetime.listen(this.get('#mission-start'),'click',actions.start);
    this.lifetime.listen(this.get('#mission-skip'),'click',actions.skip);
    this.lifetime.listen(this.get('#mission-finish'),'click',actions.leave);
    this.lifetime.listen(this.get('#mission-replay'),'click',actions.restart);
    this.lifetime.listen(this.get('#mission-restart'),'click',actions.restart);
    this.lifetime.listen(this.get('#mission-leave'),'click',actions.leave);
  }
  private get<T extends HTMLElement=HTMLElement>(selector:string):T {
    const element = this.elements.get(selector) ?? this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing mission UI element: ${selector}`);
    this.elements.set(selector, element); return element as T;
  }
  update(mission:FirstMission|null,loading:boolean,error:string):void {
    const active=mission?.active??false,complete=mission?.stage==='complete';
    writeChanged(this.root.dataset, 'mission', mission?.stage??'inactive');
    writeChanged(this.root.dataset, 'missionLoading', String(loading));
    writeChanged(this.root.dataset, 'missionCinematic', String(mission?.cinematic??false));
    writeChanged(this.root.dataset, 'missionProgress', String(mission?.snapshot.progress??0));
    writeChanged(this.root.dataset, 'missionElapsed', String(mission?.elapsed??0));
    writeChanged(this.fade.style, 'opacity', String(mission?.snapshot.fade??0));
    writeChanged(this.panel, 'hidden', !mission||!['running','paused'].includes(this.root.dataset.state??'')||this.root.dataset.mode!=='player'||this.root.dataset.inspection==='active');
    writeChanged(this.controls, 'hidden', !active&&!loading);
    if(!mission)return;
    writeChanged(this.get('#mission-title'), 'textContent', mission.objective.title);
    writeChanged(this.get('#mission-hint'), 'textContent', mission.snapshot.hint);
    writeChanged(this.get('#mission-skip'), 'hidden', !mission.cinematic);
    writeChanged(this.get('#mission-finish'), 'hidden', !complete);
    const detail=this.get('#mission-detail');if(detail.textContent!==mission.objective.detail)writeChanged(detail, 'textContent', mission.objective.detail);
    writeChanged(this.get('#mission-feedback'), 'textContent', loading?'Preparing the ferry and quay guards… You can cancel or keep exploring.':error|| (complete?`Active play: ${Math.floor(mission.elapsed/60)}m ${Math.floor(mission.elapsed%60)}s`:''));
    const start=this.get<HTMLButtonElement>('#mission-start');writeChanged(start, 'hidden', active);writeChanged(start, 'textContent', loading?'Cancel mission load':error?'Retry mission':'Start mission');
    writeChanged(this.get('#mission-replay'), 'hidden', !complete);
    writeChanged(this.get<HTMLButtonElement>('#mission-restart'), 'disabled', loading);
    if(active){
      const player=mission.encounter.player.state;
      if(mission.stage!=='prepare')writeChanged(this.get('#pickup-status'), 'textContent', mission.canInteract()?`F — ${mission.interaction}`:'');
      if(mission.stage!=='prepare'){
        const button=this.get<HTMLButtonElement>('#pickup');writeChanged(button, 'hidden', !mission.canInteract());writeChanged(button, 'disabled', false);writeChanged(button, 'textContent', mission.interaction);button.setAttribute('aria-label',mission.interaction||'Interact');
      }
      if(player.health<=0)writeChanged(this.get('#player-message'), 'textContent', 'The ferry is still waiting. Restart the mission to try again.');
      else if(['idle','walk','run'].includes(player.action))writeChanged(this.get('#player-message'), 'textContent', '');
      writeChanged(this.get('#restart-player'), 'textContent', 'Restart mission');
    }else {writeChanged(this.get('#restart-player'), 'textContent', 'Return to the intake');this.get('#pickup').setAttribute('aria-label','Pick up steel baton');}
  }
  get listenerCount():number{return this.lifetime.cleanupCount;}
  dispose():void{this.lifetime.dispose();this.elements.clear();this.panel.remove();this.controls.remove();this.fade.remove();}
}
