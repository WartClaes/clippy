type Side = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export default class Balloon {
  private _WORD_SPEAK_TIME = 200;
  private _CLOSE_BALLOON_DELAY = 2000;
  private _BALLOON_MARGIN = 15;

  private _active = false;
  private _hold = false;
  private _targetEl: HTMLDivElement;
  private _hidden = true;
  private _hiding: number | null = null;
  private _loop?: number;
  private _balloon?: HTMLDivElement;
  private _content?: HTMLDivElement;
  private _complete?: () => void;
  private _addWord?: () => void;

  constructor (targetEl: HTMLDivElement) {
    this._targetEl = targetEl;

    this._setup();
  }

  _setup () {
    const balloon = document.createElement('div');
    balloon.classList.add('clippy-balloon');

    const content = document.createElement('div');
    content.classList.add('clippy-content');

    balloon.appendChild(content);

    this._balloon = balloon;
    this._content = content;

    document.body.appendChild(balloon);
  }

  reposition () {
    let sides: Side[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    for (let i = 0; i < sides.length; i++) {
      let s = sides[i];

      this._position(s);

      if (!this._isOut()) break;
    }
  }

  /***
    *
    * @param side
  * @private
  */
  _position (side: Side) {
    if (!this._balloon) return;

    let ol = this._targetEl.offsetLeft;
    let ot = this._targetEl.offsetTop;
    const h = this._targetEl.clientHeight;
    const w = this._targetEl.clientWidth;

    ot -= window.scrollY;
    ol -= window.scrollX;

    const bH = this._balloon.clientHeight;
    const bW = this._balloon.clientWidth;

    this._balloon.classList.remove(
      'clippy-top-left',
      'clippy-top-right',
      'clippy-bottom-left',
      'clippy-bottom-right',
    );

    let left, top;
    switch (side) {
      case 'top-left':
        // right side of the balloon next to the right side of the agent
        left = ol + w - bW;
      top = ot - bH - this._BALLOON_MARGIN;
      break;
      case 'top-right':
        // left side of the balloon next to the left side of the agent
        left = ol;
      top = ot - bH - this._BALLOON_MARGIN;
      break;
      case 'bottom-right':
        // right side of the balloon next to the right side of the agent
        left = ol;
      top = ot + h + this._BALLOON_MARGIN;
      break;
      case 'bottom-left':
        // left side of the balloon next to the left side of the agent
        left = ol + w - bW;
      top = ot + h + this._BALLOON_MARGIN;
      break;
    }

    this._balloon.style.setProperty('top', `${top}px`);
    this._balloon.style.setProperty('left', `${left}px`);

    this._balloon.classList.add(`clippy-${side}`);
  }

  private _isOut() {
    if (!this._balloon) return;

    const ol = this._targetEl.offsetLeft;
    const ot = this._targetEl.offsetTop;

    const bH = this._balloon.clientHeight;
    const bW = this._balloon.clientWidth;

    const wW = window.innerWidth;
    const wH = window.outerHeight;

    const sT = window.scrollY;
    const sL = window.scrollX;

    const top = ot - sT;
    const left = ol - sL;
    const m = 5;

    if (top - m < 0 || left - m < 0) {
      return true;
    }

    return (top + bH + m) > wH || (left + bW + m) > wW;
  }

  speak(complete: () => void, text: string, hold: boolean) {
    if (!this._content) return;

    this._hidden = false;

    this.show();

    let c = this._content;

    // set height to auto
    c.style.setProperty('height', 'auto');
    c.style.setProperty('width', 'auto');

    // add the text
    c.innerText = text;

    // set height
    c.style.setProperty('height', `${c.clientHeight}px`);
    c.style.setProperty('width', `${c.clientWidth}px`);

    c.innerText = '';

    this.reposition();

    this._complete = complete;
    this._sayWords(text, hold, complete);
  }

  show() {
    if (this._hidden || !this._balloon) return;

    this._balloon.style.setProperty('display', 'block');
  }

  hide(fast = false) {
    if (fast) {
      this._balloon?.style.setProperty('display', 'block');
      return;
    }

    this._hiding = window.setTimeout(() => this._finishHideBalloon(), this._CLOSE_BALLOON_DELAY);
  }

  _finishHideBalloon() {
    if (this._active) return;

    this._balloon?.style.setProperty('display', 'none');

    this._hidden = true;
    this._hiding = null;
  }

  private _sayWords(text: string, hold: boolean, complete: () => void) {
    this._active = true;
    this._hold = hold;

    let words = text.split(/[^\S-]/);
    let time = this._WORD_SPEAK_TIME;
    let el = this._content;
    let idx = 1;

    if (!el) return;

    this._addWord = () => {
      if (!this._active) return;

      if (idx > words.length) {
        delete this._addWord;

        this._active = false;

        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        el.innerText = words.slice(0, idx).join(' ');
        idx++;
        this._loop = window.setTimeout(() => this._addWord?.(), time);
      }
    };

    this._addWord();

  }

  close () {
    if (this._active) {
      this._hold = false;
    } else if (this._hold) {
      this._complete?.();
    }
  }

  pause() {
    window.clearTimeout(this._loop);

    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
  }

  resume() {
    if (this._addWord) {
      this._addWord();
      return;
    }

    if (!this._hold && !this._hidden) {
      this._hiding = window.setTimeout(() => this._finishHideBalloon(), this._CLOSE_BALLOON_DELAY);
    }
  }
}
