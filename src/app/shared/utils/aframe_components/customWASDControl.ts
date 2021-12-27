declare var AFRAME;

const KEYCODE_TO_CODE = {
    '38': 'ArrowUp',
    '37': 'ArrowLeft',
    '40': 'ArrowDown',
    '39': 'ArrowRight',
    '87': 'KeyW',
    '65': 'KeyA',
    '83': 'KeyS',
    '68': 'KeyD'
};
const bind = AFRAME.utils.bind;
const shouldCaptureKeyEvent = AFRAME.utils.shouldCaptureKeyEvent;
const AFRAME_THREE = AFRAME.THREE;

const CLAMP_VELOCITY = 0.01;
const MAX_DELTA = 0.2;
const KEYS = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
];

function isEmptyObject (keys) {
    let key;
    // tslint:disable-next-line: forin
    for (key in keys) {return false; }
    return true;
}

export const customWASDControl = {
    schema: {
        acceleration: {default: 65},
        adAxis: {default: 'x', oneOf: ['x', 'y', 'z']},
        adEnabled: {default: true},
        adInverted: {default: false},
        enabled: {default: true},
        fly: {default: false},
        wsAxis: {default: 'z', oneOf: ['x', 'y', 'z']},
        wsEnabled: {default: true},
        wsInverted: {default: false}
    },

    init: function () {
        // To keep track of the pressed keys.
        this.keys = {};
        this.easing = 1.1;

        this.velocity = new AFRAME_THREE.Vector3();

        // Bind methods and add event listeners.
        this.onBlur = bind(this.onBlur, this);
        this.onContextMenu = bind(this.onContextMenu, this);
        this.onFocus = bind(this.onFocus, this);
        this.onKeyDown = bind(this.onKeyDown, this);
        this.onKeyUp = bind(this.onKeyUp, this);
        this.onVisibilityChange = bind(this.onVisibilityChange, this);
        this.attachVisibilityEventListeners();
        this.pos = new AFRAME_THREE.Vector3();
    },

    tick: function (time, delta) {
        const data = this.data;
        const el = this.el;
        const velocity = this.velocity;

        if (!velocity[data.adAxis] && !velocity[data.wsAxis] &&
            isEmptyObject(this.keys)) { return; }

        // Update velocity.
        delta = delta / 1000;
        this.updateVelocity(delta);

        if (!velocity[data.adAxis] && !velocity[data.wsAxis]) { return; }

        const updateCamDiv = <HTMLButtonElement> document.getElementById('aframe-cameraUpdateData');
        if (updateCamDiv && (<HTMLInputElement>updateCamDiv.children[4]).value) { return; }

        // Get movement vector and translate position.
        const movementVector = this.getMovementVector(delta);
        el.object3D.position.add(movementVector);
        if (updateCamDiv) {
            const updatePosCheck = <HTMLInputElement> updateCamDiv.children[0];
            const updatePosInp = <HTMLInputElement> updateCamDiv.children[1];
            updatePosCheck.value = '1';
            el.object3D.getWorldPosition(this.pos);
            updatePosInp.value = `${this.pos.x.toFixed(2)},${(-this.pos.z).toFixed(2)},${this.pos.y.toFixed(2)}`;
        }
    },

    remove: function () {
        this.removeKeyEventListeners();
        this.removeVisibilityEventListeners();
    },

    play: function () {
        this.attachKeyEventListeners();
    },

    pause: function () {
        this.keys = {};
        this.removeKeyEventListeners();
    },

    updateVelocity: function (delta) {
        let acceleration;
        let adAxis;
        let adSign;
        const data = this.data;
        const keys = this.keys;
        const velocity = this.velocity;
        let wsAxis;
        let wsSign;

        adAxis = data.adAxis;
        wsAxis = data.wsAxis;

        // If FPS too low, reset velocity.
        if (delta > MAX_DELTA) {
            velocity[adAxis] = 0;
            velocity[wsAxis] = 0;
            return;
        }

        // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
        const scaledEasing = Math.pow(1 / this.easing, delta * 60);
        // Velocity Easing.
        if (velocity[adAxis] !== 0) {
            velocity[adAxis] = velocity[adAxis] * scaledEasing;
        }
        if (velocity[wsAxis] !== 0) {
            velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
        }
        // Clamp velocity easing.
        if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) { velocity[adAxis] = 0; }
        if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) { velocity[wsAxis] = 0; }

        if (!data.enabled) { return; }

        // Update velocity using keys pressed.
        acceleration = data.acceleration;
        if (data.adEnabled) {
            adSign = data.adInverted ? -1 : 1;
            if (keys.KeyA || keys.ArrowLeft) { velocity[adAxis] -= adSign * acceleration * delta; }
            if (keys.KeyD || keys.ArrowRight) { velocity[adAxis] += adSign * acceleration * delta; }
        }
        if (data.wsEnabled) {
            wsSign = data.wsInverted ? -1 : 1;
            if (keys.KeyW || keys.ArrowUp) { velocity[wsAxis] -= wsSign * acceleration * delta; }
            if (keys.KeyS || keys.ArrowDown) { velocity[wsAxis] += wsSign * acceleration * delta; }
        }
    },

    getMovementVector: (function () {
        const directionVector = new AFRAME_THREE.Vector3(0, 0, 0);
        const rotationEuler = new AFRAME_THREE.Euler(0, 0, 0, 'YXZ');

        return function (delta) {
            const lookCam = <any> document.getElementById('aframe_look_camera');
            const rotation = <THREE.Vector3> lookCam.getAttribute('rotation');
            const velocity = this.velocity;
            let xRotation;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);

            // Absolute.
            if (!rotation) { return directionVector; }

            xRotation = this.data.fly ? rotation.x : 0;

            // Transform direction relative to heading.
            rotationEuler.set(AFRAME_THREE.Math.degToRad(xRotation), AFRAME_THREE.Math.degToRad(rotation.y), 0);
            directionVector.applyEuler(rotationEuler);
            return directionVector;
        };
    })(),

    attachVisibilityEventListeners: function () {
        window.oncontextmenu = this.onContextMenu;
        window.addEventListener('blur', this.onBlur);
        window.addEventListener('focus', this.onFocus);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    removeVisibilityEventListeners: function () {
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('focus', this.onFocus);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    },

    attachKeyEventListeners: function () {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },

    removeKeyEventListeners: function () {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    },

    onContextMenu: function () {
        const keys = Object.keys(this.keys);
        for (let i = 0; i < keys.length; i++) {
            delete this.keys[keys[i]];
        }
    },

    onBlur: function () {
        this.pause();
    },

    onFocus: function () {
        this.play();
    },

    onVisibilityChange: function () {
        if (document.hidden) {
            this.onBlur();
        } else {
            this.onFocus();
        }
    },

    onKeyDown: function (event) {
        let code;
        if (!shouldCaptureKeyEvent(event)) { return; }
        code = event.code || KEYCODE_TO_CODE[event.keyCode];
        if (KEYS.indexOf(code) !== -1) { this.keys[code] = true; }
        // if (Object.keys(this.keys).length > 0) {
        //     if (this.lastsettimeout) {
        //         clearTimeout(this.lastsettimeout);
        //     }
        //     this.backgroundSky.setAttribute('visible', false);
        // }
    },

    onKeyUp: function (event) {
        let code;
        code = event.code || KEYCODE_TO_CODE[event.keyCode];
        delete this.keys[code];
        // if (Object.keys(this.keys).length === 0) {
        //     this.lastsettimeout = setTimeout(() => {
        //         this.backgroundSky.setAttribute('visible', true);
        //     }, 700);
        // }
    }
};
