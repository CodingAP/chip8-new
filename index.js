let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let emulator = new Chip8();
let debug = new Debugger(emulator);
let currentLoop = null;
let paused = false;

let loop = () => {
    if (!paused) emulator.run();
    debug.loop();

    if (emulator.screen.drawFlag) {
        emulator.screen.show();
        emulator.screen.drawFlag = false;
    }
}