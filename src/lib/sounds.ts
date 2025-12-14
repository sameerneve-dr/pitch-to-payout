export function playCelebrationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a sequence of celebration notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = audioContext.currentTime;
    
    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      // Stagger the notes
      const startTime = now + index * 0.1;
      const endTime = startTime + 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });

    // Add a triumphant chord after
    setTimeout(() => {
      const chordFreqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      chordFreqs.forEach((freq) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        osc.start();
        osc.stop(audioContext.currentTime + 1);
      });
    }, 400);

  } catch (e) {
    console.log('Audio not supported:', e);
  }
}

export function playChaChing() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // High pitched "cha-ching" sound
    [1318.51, 1567.98].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      
      const start = now + i * 0.08;
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch (e) {
    console.log('Audio not supported:', e);
  }
}
