class Screen {
    constructor() {
        this.graphics = new Array(32 * 64);
        this.drawFlag = false;
        this.foreground = '#fff';
        this.background = '#000';
        this.clear();
    }

    clear() {
        for (let i = 0; i < this.graphics.length; i++) {
            this.graphics[i] = 0;
        }
        this.drawFlag = true;
    }

    setPixel(x, y) {
        if (x > 64) {
            x -= 64;
        } else if (x < 0) {
            x += 64;
        }

        if (y > 32) {
            y -= 32;
        } else if (y < 0) {
            y += 32;
        }

        this.graphics[x + (y * 64)] ^= 1;

        return !this.graphics[x + (y * 64)];
    }

    show() {
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 64; x++) {
                context.fillStyle = (this.graphics[y * 64 + x] == 0) ? this.background : this.foreground;
                context.fillRect(x * 10, y * 10, 10, 10);
            }
        }
    }
}

class Chip8 {
    constructor() {
        this.registers = new Array(16);
        this.registerI = 0x0000;
        this.memory = new Array(4096);
        this.programCounter = 0x200;
        this.stack = new Array(16);
        this.stackPointer = 0;
        this.delayTimer = 0;
        this.soundTimer = 0;
        this.keys = new Array(16);
        this.screen = new Screen();
        this.fonts = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        for (let i = 0; i < this.memory.length; i++) {
            this.memory[i] = 0;
        }

        for (let i = 0; i < this.fonts.length; i++) {
            this.memory[i] = this.fonts[i];
        }

        this.keyCode = {
            '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xc,
            'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xd,
            'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xe,
            'z': 0xa, 'x': 0x0, 'c': 0xb, 'v': 0xf
        };

        this.opcodes = new Opcodes(this);
        this.waitForKey = false;
        this.keyStorage = 0x0;

        this.reset();
    }

    reset() {
        for (let i = 0; i < this.registers.length; i++) {
            this.registers[i] = 0;
        }

        for (let i = 0; i < this.stack.length; i++) {
            this.stack[i] = 0;
        }

        for (let i = 0; i < this.keys.length; i++) {
            this.keys[i] = false;
        }

        this.registerI = 0x0000;
        this.programCounter = 0x200;
        this.stackPointer = 0;
        this.delayTimer = 0;
        this.soundTimer = 0;
        this.screen.clear();
    }

    run() {
        if (!this.waitForKey) {
            let opcode = (this.memory[this.programCounter] << 8) | this.memory[this.programCounter + 1];
            this.programCounter += 2;
            this.opcodes.run(opcode);

            if (this.delayTimer > 0) this.delayTimer--;
            if (this.soundTimer > 0) this.soundTimer--;
        }
    }

    loadROM(program) {
        let buffer = program.replace(/\s+/g, '');
        for (let i = 0; i < buffer.length; i += 2) {
            let byte = buffer.charAt(i) + buffer.charAt(i + 1);
            this.memory[i / 2 + 512] = parseInt(byte, 16);
        }
    }

    getKey(key, state) {
        if (this.waitForKey) {
            this.registers[this.keyStorage] = this.keyCode[key];
            this.waitForKey = false;
        } else {
            if (key == 'x') {
                this.keys[0] = state;
            } else if (this.keyCode[key]) {
                this.keys[this.keyCode[key]] = state;
            }
        }
    }
}

