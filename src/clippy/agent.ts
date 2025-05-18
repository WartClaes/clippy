import type { AgentData } from './types'

import Queue from './queue';
import Animator, { type AnimationState } from './animator';
import Balloon from './balloon'

export default class Agent {
  private _queue: Queue;
  private _el: HTMLDivElement;
  private _balloon: Balloon;
  private _animator: Animator;
  private _hidden = true;
  private _targetY?: number;
  private _targetX?: number;
  private _idleDfd?: Promise<void>;
  private _offset = { top: 0, left: 0 };
  private _dragUpdateLoop?: number;

  private _moveHandle?: (e: MouseEvent) => void;
  private _upHandle?: () => void;

  constructor (path: string, data: AgentData, sounds?: any) {
    this._queue = new Queue(this._onQueueEmpty.bind(this));

    this._el = document.createElement('div');
    this._el.classList.add('agent');

    document.body.appendChild(this._el);

    this._animator = new Animator(this._el, path, data, sounds);

    this._balloon = new Balloon(this._el);

    this._setupEvents();
  }

  gestureAt (x: number, y: number) {
    let d = this._getDirection(x, y);
    let gAnim = 'Gesture' + d;
    let lookAnim = 'Look' + d;

    let animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  }

  hide(fast: boolean, callback: () => void) {
    this._hidden = true;

    let el = this._el;

    this.stop();
    if (fast) {
      this._el.style.setProperty('display', 'none');

      this.stop();
      this.pause();

      if (callback) callback();

      return;
    }

    return this._playInternal('Hide', () => {
      this._el.style.setProperty('display', 'none');
      this.pause();

      if (callback) callback();
    })
  }


  moveTo (x: number, y: number, duration: number) {
    let dir = this._getDirection(x, y);
    let anim = 'Move' + dir;

    if (duration === undefined) duration = 1000;

    this._addToQueue((complete: () => void) => {
      // the simple case
      if (duration === 0) {
        this._el.style.setProperty('top', `${y}px`);
        this._el.style.setProperty('left', `${x}px`);

        this.reposition();

        complete();

        return;
      }

      // no animations
      if (!this.hasAnimation(anim)) {
        this._el.animate({ top: y, left: x }, duration, complete);
        return;
      }

      let callback = (name: string, state: AnimationState) => {
        // when exited, complete
        if (state === 'exited') {
          complete();
          return;
        }

        // if waiting,
        if (state === 'waiting') {
          // this._el.animate({ top: y, left: x }, duration, () => {
          //   // after we're done with the movement, do the exit animation
          //   this._animator.exitAnimation();
          // });
        }

      };

      this._playInternal(anim, callback);
    });
  }

  _playInternal(animation: string, callback: (name: string, state: AnimationState) => void) {
    // if we're inside an idle animation,
    //
    // REMOVED =>
    //  && this._idleDfd.state() === 'pending'
    if (this._isIdleAnimation() && this._idleDfd) {
      this._idleDfd.then(() => {
        this._playInternal(animation, callback);
      });
    }

    this._animator.showAnimation(animation, callback);
  }

  play(animation: string, timeout = 5000, cb?: () => void) {
    if (!this.hasAnimation(animation)) return false;

    this._addToQueue((complete: () => void) => {
      let completed = false;
      // handle callback
      let callback = (name: string, state: AnimationState) => {
        if (state === 'exited') {
          completed = true;

          cb?.();

          complete();
        }
      };

      // if has timeout, register a timeout function
      if (timeout) {
        window.setTimeout(() => {
          if (completed) return;
          // exit after timeout
          this._animator.exitAnimation();
        }, timeout);
      }

      this._playInternal(animation, callback);
    });

    return true;
  }

  show(fast = false) {
    console.log('show', fast);

    this._hidden = false;

    if (fast) {
      this._el.style.setProperty('display', 'block');

      this.resume();
      this._onQueueEmpty();

      return;
    }

    const cs = this._el.computedStyleMap();
    const elTop = cs.get('top');
    const elLeft = cs.get('left');

    if (elTop === 'auto' || elLeft !== 'auto') {
      const left = window.innerWidth * 0.8;
      const top = (window.innerHeight + window.scrollY) * 0.8;

      this._el.style.setProperty('top', `${top}px`);
      this._el.style.setProperty('left', `${left}px`);
    }

    this.resume();

    return this.play('Show');
  }

  speak(text: string, hold = false) {
    this._addToQueue((complete) => {
      this._balloon.speak(complete, text, hold);
    });
  }


  /***
    * Close the current balloon
  */
  closeBalloon () {
    this._balloon.hide();
  }

  delay (time = 250) {
    this._addToQueue((complete) => {
      this._onQueueEmpty();
      window.setTimeout(complete, time);
    });
  }

  /***
    * Skips the current animation
  */
  stopCurrent () {
    this._animator.exitAnimation();
    this._balloon.close();
  }


  stop () {
    // clear the queue
    this._queue.clear();
    this._animator.exitAnimation();
    this._balloon.hide();
  }

  hasAnimation(name: string) {
    return this._animator.hasAnimation(name);
  }

  animations() {
    return this._animator.animations();
  }

