/* Isolated audio bridge for the existing JARVIS camera video recorder. */
(() => {
  const NativeMediaRecorder = window.MediaRecorder;
  if (!NativeMediaRecorder || !navigator.mediaDevices?.getUserMedia) return;

  class AudioMediaRecorder {
    static isTypeSupported(type) {
      return typeof NativeMediaRecorder.isTypeSupported === "function" && NativeMediaRecorder.isTypeSupported(type);
    }

    constructor(stream, options) {
      this._sourceStream = stream;
      this._options = options;
      this._native = null;
      this._audioStream = null;
      this._startRequested = false;
      this._stopRequested = false;
      this._handlers = { dataavailable: null, error: null, stop: null, start: null };
      this._state = "inactive";
      this._mimeType = options?.mimeType || "";

      if (stream.getAudioTracks().length) {
        this._native = this._createNative(stream);
      } else {
        this._beginAudioCapture();
      }
    }

    get state() {
      return this._native ? this._native.state : this._state;
    }

    get mimeType() {
      return this._native?.mimeType || this._mimeType;
    }

    set ondataavailable(handler) { this._handlers.dataavailable = handler; this._sync("ondataavailable", handler); }
    get ondataavailable() { return this._handlers.dataavailable; }
    set onerror(handler) { this._handlers.error = handler; this._sync("onerror", handler); }
    get onerror() { return this._handlers.error; }
    set onstop(handler) { this._handlers.stop = handler; this._sync("onstop", handler); }
    get onstop() { return this._handlers.stop; }
    set onstart(handler) { this._handlers.start = handler; this._sync("onstart", handler); }
    get onstart() { return this._handlers.start; }

    _sync(name, handler) {
      if (this._native) this._native[name] = handler;
    }

    _createNative(stream) {
      try {
        const recorder = this._mimeType
          ? new NativeMediaRecorder(stream, this._options)
          : new NativeMediaRecorder(stream);
        recorder.ondataavailable = this._handlers.dataavailable;
        recorder.onerror = this._handlers.error;
        recorder.onstop = event => {
          this._state = "inactive";
          try { this._audioStream?.getTracks().forEach(track => track.stop()); } catch (_) {}
          this._handlers.stop?.(event);
        };
        recorder.onstart = this._handlers.start;
        return recorder;
      } catch (error) {
        this._handlers.error?.(error);
        return null;
      }
    }

    async _beginAudioCapture() {
      try {
        this._audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (this._startRequested) this._startNative();
      } catch (error) {
        this._state = "inactive";
        this._handlers.error?.(error);
      }
    }

    _startNative() {
      if (this._native || !this._audioStream) return;
      const combined = new MediaStream([
        ...this._sourceStream.getVideoTracks(),
        ...this._audioStream.getAudioTracks()
      ]);
      this._native = this._createNative(combined);
      if (!this._native) {
        this._state = "inactive";
        return;
      }
      try {
        this._state = "recording";
        this._native.start(this._timeslice);
        if (this._stopRequested) this.stop();
      } catch (error) {
        this._state = "inactive";
        try { this._audioStream.getTracks().forEach(track => track.stop()); } catch (_) {}
        this._handlers.error?.(error);
      }
    }

    start(timeslice) {
      this._timeslice = timeslice;
      if (this._native) {
        this._state = "recording";
        this._native.start(timeslice);
        return;
      }
      this._startRequested = true;
      if (this._audioStream) this._startNative();
    }

    stop() {
      this._stopRequested = true;
      if (this._native && this._native.state !== "inactive") this._native.stop();
    }
  }

  window.MediaRecorder = AudioMediaRecorder;
})();
