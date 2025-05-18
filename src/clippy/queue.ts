export default class Queue {
  private _onEmptyCallback: () => void;
  private _queue: any[] = [];
  private _active = false;

  constructor (onEmptyCallback: () => void) {
    this._onEmptyCallback = onEmptyCallback;
  }

  queue(func: (complete: () => void) => void) {
    this._queue.push(func);

    if (this._queue.length === 1 && !this._active) {
      this._progressQueue();
    }
  }

  _progressQueue () {
    // stop if nothing left in queue
    if (!this._queue.length) {
      this._onEmptyCallback();
      return;
    }

    let f = this._queue.shift();
    this._active = true;

    // execute function
    const completeFunction = this.next.bind(this);
    f(completeFunction);
  }

  clear () {
    this._queue = [];
  }

  next () {
    this._active = false;
    this._progressQueue();
  }
}
