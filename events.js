let fileSelected = document.getElementById('files');
fileSelected.addEventListener('change', () => {
    let fileTobeRead = fileSelected.files[0];
    let fileReader = new FileReader();
    fileReader.onload = () => {
        window.clearInterval(currentLoop);
        emulator.reset();
        emulator.loadROM(fileReader.result);
        debug.disassemble();
        currentLoop = window.setInterval(loop, 1000 / document.getElementById('speed').value);
    }
    fileReader.readAsText(fileTobeRead);
}, false);

document.addEventListener('keydown', (event) => {
    emulator.getKey(event.key, true);
});

document.addEventListener('keyup', (event) => {
    emulator.getKey(event.key, false);
});

document.getElementById('fpicker').addEventListener('change', () => {
    emulator.screen.foreground = document.getElementById('fpicker').value;
    emulator.screen.drawFlag = true;
});

document.getElementById('bpicker').addEventListener('change', () => {
    emulator.screen.background = document.getElementById('bpicker').value;
    emulator.screen.drawFlag = true;
});

document.getElementById('speed').addEventListener('change', () => {
    window.clearInterval(currentLoop);
    currentLoop = window.setInterval(loop, 1000 / document.getElementById('speed').value);
});

document.getElementById('reset').addEventListener('click', () => {
    emulator.reset();
    document.getElementById('program').value = '';
});

document.getElementById('pause').addEventListener('click', () => {
    paused = !paused;
    document.getElementById('pause').value = (paused) ? 'Unpause' : 'Pause'
});

document.getElementById('ponoff').addEventListener('change', event => {
    document.getElementsByClassName('disassembler')[0].style.visibility = (document.getElementById('ponoff').checked ? 'visible' : 'hidden')
});

document.getElementById('donoff').addEventListener('change', event => {
    document.getElementsByClassName('disassembler')[1].style.visibility = (document.getElementById('donoff').checked ? 'visible' : 'hidden')
});