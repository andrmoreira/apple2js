const LAYOUT = [
    [
        ['1', '!'],
        ['2', '"'],
        ['3', '#'],
        ['4', '$'],
        ['5', '%'],
        ['6', '&'],
        ['7', "'"],
        ['8', '('],
        ['9', ')'],
        ['0', '0'],
        [':', '*'],
        ['-', '='],
        ['RESET', 'RESET']
    ],
    [
        ['ESC', 'ESC'],
        ['Q', 'Q'],
        ['W', 'W'],
        ['E', 'E'],
        ['R', 'R'],
        ['T', 'T'],
        ['Y', 'Y'],
        ['U', 'U'],
        ['I', 'I'],
        ['O', 'O'],
        ['P', 'P'],
        ['REPT', 'REPT'],
        ['RETURN', 'RETURN']
    ],
    [
        ['CTRL', 'CTRL'],
        ['A', 'A'],
        ['S', 'S'],
        ['D', 'D'],
        ['F', 'F'],
        ['G', 'BELL'],
        ['H', 'H'],
        ['J', 'J'],
        ['K', 'K'],
        ['L', 'L'],
        [';', '+'],
        ['←', '←'],
        ['→', '→']
    ],
    [
        ['SHIFT', 'SHIFT'],
        ['Z', 'Z'],
        ['X', 'X'],
        ['C', 'C'],
        ['V', 'V'],
        ['B', 'B'],
        ['N', '^'],
        ['M', 'M'],
        [',', '<'],
        ['.', '>'],
        ['/', '?'],
        ['SHIFT', 'SHIFT']
    ],
    [
        ['POWER', 'POWER'],
        [' ', ' ']
    ],
];

// Key codes
const CODES = {
    ESC: 0x1b,
    RETURN: 0x0d,
    ' ': 0x20,
    '←': 0x08,
    '→': 0x15
};

// State
let shifted = false;
let controlled = false;
let lastKey = null;
let repeatTimer = null;

const keyAudioContext = new (
    window.AudioContext || window.webkitAudioContext
)();

let keySoundBuffer = null;
const KEY_SOUND_START = 0.08;

fetch(new URL('./tac.mp3', import.meta.url))
    .then(response => {
        if (!response.ok) throw new Error('Audio file not found');
        return response.arrayBuffer();
    })
    .then(data => keyAudioContext.decodeAudioData(data))
    .then(buffer => {
        keySoundBuffer = buffer;
    })
    .catch(error => {
        console.warn('Could not load tac.mp3:', error);
    });

function playKeySound()
{
    if (!keySoundBuffer) return;

    const play = () => {
        const source = keyAudioContext.createBufferSource();
        source.buffer = keySoundBuffer;
        source.connect(keyAudioContext.destination);

        source.start(0, Math.min(KEY_SOUND_START, keySoundBuffer.duration));
    };

    if (keyAudioContext.state === 'running') {
        play();
    } else {
        keyAudioContext.resume().then(play).catch(error => {
            console.warn('Could not play tac.mp3:', error);
        });
    }
}

// Send to emulator
function send(code)
{
    if (typeof window.pressEmuKey === 'function') window.pressEmuKey(code);
}

function findPair(name)
{
    for (const row of LAYOUT) {
        for (const pair of row) {
            if (pair[0] === name) return pair;
        }
    }
    return null;
}

// Key handling
function onKey(name, btn)
{
    playKeySound();

    if (name === 'POWER') {
        const isOff = document.body.classList.toggle('power-off');
        btn.classList.toggle('kb-on', !isOff);
        if (typeof window.setPower === 'function') {
            window.setPower(!isOff);
        }
        return;
    }
    
    if (name === 'SHIFT') {
        shifted = !shifted;
        sync();
        return;
    }
    if (name === 'CTRL') {
        controlled = !controlled;
        sync();
        return;
    }
    if (name === 'RESET') {
        if (typeof window.resetEmu === 'function')
            window.resetEmu();
        else
            window.location.reload();
        return;
    }
    if (name === 'REPT') {
        if (lastKey !== null) send(lastKey);
        flash(btn);
        return;
    }

    if (name in CODES) {
        send(CODES[name]);
        lastKey = CODES[name];
        flash(btn);
        return;
    }

    const pair = findPair(name);
    let char = pair && shifted && pair[1] !== pair[0] ? pair[1] : name;

    if (char === 'BELL') char = 'G';
    
    if (controlled && /^[A-Za-z]$/.test(char)) {
        const code = char.toUpperCase().charCodeAt(0) - 0x40;
        send(code);
        lastKey = code;
    } else {
        send(char);
        lastKey = char;
    }

    flash(btn);
    if (shifted) {
        shifted = false;
        sync();
    }
}

// Visual state
function sync()
{
    document.querySelectorAll('[data-kb="SHIFT"]').forEach(el => el.classList.toggle('kb-on', shifted));
    document.querySelectorAll('[data-kb="CTRL"]').forEach(el => el.classList.toggle('kb-on', controlled));
}

function flash(btn)
{
    btn.classList.add('kb-on');
    setTimeout(() => {
        const n = btn.dataset.kb;
        if (n !== 'SHIFT' && n !== 'CTRL') btn.classList.remove('kb-on');
    }, 110);
}

// Build key
function buildKey(normal, shiftedLabel)
{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kb-btn';
    btn.dataset.kb = normal;

    if (normal !== shiftedLabel) {
        const up = document.createElement('span');
        up.className = 'kb-up';
        up.textContent = shiftedLabel;
        const down = document.createElement('span');
        down.className = 'kb-down';
        down.textContent = normal;
        btn.append(up, down);
    } else {
        const label = document.createElement('span');
        label.className = 'kb-down';
        label.textContent = normal === ' ' ? '' : normal;
        btn.append(label);
    }

    if (normal === ' ') btn.classList.add('kb-space');
    if (['RETURN', 'CTRL', 'SHIFT', 'RESET', 'REPT'].includes(normal)) {
        btn.classList.add('kb-wide');
    }

    btn.addEventListener('click', () => {
        onKey(normal, btn);
    });

    if (normal === 'REPT') {
        btn.addEventListener('pointerdown', () => {
            repeatTimer = setInterval(() => {
                if (lastKey !== null) {
                    send(lastKey);
                    playKeySound();
                }
            }, 120);
        });
        const stop = () => clearInterval(repeatTimer);
        btn.addEventListener('pointerup', stop);
        btn.addEventListener('pointerleave', stop);
    }

    return btn;
}

// Mount
export function mountKeyboard(container)
{
    const root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) return;
    root.innerHTML = '';
    for (const rowData of LAYOUT) {
        const row = document.createElement('div');
        row.className = 'kb-line';
        for (const [normal, shiftedLabel] of rowData) {
            row.appendChild(buildKey(normal, shiftedLabel));
        }
        root.appendChild(row);
    }
    sync();
}
