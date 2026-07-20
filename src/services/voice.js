export class VoiceSession {
  constructor({ sessionId, onState = () => {} } = {}) {
    this.sessionId = sessionId;
    this.onState = onState;
    this.pc = null;
    this.stream = null;
  }

  async start() {
    this.stop();
    this.onState("connecting");
    this.pc = new RTCPeerConnection();
    const audio = new Audio();
    audio.autoplay = true;
    this.pc.ontrack = (event) => { audio.srcObject = event.streams[0]; };
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of this.stream.getTracks()) this.pc.addTrack(track, this.stream);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    const response = await fetch("/api/realtime/call", { method: "POST", headers: { "Content-Type": "application/sdp", "X-Session-Id": this.sessionId }, body: offer.sdp });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "voice_unavailable");
    await this.pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
    this.onState("live");
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.pc?.close();
    this.stream = null;
    this.pc = null;
    this.onState("off");
  }
}