class Opcodes {
    constructor(cpu) {
        this.cpu = cpu;
        this.opcodes = {
            0x00e0: {
                name: 'CLS', func: (cpu, args) => {
                    cpu.screen.clear();
                }
            },
            0x00ee: {
                name: 'RET', func: (cpu, args) => {
                    cpu.programCounter = cpu.stack[cpu.stackPointer--];
                }
            },
            0x1000: {
                name: 'JP nnn', func: (cpu, args) => {
                    cpu.programCounter = args.nnn;
                }
            },
            0x2000: {
                name: 'CALL nnn', func: (cpu, args) => {
                    cpu.stack[++cpu.stackPointer] = cpu.programCounter;
                    cpu.programCounter = args.nnn;
                }
            },
            0x3000: {
                name: 'SE x kk', func: (cpu, args) => {
                    if (cpu.registers[args.x] == args.kk) cpu.programCounter += 2;
                }
            },
            0x4000: {
                name: 'SNE x kk', func: (cpu, args) => {
                    if (cpu.registers[args.x] != args.kk) cpu.programCounter += 2;
                }
            },
            0x5000: {
                name: 'SE x y', func: (cpu, args) => {
                    if (cpu.registers[args.x] == cpu.registers[args.y]) cpu.programCounter += 2;
                }
            },
            0x6000: {
                name: 'LD x kk', func: (cpu, args) => {
                    cpu.registers[args.x] = args.kk;
                }
            },
            0x7000: {
                name: 'ADD x kk', func: (cpu, args) => {
                    cpu.registers[args.x] += args.kk;
                    cpu.registers[args.x] &= 0xff;
                }
            },
            0x8000: {
                name: 'ADD x y', func: (cpu, args) => {
                    cpu.registers[args.x] = cpu.registers[args.y];
                }
            },
            0x8001: {
                name: 'OR x y', func: (cpu, args) => {
                    cpu.registers[args.x] |= cpu.registers[args.y];
                }
            },
            0x8002: {
                name: 'AND x y', func: (cpu, args) => {
                    cpu.registers[args.x] &= cpu.registers[args.y];
                }
            },
            0x8003: {
                name: 'XOR x y', func: (cpu, args) => {
                    cpu.registers[args.x] ^= cpu.registers[args.y];
                }
            },
            0x8004: {
                name: 'ADD x y', func: (cpu, args) => {
                    let result = cpu.registers[args.x] + cpu.registers[args.y];
                    cpu.registers[0xf] = (cpu.registers[args.x] > 255) ? 1 : 0;
                    cpu.registers[args.x] = result & 0xff;
                }
            },
            0x8005: {
                name: 'SUB x y', func: (cpu, args) => {
                    let result = cpu.registers[args.x] - cpu.registers[args.y];
                    cpu.registers[0xf] = (cpu.registers[args.x] > cpu.registers[args.y]) ? 1 : 0;
                    if (result < 0) result += 256;
                    cpu.registers[args.x] = result & 0xff;
                }
            },
            0x8006: {
                name: 'SHR x', func: (cpu, args) => {
                    cpu.registers[0xf] = cpu.registers[args.x] & 0x1;
                    cpu.registers[args.x] = cpu.registers[args.x] >> 1;
                }
            },
            0x8007: {
                name: 'SUBN x y', func: (cpu, args) => {
                    let result = cpu.registers[args.y] - cpu.registers[args.x];
                    cpu.registers[0xf] = (cpu.registers[args.y] > cpu.registers[args.x]) ? 1 : 0;
                    if (result < 0) result += 256;
                    cpu.registers[args.x] = result & 0xff;
                }
            },
            0x800e: {
                name: 'SHL x', func: (cpu, args) => {
                    cpu.registers[0xf] = (cpu.registers[args.x] & 0x80) >> 7;
                    cpu.registers[args.x] = (cpu.registers[args.x] << 1) & 0xff;
                }
            },
            0x9000: {
                name: 'SNE x y', func: (cpu, args) => {
                    if (cpu.registers[args.x] != cpu.registers[args.y]) cpu.programCounter += 2;
                }
            },
            0xa000: {
                name: 'LD I nnn', func: (cpu, args) => {
                    cpu.registerI = args.nnn;
                }
            },
            0xb000: {
                name: 'JP nnn + R0', func: (cpu, args) => {
                    cpu.programCounter = args.nnn + cpu.registers[0x0];
                }
            },
            0xc000: {
                name: 'RND x kk', func: (cpu, args) => {
                    cpu.registers[args.x] = args.kk & Math.floor(Math.random() * 255);
                }
            },
            0xd000: {
                name: 'DRW x y n', func: (cpu, args) => {
                    cpu.registers[0xf] = 0;
                    let spr;
                    for (let y = 0; y < args.n; y++) {
                        spr = cpu.memory[cpu.registerI + y];
                        for (let x = 0; x < 8; x++) {
                            if ((spr & 0x80) > 0) {
                                if (cpu.screen.setPixel(cpu.registers[args.x] + x, cpu.registers[args.y] + y)) {
                                    cpu.registers[0xf] = 1;
                                }
                            }
                            spr <<= 1;
                        }
                    }
                    cpu.screen.drawFlag = true;
                }
            },
            0xe09e: {
                name: 'SKP x', func: (cpu, args) => {
                    if (cpu.keys[cpu.registers[args.x]]) cpu.programCounter += 2;
                }
            },
            0xe0a1: {
                name: 'SKNP x', func: (cpu, args) => {
                    if (!cpu.keys[cpu.registers[args.x]]) cpu.programCounter += 2;
                }
            },
            0xf007: {
                name: 'LD x DT', func: (cpu, args) => {
                    cpu.registers[args.x] = cpu.delayTimer;
                }
            },
            0xf00a: {
                name: 'LD x DT', func: (cpu, args) => {
                    cpu.waitForKey = true;
                    cpu.keyStorage = args.x;
                }
            },
            0xf015: {
                name: 'LD DT x', func: (cpu, args) => {
                    cpu.delayTimer = cpu.registers[args.x];
                }
            },
            0xf018: {
                name: 'LD ST x', func: (cpu, args) => {
                    cpu.soundTimer = cpu.registers[args.x];
                }
            },
            0xf01e: {
                name: 'ADD I x', func: (cpu, args) => {
                    cpu.registerI += cpu.registers[args.x];
                }
            },
            0xf029: {
                name: 'LD F x', func: (cpu, args) => {
                    cpu.registerI = cpu.registers[args.x] * 5;
                }
            },
            0xf033: {
                name: 'LD B x', func: (cpu, args) => {
                    let temp = cpu.registers[args.x];
                    cpu.memory[cpu.registerI] = Math.floor(temp / 100);
                    temp -= cpu.memory[cpu.registerI] * 100;
                    cpu.memory[cpu.registerI + 1] = Math.floor(temp / 10);
                    temp -= cpu.memory[cpu.registerI + 1] * 10;
                    cpu.memory[cpu.registerI + 2] = temp
                }
            },
            0xf055: {
                name: 'LD I x', func: (cpu, args) => {
                    for (let i = 0; i <= args.x; i++) {
                        cpu.memory[cpu.registerI + i] = cpu.registers[i];
                    }
                }
            },
            0xf065: {
                name: 'LD x I', func: (cpu, args) => {
                    for (let i = 0; i <= args.x; i++) {
                        cpu.registers[i] = cpu.memory[cpu.registerI + i];
                    }
                }
            }
        }
    }

