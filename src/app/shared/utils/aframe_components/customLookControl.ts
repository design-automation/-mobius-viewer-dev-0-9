declare var AFRAME;

const bind = AFRAME.utils.bind;
const utils = AFRAME.utils;
const AFRAME_THREE = AFRAME.THREE;

const PI_2 = Math.PI / 2;

export const customLookControl = {
    dependencies: ['position', 'rotation'],

    schema: {
      enabled: {default: true},
      magicWindowTrackingEnabled: {default: true},
      pointerLockEnabled: {default: false},
      reverseMouseDrag: {default: false},
      reverseTouchDrag: {default: false},
      touchEnabled: {default: true},
      mouseEnabled: {default: true}
    },

    init: function () {
      this.deltaYaw = 0;
      this.previousHMDPosition = new AFRAME_THREE.Vector3();
      this.hmdQuaternion = new AFRAME_THREE.Quaternion();
      this.magicWindowAbsoluteEuler = new AFRAME_THREE.Euler();
      this.magicWindowDeltaEuler = new AFRAME_THREE.Euler();
      this.position = new AFRAME_THREE.Vector3();
      this.magicWindowObject = new AFRAME_THREE.Object3D();
      this.rotation = {};
      this.deltaRotation = {};
      this.prevRotation = null;
      this.savedPose = null;
      this.pointerLocked = false;
      this.setupMouseControls();
      this.bindMethods();
      this.previousMouseEvent = {};

      this.setupMagicWindowControls();

      // To save / restore camera pose
      this.savedPose = {
        position: new AFRAME_THREE.Vector3(),
        rotation: new AFRAME_THREE.Euler()
      };

      // Call enter VR handler if the scene has entered VR before the event listeners attached.
      if (this.el.sceneEl.is('vr-mode')) { this.onEnterVR(); }
    },

    setupMagicWindowControls: function () {
      let magicWindowControls;
      const data = this.data;

      // Only on mobile devices and only enabled if DeviceOrientation permission has been granted.
      if (utils.device.isMobile()) {
        magicWindowControls = this.magicWindowControls = new AFRAME_THREE.DeviceOrientationControls(this.magicWindowObject);
        // @ts-ignore
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
          magicWindowControls.enabled = false;
          if (this.el.sceneEl.components['device-orientation-permission-ui'].permissionGranted) {
            magicWindowControls.enabled = data.magicWindowTrackingEnabled;
          } else {
            this.el.sceneEl.addEventListener('deviceorientationpermissiongranted', function () {
              magicWindowControls.enabled = data.magicWindowTrackingEnabled;
            });
          }
        }
      }
    },

    update: function (oldData) {
      const data = this.data;

      // Disable grab cursor classes if no longer enabled.
      if (data.enabled !== oldData.enabled) {
        this.updateGrabCursor(data.enabled);
      }

      // Reset magic window eulers if tracking is disabled.
      if (oldData && !data.magicWindowTrackingEnabled && oldData.magicWindowTrackingEnabled) {
        this.magicWindowAbsoluteEuler.set(0, 0, 0);
        this.magicWindowDeltaEuler.set(0, 0, 0);
      }

      // Pass on magic window tracking setting to magicWindowControls.
      if (this.magicWindowControls) {
        this.magicWindowControls.enabled = data.magicWindowTrackingEnabled;
      }

      if (oldData && !data.pointerLockEnabled !== oldData.pointerLockEnabled) {
        this.removeEventListeners();
        this.addEventListeners();
        if (this.pointerLocked) { this.exitPointerLock(); }
      }
    },

    tick: function (t) {
      if (!this.data.enabled) { return; }
      this.updateOrientation();
    },

    play: function () {
      this.addEventListeners();
    },

    pause: function () {
      this.removeEventListeners();
      if (this.pointerLocked) { this.exitPointerLock(); }
    },

    remove: function () {
      this.removeEventListeners();
      if (this.pointerLocked) { this.exitPointerLock(); }
    },

    bindMethods: function () {
      this.onMouseDown = bind(this.onMouseDown, this);
      this.onMouseMove = bind(this.onMouseMove, this);
      this.onMouseUp = bind(this.onMouseUp, this);
      this.onTouchStart = bind(this.onTouchStart, this);
      this.onTouchMove = bind(this.onTouchMove, this);
      this.onTouchEnd = bind(this.onTouchEnd, this);
      this.onEnterVR = bind(this.onEnterVR, this);
      this.onExitVR = bind(this.onExitVR, this);
      this.onPointerLockChange = bind(this.onPointerLockChange, this);
      this.onPointerLockError = bind(this.onPointerLockError, this);
    },

   /**
    * Set up states and Object3Ds needed to store rotation data.
    */
    setupMouseControls: function () {
      this.mouseDown = false;
      this.pitchObject = new AFRAME_THREE.Object3D();
      this.yawObject = new AFRAME_THREE.Object3D();
      this.yawObject.position.y = 10;
      this.yawObject.add(this.pitchObject);
    },

    /**
     * Add mouse and touch event listeners to canvas.
     */
    addEventListeners: function () {
      const sceneEl = this.el.sceneEl;
      const canvasEl = sceneEl.canvas;

      // Wait for canvas to load.
      if (!canvasEl) {
        sceneEl.addEventListener('render-target-loaded', bind(this.addEventListeners, this));
        return;
      }

      // Mouse events.
      canvasEl.addEventListener('mousedown', this.onMouseDown, false);
      window.addEventListener('mousemove', this.onMouseMove, false);
      window.addEventListener('mouseup', this.onMouseUp, false);

      // Touch events.
      canvasEl.addEventListener('touchstart', this.onTouchStart);
      window.addEventListener('touchmove', this.onTouchMove);
      window.addEventListener('touchend', this.onTouchEnd);

      // sceneEl events.
      sceneEl.addEventListener('enter-vr', this.onEnterVR);
      sceneEl.addEventListener('exit-vr', this.onExitVR);

      // Pointer Lock events.
      if (this.data.pointerLockEnabled) {
        document.addEventListener('pointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('pointerlockerror', this.onPointerLockError, false);
      }
    },

    /**
     * Remove mouse and touch event listeners from canvas.
     */
    removeEventListeners: function () {
      const sceneEl = this.el.sceneEl;
      const canvasEl = sceneEl && sceneEl.canvas;

      if (!canvasEl) { return; }

      // Mouse events.
      canvasEl.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);

      // Touch events.
      canvasEl.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);

      // sceneEl events.
      sceneEl.removeEventListener('enter-vr', this.onEnterVR);
      sceneEl.removeEventListener('exit-vr', this.onExitVR);

      // Pointer Lock events.
      document.removeEventListener('pointerlockchange', this.onPointerLockChange, false);
      document.removeEventListener('mozpointerlockchange', this.onPointerLockChange, false);
      document.removeEventListener('pointerlockerror', this.onPointerLockError, false);
    },

    /**
     * Update orientation for mobile, mouse drag, and headset.
     * Mouse-drag only enabled if HMD is not active.
     */
    updateOrientation: (function () {
      const poseMatrix = new AFRAME_THREE.Matrix4();

      return function () {
        const object3D = this.el.object3D;
        const pitchObject = this.pitchObject;
        const yawObject = this.yawObject;
        let pose;
        const sceneEl = this.el.sceneEl;

        // In VR mode, THREE is in charge of updating the camera pose.
        if (sceneEl.is('vr-mode') && sceneEl.checkHeadsetConnected()) {
          // With WebXR THREE applies headset pose to the object3D matrixWorld internally.
          // Reflect values back on position, rotation, scale for getAttribute to return the expected values.
          if (sceneEl.hasWebXR) {
            pose = sceneEl.renderer.xr.getCameraPose();
            if (pose) {
              poseMatrix.elements = pose.transform.matrix;
              poseMatrix.decompose(object3D.position, object3D.rotation, object3D.scale);
            }
          }
          return;
        }

        this.updateMagicWindowOrientation();

        // On mobile, do camera rotation with touch events and sensors.
        object3D.rotation.x = this.magicWindowDeltaEuler.x + pitchObject.rotation.x;
        object3D.rotation.y = this.magicWindowDeltaEuler.y + yawObject.rotation.y;
        object3D.rotation.z = this.magicWindowDeltaEuler.z;

        if (!this.prevRotation || this.prevRotation.x !== object3D.rotation.x || this.prevRotation.y !== object3D.rotation.y) {
            this.prevRotation = {
                x: object3D.rotation.x,
                y: object3D.rotation.y
            };
            const updateCamDiv = <HTMLButtonElement> document.getElementById('aframe-cameraUpdateData');
            if (updateCamDiv) {
                const updateLookCheck = <HTMLInputElement> updateCamDiv.children[2];
                const updateLookInp = <HTMLInputElement> updateCamDiv.children[3];
                updateLookCheck.value = '1';
                updateLookInp.value = (- this.el.getAttribute('rotation').y).toFixed(2);
            }
        }
      };
    })(),

    updateMagicWindowOrientation: function () {
      const magicWindowAbsoluteEuler = this.magicWindowAbsoluteEuler;
      const magicWindowDeltaEuler = this.magicWindowDeltaEuler;
      // Calculate magic window HMD quaternion.
      if (this.magicWindowControls && this.magicWindowControls.enabled) {
        this.magicWindowControls.update();
        magicWindowAbsoluteEuler.setFromQuaternion(this.magicWindowObject.quaternion, 'YXZ');
        if (!this.previousMagicWindowYaw && magicWindowAbsoluteEuler.y !== 0) {
          this.previousMagicWindowYaw = magicWindowAbsoluteEuler.y;
        }
        if (this.previousMagicWindowYaw) {
          magicWindowDeltaEuler.x = magicWindowAbsoluteEuler.x;
          magicWindowDeltaEuler.y += magicWindowAbsoluteEuler.y - this.previousMagicWindowYaw;
          magicWindowDeltaEuler.z = magicWindowAbsoluteEuler.z;
          this.previousMagicWindowYaw = magicWindowAbsoluteEuler.y;
        }
      }
    },

    /**
     * Translate mouse drag into rotation.
     *
     * Dragging up and down rotates the camera around the X-axis (yaw).
     * Dragging left and right rotates the camera around the Y-axis (pitch).
     */
    onMouseMove: function (evt) {
      let direction;
      let movementX;
      let movementY;
      const pitchObject = this.pitchObject;
      const previousMouseEvent = this.previousMouseEvent;
      const yawObject = this.yawObject;

      // Not dragging or not enabled.
      if (!this.data.enabled || (!this.mouseDown && !this.pointerLocked)) { return; }

      // Calculate delta.
      if (this.pointerLocked) {
        movementX = evt.movementX || evt.mozMovementX || 0;
        movementY = evt.movementY || evt.mozMovementY || 0;
      } else {
        movementX = evt.screenX - previousMouseEvent.screenX;
        movementY = evt.screenY - previousMouseEvent.screenY;
      }
      this.previousMouseEvent.screenX = evt.screenX;
      this.previousMouseEvent.screenY = evt.screenY;

      // Calculate rotation.
      direction = this.data.reverseMouseDrag ? 1 : -1;
      yawObject.rotation.y += movementX * 0.002 * direction;
      pitchObject.rotation.x += movementY * 0.002 * direction;
      pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
    },

    /**
     * Register mouse down to detect mouse drag.
     */
    onMouseDown: function (evt) {
      const sceneEl = this.el.sceneEl;
      if (!this.data.enabled || !this.data.mouseEnabled || (sceneEl.is('vr-mode') && sceneEl.checkHeadsetConnected())) { return; }
      // Handle only primary button.
      if (evt.button !== 0) { return; }

      const canvasEl = sceneEl && sceneEl.canvas;

      this.mouseDown = true;
      this.previousMouseEvent.screenX = evt.screenX;
      this.previousMouseEvent.screenY = evt.screenY;
      this.showGrabbingCursor();

      if (this.data.pointerLockEnabled && !this.pointerLocked) {
        if (canvasEl.requestPointerLock) {
          canvasEl.requestPointerLock();
        } else if (canvasEl.mozRequestPointerLock) {
          canvasEl.mozRequestPointerLock();
        }
      }
    },

    /**
     * Shows grabbing cursor on scene
     */
    showGrabbingCursor: function () {
      this.el.sceneEl.canvas.style.cursor = 'grabbing';
    },

    /**
     * Hides grabbing cursor on scene
     */
    hideGrabbingCursor: function () {
      this.el.sceneEl.canvas.style.cursor = '';
    },

    /**
     * Register mouse up to detect release of mouse drag.
     */
    onMouseUp: function () {
      this.mouseDown = false;
      this.hideGrabbingCursor();
    },

    /**
     * Register touch down to detect touch drag.
     */
    onTouchStart: function (evt) {
      if (evt.touches.length !== 1 ||
          !this.data.touchEnabled ||
          this.el.sceneEl.is('vr-mode')) { return; }
      this.touchStart = {
        x: evt.touches[0].pageX,
        y: evt.touches[0].pageY
      };
      this.touchStarted = true;
    },

    /**
     * Translate touch move to Y-axis rotation.
     */
    onTouchMove: function (evt) {
      let direction;
      const canvas = this.el.sceneEl.canvas;
      let deltaY;
      const yawObject = this.yawObject;

      if (!this.touchStarted || !this.data.touchEnabled) { return; }

      deltaY = 2 * Math.PI * (evt.touches[0].pageX - this.touchStart.x) / canvas.clientWidth;

      direction = this.data.reverseTouchDrag ? 1 : -1;
      // Limit touch orientaion to to yaw (y axis).
      yawObject.rotation.y -= deltaY * 0.5 * direction;
      this.touchStart = {
        x: evt.touches[0].pageX,
        y: evt.touches[0].pageY
      };
    },

    /**
     * Register touch end to detect release of touch drag.
     */
    onTouchEnd: function () {
      this.touchStarted = false;
    },

    /**
     * Save pose.
     */
    onEnterVR: function () {
      const sceneEl = this.el.sceneEl;
      if (!sceneEl.checkHeadsetConnected()) { return; }
      this.saveCameraPose();
      this.el.object3D.position.set(0, 0, 0);
      this.el.object3D.rotation.set(0, 0, 0);
      if (sceneEl.hasWebXR) {
        this.el.object3D.matrixAutoUpdate = false;
        this.el.object3D.updateMatrix();
      }
    },

    /**
     * Restore the pose.
     */
    onExitVR: function () {
      if (!this.el.sceneEl.checkHeadsetConnected()) { return; }
      this.restoreCameraPose();
      this.previousHMDPosition.set(0, 0, 0);
      this.el.object3D.matrixAutoUpdate = true;
    },

    /**
     * Update Pointer Lock state.
     */
    onPointerLockChange: function () {
      this.pointerLocked = !!(document.pointerLockElement || (<any> document).mozPointerLockElement);
    },

    /**
     * Recover from Pointer Lock error.
     */
    onPointerLockError: function () {
      this.pointerLocked = false;
    },

    // Exits pointer-locked mode.
    exitPointerLock: function () {
      document.exitPointerLock();
      this.pointerLocked = false;
    },

    /**
     * Toggle the feature of showing/hiding the grab cursor.
     */
    updateGrabCursor: function (enabled) {
      const sceneEl = this.el.sceneEl;

      function enableGrabCursor () { sceneEl.canvas.classList.add('a-grab-cursor'); }
      function disableGrabCursor () { sceneEl.canvas.classList.remove('a-grab-cursor'); }

      if (!sceneEl.canvas) {
        if (enabled) {
          sceneEl.addEventListener('render-target-loaded', enableGrabCursor);
        } else {
          sceneEl.addEventListener('render-target-loaded', disableGrabCursor);
        }
        return;
      }

      if (enabled) {
        enableGrabCursor();
        return;
      }
      disableGrabCursor();
    },

    /**
     * Save camera pose before entering VR to restore later if exiting.
     */
    saveCameraPose: function () {
      const el = this.el;

      this.savedPose.position.copy(el.object3D.position);
      this.savedPose.rotation.copy(el.object3D.rotation);
      this.hasSavedPose = true;
    },

    /**
     * Reset camera pose to before entering VR.
     */
    restoreCameraPose: function () {
      const el = this.el;
      const savedPose = this.savedPose;

      if (!this.hasSavedPose) { return; }

      // Reset camera orientation.
      el.object3D.position.copy(savedPose.position);
      el.object3D.rotation.copy(savedPose.rotation);
      this.hasSavedPose = false;
    }
};
