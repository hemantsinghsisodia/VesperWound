import { Lifetime } from '../core/lifetime';
import type { FirstMission } from '../mission/first-mission';

/** Mission DOM and listeners are independent of the practice/inspection controls. */
export class MissionHud {
  private readonly lifetime=new Lifetime();
  private readonly panel:HTMLElement;
  private readonly controls:HTMLElement;
  private readonly fade:HTMLElement;
  constructor(private readonly root:HTMLElement,actions:{start():void;restart():void;skip():void;leave():void}){
    this.root.dataset.mission='inactive';this.panel=document.createElement('section');this.panel.hidden=true;this.panel.id='mission-hud';this.panel.setAttribute('aria-label','Mission objective');
    this.panel.innerHTML='<small>ASH QUAY · FIRST MISSION</small><h2 id="mission-title"></h2><p id="mission-detail" role="status"></p><p id="mission-hint"></p><p id="mission-feedback" role="status"></p><button id="mission-start">Start mission</button><button id="mission-replay" hidden>Play again</button><button id="mission-skip" hidden>Skip · Space</button><button id="mission-finish" hidden>Return to practice</button>';
    root.querySelector('.experience')!.append(this.panel);
    this.fade=document.createElement('div');this.fade.id='mission-fade';this.fade.setAttribute('aria-hidden','true');root.querySelector('.experience')!.append(this.fade);
    this.controls=document.createElement('div');this.controls.hidden=true;this.controls.className='mission-menu';
    this.controls.innerHTML='<button id="mission-restart">Restart mission</button><button id="mission-leave">Return to practice</button>';
    root.querySelector('#scene-tools-slot')!.prepend(this.controls);
    this.lifetime.listen(this.get('#mission-start'),'click',actions.start);
    this.lifetime.listen(this.get('#mission-skip'),'click',actions.skip);
    this.lifetime.listen(this.get('#mission-finish'),'click',actions.leave);
    this.lifetime.listen(this.get('#mission-replay'),'click',actions.restart);
    this.lifetime.listen(this.get('#mission-restart'),'click',actions.restart);
    this.lifetime.listen(this.get('#mission-leave'),'click',actions.leave);
  }
  private get<T extends HTMLElement=HTMLElement>(selector:string):T{return this.root.querySelector<T>(selector)!;}
  update(mission:FirstMission|null,loading:boolean,error:string):void {
    const active=mission?.active??false,complete=mission?.stage==='complete';
    this.root.dataset.mission=mission?.stage??'inactive';
    this.root.dataset.missionLoading=String(loading);
    this.root.dataset.missionCinematic=String(mission?.cinematic??false);
    this.root.dataset.missionProgress=String(mission?.snapshot.progress??0);
    this.root.dataset.missionElapsed=String(mission?.elapsed??0);
    this.fade.style.opacity=String(mission?.snapshot.fade??0);
    this.panel.hidden=!mission||!['running','paused'].includes(this.root.dataset.state??'')||this.root.dataset.mode!=='player'||this.root.dataset.inspection==='active';
    this.controls.hidden=!active&&!loading;
    if(!mission)return;
    this.get('#mission-title').textContent=mission.objective.title;
    this.get('#mission-hint').textContent=mission.snapshot.hint;
    this.get('#mission-skip').hidden=!mission.cinematic;
    this.get('#mission-finish').hidden=!complete;
    const detail=this.get('#mission-detail');if(detail.textContent!==mission.objective.detail)detail.textContent=mission.objective.detail;
    this.get('#mission-feedback').textContent=loading?'Preparing the ferry and quay guards… You can cancel or keep exploring.':error|| (complete?`Active play: ${Math.floor(mission.elapsed/60)}m ${Math.floor(mission.elapsed%60)}s`:'');
    const start=this.get<HTMLButtonElement>('#mission-start');start.hidden=active;start.textContent=loading?'Cancel mission load':error?'Retry mission':'Start mission';
    this.get('#mission-replay').hidden=!complete;
    this.get<HTMLButtonElement>('#mission-restart').disabled=loading;
    if(active){
      const player=mission.encounter.player.state;
      if(mission.stage!=='prepare')this.get('#pickup-status').textContent=mission.canInteract()?`F — ${mission.interaction}`:'';
      if(mission.stage!=='prepare'){
        const button=this.get<HTMLButtonElement>('#pickup');button.hidden=!mission.canInteract();button.disabled=false;button.textContent=mission.interaction;button.setAttribute('aria-label',mission.interaction||'Interact');
      }
      if(player.health<=0)this.get('#player-message').textContent='The ferry is still waiting. Restart the mission to try again.';
      else if(['idle','walk','run'].includes(player.action))this.get('#player-message').textContent='';
      this.get('#restart-player').textContent='Restart mission';
    }else {this.get('#restart-player').textContent='Return to the intake';this.get('#pickup').setAttribute('aria-label','Pick up steel baton');}
  }
  get listenerCount():number{return this.lifetime.cleanupCount;}
  dispose():void{this.lifetime.dispose();this.panel.remove();this.controls.remove();this.fade.remove();}
}