    run(opcode) {
        let args = { 'nnn': opcode & 0xfff, 'kk': opcode & 0xff, 'n': opcode & 0xf, 'x': (opcode & 0xf00) >> 8, 'y': (opcode & 0xf0) >> 4 };
        let opcodeName = '';
        if (this.opcodes[opcode]) {
            this.opcodes[opcode].func(this.cpu, args);
            opcodeName = this.opcodes[opcode].name;
        } else if (this.opcodes[opcode & 0xf0ff]) {
            this.opcodes[opcode & 0xf0ff].func(this.cpu, args);
            opcodeName = this.opcodes[opcode & 0xf0ff].name;
        } else if (this.opcodes[opcode & 0xf00f]) {
            this.opcodes[opcode & 0xf00f].func(this.cpu, args);
            opcodeName = this.opcodes[opcode & 0xf00f].name;
        } else if (this.opcodes[opcode & 0xf000]) {
            this.opcodes[opcode & 0xf000].func(this.cpu, args);
            opcodeName = this.opcodes[opcode & 0xf000].name;
        } else {
            opcodeName = 'XXX';
        }
        if (document.getElementById('ponoff').checked) {
            let tokens = opcodeName.split(' ');
            let newOpcode = '';
            for (let j = 0; j < tokens.length; j++) {
                let i = tokens[j];
                if (i == 'nnn') {
                    newOpcode += (args.nnn < 256 ? args.nnn < 16 ? '00' : '0' : '') + args.nnn.toString(16);
                } else if (i == 'kk') {
                    newOpcode += (args.kk < 16 ? '0' : '') + args.kk.toString(16);
                } else if (i == 'n') {
                    newOpcode += args.n.toString(16);
                } else if (i == 'x') {
                    newOpcode += 'R' + args.x.toString(16);
                } else if (i == 'y') {
                    newOpcode += 'R' + args.y.toString(16);
                } else {
                    newOpcode += i;
                }
                newOpcode += ' ';
            }
            document.getElementById('program').value += newOpcode + '\n';
        }
    }
}