  animate(): boolean {
    const animations = this.animations();
    const anim = animations[Math.floor(Math.random() * animations.length)];

    // skip idle animations
    if (anim.indexOf('Idle') === 0) {
      return this.animate();
    }

    return this.play(anim);
  }

  /**************************** Utils ************************************/

  _getDirection(x: number, y: number) {
    const ol = this._el.offsetLeft;
    const ot = this._el.offsetTop;

    const h = this._el.clientHeight;
    const w = this._el.clientWidth;

    let centerX = (ol + w / 2);
    let centerY = (ot + h / 2);


    let a = centerY - y;
    let b = centerX - x;

    let r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    // Left and Right are for the character, not the screen :-/
    if (-45 <= r && r < 45) return 'Right';
    if (45 <= r && r < 135) return 'Up';
    if (135 <= r && r <= 180 || -180 <= r && r < -135) return 'Left';
    if (-135 <= r && r < -45) return 'Down';

    // sanity check
    return 'Top';
  }

  /**************************** Queue and Idle handling ************************************/

  /***
   * Handle empty queue.
   * We need to transition the animation to an idle state
   */
  private _onQueueEmpty(): void {
    if (this._hidden || this._isIdleAnimation()) return;

    const idleAnim = this._getIdleAnimation();

    this._idleDfd = new Promise((resolve) => {
      this._animator.showAnimation(idleAnim, (_name: string, state: AnimationState) => {
        if (state === 'exited') {
          resolve();
        }
      });
    });
  }

  private _isIdleAnimation() {
    let c = this._animator.currentAnimationName;

    return c && c.indexOf('Idle') === 0;
  }

  private _getIdleAnimation() {
    const animations = this.animations();
    const r = [];

    for (let i = 0; i < animations.length; i++) {
      let a = animations[i];
      if (a.indexOf('Idle') === 0) {
        r.push(a);
      }
    }

    // pick one
    const idx = Math.floor(Math.random() * r.length);

    return r[idx];
  }

  /**************************** Events ************************************/

  private _setupEvents () {
    window.addEventListener('resize', () => this.reposition());

    this._el.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this._el.addEventListener('dblclick', () => this._onDoubleClick());
  }

  private _onDoubleClick () {
    if (!this.play('ClickedOn')) {
      this.animate();
    }
  }

  reposition() {
    // TODO: add this
    // if (!this._el.is(':visible')) return;
    const ot = this._el.offsetTop;
    const ol = this._el.offsetLeft;

    let bH = this._el.clientHeight;
    let bW = this._el.clientWidth;

    const wW = window.innerWidth;
    const wH = window.innerHeight;
    const sT = window.scrollY;
    const sL = window.scrollX;

    let top = ot - sT;
    let left = ol - sL;
    let m = 5;

    if (top - m < 0) {
      top = m;
    } else if ((top + bH + m) > wH) {
      top = wH - bH - m;
    }

    if (left - m < 0) {
      left = m;
    } else if (left + bW + m > wW) {
      left = wW - bW - m;
    }

    this._el.style.setProperty('left', `${left}px`);
    this._el.style.setProperty('top', `${top}px`);

    // reposition balloon
    this._balloon.reposition();
  }

  private _onMouseDown (e: MouseEvent) {
    e.preventDefault();

    this._startDrag(e);
  }


  /**************************** Drag ************************************/

  private _startDrag (e: MouseEvent) {
    // pause animations
    this.pause();

    this._balloon.hide(true);

    this._offset = this._calculateClickOffset(e);

    this._moveHandle = (e: MouseEvent) => this._dragMove(e);
    this._upHandle = () => this._finishDrag();

    window.addEventListener('mousemove', this._moveHandle);
    window.addEventListener('mouseup', this._upHandle);

    this._dragUpdateLoop = window.setTimeout(() => this._updateLocation(), 10);
  }

  private _calculateClickOffset (e: MouseEvent) {
    const mouseX = e.pageX;
    const mouseY = e.pageY;
    const ol = this._el.offsetLeft;
    const ot = this._el.offsetTop;

    return {
      top: mouseY - ot,
      left: mouseX - ol,
    }
  }

  private _updateLocation () {
    this._el.style.setProperty('top', `${this._targetY}`);
    this._el.style.setProperty('left', `${this._targetX}`);

    this._dragUpdateLoop = window.setTimeout(() => this._updateLocation(), 10);
  }

  private _dragMove (e: MouseEvent) {
    e.preventDefault();

    const x = e.clientX - this._offset.left;
    const y = e.clientY - this._offset.top;

    this._targetX = x;
    this._targetY = y;
  }

  private _finishDrag () {
    window.clearTimeout(this._dragUpdateLoop);

    // remove handles
    this._moveHandle && window.addEventListener('mousemove', this._moveHandle);
    this._upHandle && window.addEventListener('mouseup', this._upHandle);

    // resume animations
    this._balloon.show();
    this.reposition();
    this.resume();

  }

  private _addToQueue (func: (complete: () => void) => void) {
    this._queue.queue(func);
  }

  /**************************** Pause and Resume ************************************/

  pause () {
    this._animator.pause();
    this._balloon.pause();
  }

  resume () {
    this._animator.resume();
    this._balloon.resume();
  }
}