class Debugger {
    constructor(chip8) {
        this.chip8 = chip8;
    }

    disassemble() {
        document.getElementById('dprogram').value = '';

        for (let i = 0x200; i < 0xfff; i += 2) {
            let opcode = (this.chip8.memory[i] << 8) | this.chip8.memory[i + 1];
            let args = { 'nnn': opcode & 0xfff, 'kk': opcode & 0xff, 'n': opcode & 0xf, 'x': (opcode & 0xf00) >> 8, 'y': (opcode & 0xf0) >> 4 };
            let opcodeName = '';
            if (this.chip8.opcodes.opcodes[opcode]) {
                opcodeName = this.chip8.opcodes.opcodes[opcode].name;
            } else if (this.chip8.opcodes.opcodes[opcode & 0xf0ff]) {
                opcodeName = this.chip8.opcodes.opcodes[opcode & 0xf0ff].name;
            } else if (this.chip8.opcodes.opcodes[opcode & 0xf00f]) {
                opcodeName = this.chip8.opcodes.opcodes[opcode & 0xf00f].name;
            } else if (this.chip8.opcodes.opcodes[opcode & 0xf000]) {
                opcodeName = this.chip8.opcodes.opcodes[opcode & 0xf000].name;
            } else {
                opcodeName = 'XXX';
            }
            let tokens = opcodeName.split(' ');
            let newOpcode = '';
            for (let j = 0; j < tokens.length; j++) {
                let i = tokens[j];
                if (i == 'nnn') {
                    newOpcode += (args.nnn < 256 ? args.nnn < 16 ? '00' : '0' : '') + args.nnn.toString(16);
                } else if (i == 'kk') {
                    newOpcode += (args.kk < 16 ? '0' : '') + args.kk.toString(16);
                } else if (i == 'n') {
                    newOpcode += args.n.toString(16);
                } else if (i == 'x') {
                    newOpcode += 'R' + args.x.toString(16);
                } else if (i == 'y') {
                    newOpcode += 'R' + args.y.toString(16);
                } else {
                    newOpcode += i;
                }
                newOpcode += ' ';
            }
            let address = (i < 256 ? i < 16 ? '00' : '0' : '') + i.toString(16);
            document.getElementById('dprogram').value += address + ': ' + newOpcode + '\n';
        }
    }

    loop() {
        for (let i = 0; i < this.chip8.keys.length; i++) {
            document.getElementById('k' + i.toString(16)).style.backgroundColor = this.chip8.keys[i] ? 'rgb(150, 150, 150)' : 'rgb(255, 255, 255)';
        }

        for (let i = 0; i < this.chip8.registers.length; i++) {
            document.getElementById('r' + i.toString(16)).innerHTML = this.chip8.registers[i].toString(16);
            document.getElementById('a' + i.toString(16)).innerHTML = this.chip8.registers[i];
        }

        document.getElementById('rI').innerHTML = this.chip8.registerI.toString(16);
        document.getElementById('aI').innerHTML = this.chip8.registerI;
    }
}