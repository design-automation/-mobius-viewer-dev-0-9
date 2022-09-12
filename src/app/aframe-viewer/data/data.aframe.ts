import { Model, SIMFuncs, EEntType } from '@design-automation/mobius-sim-funcs';
import { processDownloadURL } from '@shared/utils/otherUtils';
import * as THREE from 'three';

import { AframeSettings } from '../aframe-viewer.settings';

declare var AFRAME;
const DEFAUT_CAMERA_POS = {
    position: new AFRAME.THREE.Vector3(0, 0, 0),
    rotation: new AFRAME.THREE.Vector3(0, 0, 0)
};
const CAMERA_SNAP_DELAY = 1500;

function postloadSkyBGImg() {
    const sky = <any> document.getElementById('aframe_sky_background');
    sky.setAttribute('src', '');
    sky.setAttribute('src', '#aframe_sky_background_img');
}
function postloadSkyFGImg() {
    const sky = <any> document.getElementById('aframe_sky_foreground');
    sky.setAttribute('src', '');
    sky.setAttribute('src', '#aframe_sky_foreground_img');
}
/**
 * Aframe data
 */
export class DataAframe {
    public model: Model;
    public container: HTMLDivElement;
    public scene;
    public camera;
    public settings: AframeSettings;

    public navMeshEnabled = false;

    public camPosList = [null];
    public staticCamOn = false;
    public disableCamSwitch = false;
    public vr = {
        enabled: false,
        background_url: '',
        background_rotation: 0,
        foreground_url: '',
        foreground_rotation: 0,
        camera_position: new AFRAME.THREE.Vector3(0, 5, 0),
        camera_rotation: new AFRAME.THREE.Vector3(0, 0, 0),
    };

    private _currentPos = null;
    private sim_funcs: SIMFuncs;

    private north_rotation = 0;


    // test file: https://raw.githubusercontent.com/design-automation/mobius-vr/master/assets/Street%20View%20360_1.jpg

    constructor(settings) {
        this.settings = JSON.parse(JSON.stringify(settings));
        if (this.settings.vr) {
            this.vr.background_url = this.settings.vr.background_url;
            this.vr.background_rotation = this.settings.vr.background_rotation;
            this.vr.foreground_url = this.settings.vr.foreground_url;
            this.vr.foreground_rotation = this.settings.vr.foreground_rotation;
        }
        this.sim_funcs = new SIMFuncs();
    }

    onChanges(changes, threejsScene) {
        if (changes.data) {
            if (!threejsScene) { return; }
            if (!this.model) {
                this.removeMobiusObjs();
                return;
            }
            if (!threejsScene.model || threejsScene.model !== this.model) {
                threejsScene.model = this.model;
                threejsScene.populateScene(this.model, null);
            }
            this.refreshModel(threejsScene);
        }
    }

    public updateSettings(settings: AframeSettings = null) {
        let newSetting: AframeSettings;
        if (settings) {
            newSetting = <AframeSettings> JSON.parse(JSON.stringify(settings));
        } else {
            newSetting = <AframeSettings> JSON.parse(localStorage.getItem('aframe_settings'));
        }
        if (!newSetting) { return; }
        if (newSetting.hasOwnProperty('background')) {
            this.settings.background = newSetting.background;
        }
        if (newSetting.background) {
            this.settings.background.background_set = newSetting.background.background_set;
            this.settings.background.background_url = newSetting.background.background_url;
            this.settings.background.background_position.x = newSetting.background.background_position.x;
            this.settings.background.background_position.z = newSetting.background.background_position.z;
            this.settings.background.background_rotation = newSetting.background.background_rotation;
        }
        if (newSetting.vr) {
            this.settings.vr.background_url = newSetting.vr.background_url;
            this.settings.vr.background_rotation = newSetting.vr.background_rotation;
            this.settings.vr.foreground_url = newSetting.vr.foreground_url;
            this.settings.vr.foreground_rotation = newSetting.vr.foreground_rotation;
        }
        if (newSetting.ground) {
            this.settings.ground.show = newSetting.ground.show;
            this.settings.ground.width = newSetting.ground.width;
            this.settings.ground.length = newSetting.ground.length;
            this.settings.ground.height = newSetting.ground.height;
            this.settings.ground.color = newSetting.ground.color;
            this.settings.ground.shininess = newSetting.ground.shininess;
        }
        if (newSetting.camera) {
            if (newSetting.camera.position) {
                this.settings.camera.position.x = newSetting.camera.position.x;
                this.settings.camera.position.y = newSetting.camera.position.y;
                this.settings.camera.position.z = newSetting.camera.position.z;
                this.settings.camera.rotation.x = newSetting.camera.rotation.x;
                this.settings.camera.rotation.y = newSetting.camera.rotation.y;
                this.settings.camera.rotation.z = newSetting.camera.rotation.z;
            }
            this.settings.camera.acceleration = newSetting.camera.acceleration;
        }
        if (newSetting.ambient_light) {
            this.settings.ambient_light.show = newSetting.ambient_light.show;
            this.settings.ambient_light.color = newSetting.ambient_light.color;
            this.settings.ambient_light.intensity = newSetting.ambient_light.intensity;
        }
        if (newSetting.hemisphere_light) {
            this.settings.hemisphere_light.show = newSetting.hemisphere_light.show;
            this.settings.hemisphere_light.skyColor = newSetting.hemisphere_light.skyColor;
            this.settings.hemisphere_light.groundColor = newSetting.hemisphere_light.groundColor;
            this.settings.hemisphere_light.intensity = newSetting.hemisphere_light.intensity;
        }
        if (newSetting.directional_light) {
            this.settings.directional_light.show = newSetting.directional_light.show;
            this.settings.directional_light.color = newSetting.directional_light.color;
            this.settings.directional_light.intensity = newSetting.directional_light.intensity;
            this.settings.directional_light.azimuth = newSetting.directional_light.azimuth;
            this.settings.directional_light.altitude = newSetting.directional_light.altitude;
            this.settings.directional_light.shadowSize = newSetting.directional_light.shadowSize;
        }
        localStorage.setItem('aframe_settings', JSON.stringify(this.settings));
    }

    removeMobiusObjs() {
        const entity = document.getElementById('mobius_geom');
        if (!entity || !entity.getAttribute('mobius_geometry')) { return; }
        (<any> entity).removeObject3D('mobius_geometry');
    }

    getMaterial(material) {
        let materials = [];
        if (!Array.isArray(material)) {
            let newMat;
            if (material.type === 'MeshPhongMaterial') {
                newMat = new AFRAME.THREE.MeshPhongMaterial();
            } else if (material.type === 'MeshBasicMaterial') {
                newMat = new AFRAME.THREE.MeshBasicMaterial();
            } else if (material.type === 'MeshStandardMaterial') {
                newMat = new AFRAME.THREE.MeshStandardMaterial();
            } else if (material.type === 'MeshLambertMaterial') {
                newMat = new AFRAME.THREE.MeshLambertMaterial();
            } else if (material.type === 'MeshPhysicalMaterial') {
                newMat = new AFRAME.THREE.MeshPhysicalMaterial();
            } else if (material.type === 'LineDashedMaterial') {
                newMat = new AFRAME.THREE.LineDashedMaterial();
            } else if (material.type === 'PointsMaterial') {
                newMat = new AFRAME.THREE.PointsMaterial();
            }
            newMat.copy(material);
            materials.push(newMat);
        } else {
            for (const mat of material) {
                materials = materials.concat(this.getMaterial(mat));
            }
        }
        return materials;
    }

    refreshModel(threejsScene) {
        this.removeMobiusObjs();
        const threeJSGroup = new AFRAME.THREE.Group();
        this.navMeshEnabled = false;
        if (!this.model) { return; }
        try {
            this.sim_funcs.setModel(this.model);
            const all_pgons = this.sim_funcs.model.getEnts(EEntType.PGON);
            const attrib = <any> this.sim_funcs.model.getAttribVal(EEntType.PGON, all_pgons, 'vr_nav_mesh');
            if (attrib && attrib.length !== 0) {
                this.navMeshEnabled = true;
            }
        } catch (ex) {
            this.navMeshEnabled = false;
        }
        for (const i of threejsScene.scene.children) {
            if (i.name.startsWith('obj')) {
                const materials = this.getMaterial(i.material);
                if (i.name === 'obj_tri') {
                    threeJSGroup.add(new AFRAME.THREE.Mesh(i.geometry, materials));
                } else if (i.name === 'obj_line') {
                    threeJSGroup.add(new AFRAME.THREE.LineSegments(i.geometry, materials));
                } else if (i.name === 'obj_point') {
                    threeJSGroup.add(new AFRAME.THREE.Points(i.geometry, materials));
                } else if (i.name === 'obj_tri_hidden_navmesh') {
                    const navMesh = document.getElementById('mobius_nav_mesh');
                    if (navMesh) {
                        (<any> navMesh).setObject3D('mesh', new AFRAME.THREE.Mesh(i.geometry, materials));
                    }
                }
            }
        }

        // if there's a north attribute
        if (this.sim_funcs.model.hasModelAttrib('north')) {

            // get north attribute
            const north_dir: any = this.sim_funcs.model.getModelAttribVal('north');

            if (north_dir.constructor === [].constructor && north_dir.length === 2) {
                // make the north vector and the default north vector
                const model_cartesian = new THREE.Vector3(north_dir[0], north_dir[1], 0);
                const north_cartesian = new THREE.Vector3(0, 1, 0);
                let angle = north_cartesian.angleTo(model_cartesian);
                if (north_cartesian.cross(model_cartesian).z < 0) {
                    angle = -angle;
                }
                this.north_rotation = angle * 180 / Math.PI;
            }
        }

        threeJSGroup.name = 'mobius_geom';
        const entity = document.getElementById('mobius_geom');
        if (entity) {
            (<any> entity).setObject3D('mobius_geometry', threeJSGroup);
        }
        this.updateCamPos();

        if (!this.staticCamOn) {
            this.updateCamera(this.settings.camera);
            this.updateSky();
            this.updateLight(threeJSGroup);
        }

        this.updateGround();
        this.updateHUD();
    }

    updateLight(threeJSGroup) {
        const ambLightElement = <any> document.getElementById('aframe_ambientLight');
        const hemLightElement = <any> document.getElementById('aframe_hemisphereLight');
        const dirLightElement = <any> document.getElementById('aframe_directionalLight');
        if (!ambLightElement || !hemLightElement || !dirLightElement) { return; }
        const ambLight = ambLightElement.object3D.children[0];
        const hemLight = hemLightElement.object3D.children[0];
        const dirLight = dirLightElement.object3D.children[0];
        if (!ambLight || !hemLight || !dirLight) {
            setTimeout(() => {this.updateLight(threeJSGroup); }, 0);
            return;
        }
        if (this.settings.ambient_light.show) {
            ambLight.visible = true;
            ambLight.color = new AFRAME.THREE.Color(parseInt(this.settings.ambient_light.color.replace('#', '0x'), 16));
            ambLight.intensity = this.settings.ambient_light.intensity;
        } else {
            ambLight.visible = false;
        }

        if (this.settings.hemisphere_light.show) {
            hemLight.visible = true;
            hemLight.intensity = this.settings.hemisphere_light.intensity;
            hemLight.color = new AFRAME.THREE.Color(parseInt(this.settings.hemisphere_light.skyColor.replace('#', '0x'), 16));
            hemLight.groundColor = new AFRAME.THREE.Color(parseInt(this.settings.hemisphere_light.groundColor.replace('#', '0x'), 16));
        } else {
            hemLight.visible = false;
        }

        if (this.settings.directional_light.show) {
            const boundingSphere = this._getAllObjsSphere(threeJSGroup);
            dirLight.visible = true;
            dirLight.intensity = this.settings.directional_light.intensity;
            dirLight.color = new AFRAME.THREE.Color(parseInt(this.settings.directional_light.color.replace('#', '0x'), 16));
            dirLight.shadow.camera.top = boundingSphere.radius;
            dirLight.shadow.camera.left = -boundingSphere.radius;
            dirLight.shadow.camera.right = boundingSphere.radius;
            dirLight.shadow.camera.bottom = -boundingSphere.radius;
            dirLight.shadow.camera.far = boundingSphere.radius * 20;
            dirLight.shadow.bias = -0.0001;
            const dirLightPos = this.getDLPosition(boundingSphere.radius, this.settings.directional_light.azimuth, this.settings.directional_light.altitude, boundingSphere.center);
            dirLight.position.set(...dirLightPos);
            if (dirLight.shadow.mapSize.width !== this.settings.directional_light.shadowSize) {
                dirLight.shadow.mapSize.set(this.settings.directional_light.shadowSize, this.settings.directional_light.shadowSize);
            }
        } else {
            dirLightElement.setAttribute('visible', 'false');
        }
    }

    /**
     *
     * @param scale
     * @param azimuth
     * @param altitude
     */
    public getDLPosition(scale, azimuth, altitude, objSphereCenter): number[] {
        if (scale === 0) { scale = 100; }
        const azimuth_calc = -90 + azimuth;
        let posX = Math.cos(altitude * Math.PI * 2 / 360) * Math.cos(azimuth_calc * Math.PI * 2 / 360) * scale * 2,
            posY = Math.cos(altitude * Math.PI * 2 / 360) * Math.sin(azimuth_calc * Math.PI * 2 / 360) * scale * 2,
            posZ = Math.sin(altitude * Math.PI * 2 / 360) * scale * 2;

        if (objSphereCenter) {
            posX += objSphereCenter.x;
            posY += objSphereCenter.y;
            posZ += objSphereCenter.z;
        }
        return [posX, posZ, posY];
    }

    /**
     * Get the bounding sphere of all objects
     */
    private _getAllObjsSphere(threeJSGroup) {
        const boxHelper = new THREE.BoxHelper(threeJSGroup);
        boxHelper.geometry.computeBoundingSphere();
        const boundingSphere = boxHelper.geometry.boundingSphere;
        return boundingSphere;
    }

    updateGround() {
        if (!this.scene || !this.scene.children) { return; }
        for (const childNode of this.scene.children) {
            if (childNode.id === 'aframe_ground') {
                this.scene.removeChild(childNode);
            }
        }
        if (!this.settings.ground.show) {
            return;
        }
        const ground = document.createElement('a-plane');
        ground.id = 'aframe_ground';
        ground.setAttribute('position', '0 ' + this.settings.ground.height + ' 0');
        ground.setAttribute('rotation', '-90 0 0');
        ground.setAttribute('width', this.settings.ground.width.toString());
        ground.setAttribute('height', this.settings.ground.length.toString());
        ground.setAttribute('color', this.settings.ground.color);
        ground.setAttribute('metalness', this.settings.ground.shininess.toString());
        ground.setAttribute('shadow', 'receive: true');
        this.scene.append(ground);
    }

    updateSky() {
        const skyBG = document.getElementById('aframe_sky_background');
        const skyFG = document.getElementById('aframe_sky_foreground');
        let skyURL: string;
        const backgroundSet = (Number(this.settings.background.background_set) - 1);
        let baseLink = window.location.origin;
        if (baseLink.indexOf('design-automation.github.io') !== -1) {
            baseLink += '/mobius-parametric-modeller-dev-0-8';
        }
        skyURL = baseLink + '/assets/img/background/bg' + backgroundSet + '/aframe.jpg';
        if (this.vr.enabled) {
            const bgUrl = processDownloadURL(this.vr.background_url);
            fetch(bgUrl).then(res => {
                if (!res.ok) {
                    const notifyButton = <HTMLButtonElement> document.getElementById('hidden_notify_button');
                    if (!notifyButton) { return; }
                    notifyButton.value = `Unable to retrieve background image from URL<br>${this.vr.background_url}`;
                    notifyButton.click();
                    return;
                } else if (bgUrl.trim() === '') {
                    return;
                }
                const assetEnt = document.getElementById('aframe_assets');
                const allImages = document.querySelectorAll('img');
                allImages.forEach(img => {
                    if (img.id !== 'aframe_sky_background_img') { return; }
                    img.id = 'aframe_sky_background_img_tbr';
                    try {
                        assetEnt.removeChild(img);
                    } catch (ex) {}
                    img.removeEventListener('load', postloadSkyBGImg);
                });
                const imgEnt = document.createElement('img');
                imgEnt.id = 'aframe_sky_background_img';
                    imgEnt.setAttribute('crossorigin', 'anonymous');
                imgEnt.setAttribute('src', bgUrl);
                assetEnt.appendChild(imgEnt);
                imgEnt.addEventListener('load', postloadSkyBGImg);

                skyBG.setAttribute('rotation', `0 ${90 + this.vr.background_rotation + this.north_rotation} 0`);
            });
            if (this.vr.foreground_url) {
                const fgUrl = processDownloadURL(this.vr.foreground_url);
                skyFG.setAttribute('visible', 'false');
                fetch(fgUrl).then(res => {
                    if (!res.ok) {
                        const notifyButton = <HTMLButtonElement> document.getElementById('hidden_notify_button');
                        if (!notifyButton) { return; }
                        notifyButton.value = `Unable to retrieve foreground image from URL<br>${this.vr.foreground_url}`;
                        notifyButton.click();
                        return;
                    } else if (fgUrl.trim() === '') {
                        return;
                    }
                    const assetEnt = document.getElementById('aframe_assets');
                    const allImages = document.querySelectorAll('img');
                    allImages.forEach(img => {
                        if (img.id !== 'aframe_sky_foreground_img') { return; }
                        img.id = 'aframe_sky_foreground_img_tbr';
                        try {
                            assetEnt.removeChild(img);
                        } catch (ex) {}
                        img.removeEventListener('load', postloadSkyFGImg);
                    });
                    const imgEnt = document.createElement('img');
                    imgEnt.id = 'aframe_sky_foreground_img';
                        imgEnt.setAttribute('crossorigin', 'anonymous');
                    imgEnt.setAttribute('src', fgUrl);
                    assetEnt.appendChild(imgEnt);
                    imgEnt.addEventListener('load', postloadSkyFGImg);

                    skyFG.setAttribute('rotation', `0 ${90 + this.vr.foreground_rotation + this.north_rotation} 0`);
                    skyFG.setAttribute('visible', 'true');
                });
            } else {
                skyFG.setAttribute('visible', 'false');
            }
        } else {
            skyBG.setAttribute('rotation', `0 0 0`);
            skyFG.setAttribute('visible', 'false');
        }

        if (skyBG) {
            (<any> skyBG).setAttribute('src', skyURL);
        } else {
            const skyEnt = document.createElement('a-sky');
            skyEnt.id = 'aframe_sky_background';
            skyEnt.setAttribute('src', skyURL);
            this.scene.appendChild(skyEnt);
        }
    }

    getCameraPos() {
        const rigEl = this.camera;
        if (rigEl) {
            const camEl = <any> document.getElementById('aframe_look_camera');
            const camera_pos = {
                position: new AFRAME.THREE.Vector3(),
                rotation: camEl.getAttribute('rotation')
            };
            // rigEl.object3D.getWorldPosition(camera_pos.position);
            camera_pos.position.copy(rigEl.getAttribute('position'));
            camera_pos.position.z =  - camera_pos.position.z;
            camera_pos.position.y = this.settings.camera.position.y;
            camera_pos.rotation.y = 0 - camera_pos.rotation.y;
            while (camera_pos.rotation.y < -180) { camera_pos.rotation.y += 360; }
            while (camera_pos.rotation.y > 180) { camera_pos.rotation.y -= 360; }
            return camera_pos;
        }
        return null;
    }

    updateCamPos() {
        try {
            this.sim_funcs.setModel(this.model);
            // const pts = <string[]> this._Funcs.query.Get('pt', null);
            // const pos = this._Funcs.attrib.Get(this._Funcs.query.Get('ps', pts), 'xyz');
            // const ptAttribs = this._Funcs.attrib.Get(pts, 'vr_hotspot');

            // TODO replace this with api methods
            // const pts = <string[]> this.sim_funcs.model.getEnts(EEntType.POINT);
            // const pts_posis = this.sim_funcs.model.getEnts(EEntType.POSI, pts);
            // const xyzs = this.sim_funcs.model.getAttribVal(EEntType.POSI, pts_posis, 'xyz');
            // const ptAttribs = this.sim_funcs.model.getAttribVal(EEntType.POINT, pts, 'vr_hotspot');

            const pts = <string[]> this.sim_funcs.query.Get(<any> 'pt', null);
            const xyzs = this.sim_funcs.attrib.Get(this.sim_funcs.query.Get(<any> 'ps', pts), 'xyz');
            const ptAttribs = this.sim_funcs.attrib.Get(pts, 'vr_hotspot');

            this._currentPos = null;
            this.camPosList = [
                {
                name: 'Default',
                value: null
                },
                // {
                //     name: 'Edit POV',
                //     value: null
                // }
            ];
            for (let i = 0; i < pts.length; i++) {
                if (!ptAttribs[i]) { continue; }
                const cam = JSON.parse(JSON.stringify(ptAttribs[i]));
                cam.pos = xyzs[i];
                if (!cam.name) { cam.name = pts[i]; }
                this.camPosList.push(cam);
            }
            const viewpointsList = document.getElementById('aframe_viewpoints');
            const newPointNum = this.camPosList.length - 1 - (viewpointsList.children.length / 2);
            if (newPointNum > 0) {
                for (let j = 0; j < newPointNum; j++) {
                    const newPoint_tetra = document.createElement('a-tetrahedron');
                    newPoint_tetra.id = 'aframe_viewpoint_tetra' + j.toString();
                    newPoint_tetra.setAttribute('color', '#ffc24d');
                    newPoint_tetra.setAttribute('roughness', '0');
                    newPoint_tetra.setAttribute('rotation', '35 0 45');
                    newPoint_tetra.setAttribute('radius', '3');
                    viewpointsList.appendChild(newPoint_tetra);

                    const newPoint_octa = document.createElement('a-octahedron');
                    newPoint_octa.id = 'aframe_viewpoint_octa' + j.toString();
                    newPoint_octa.setAttribute('color', '#ffc24d');
                    newPoint_octa.setAttribute('roughness', '0');
                    newPoint_octa.setAttribute('radius', '3');
                    viewpointsList.appendChild(newPoint_octa);
                }
            }
            for (let k = 0; k < viewpointsList.children.length; k++) {
                const pointPos = viewpointsList.children[k];
                pointPos.setAttribute('visible', 'false');
                const camPos = this.camPosList[Math.trunc(k / 2) + 1];
                if (Math.trunc(k / 2) + 1 >= this.camPosList.length) {
                    continue;
                } else if (camPos.background_url) {
                    if (k % 2 === 0) { continue; }
                } else if (k % 2 === 1) { continue; }
                pointPos.setAttribute('visible', 'true');
                pointPos.setAttribute('position', `${camPos.pos[0]} ${camPos.pos[2]} ${- camPos.pos[1]}`);
            }
        } catch (ex) {}
    }

    updateCamera(camera_pos = DEFAUT_CAMERA_POS) {
        if (this.disableCamSwitch) { return; }
        const rigEl = <any> document.getElementById('aframe_camera_rig');
        const camEl = <any> document.getElementById('aframe_look_camera');
        if (this.navMeshEnabled) {
            rigEl.setAttribute('movement-controls', {enabled: true, speed: `${this.settings.camera.acceleration / 100}`, constrainToNavMesh: true});
            rigEl.setAttribute('custom-wasd-controls', {enabled: false});
        } else {
            rigEl.setAttribute('movement-controls', {enabled: false});
            rigEl.setAttribute('custom-wasd-controls', {enabled: true, acceleration: `${this.settings.camera.acceleration}%`, fly: false});
        }
        if (this.vr.enabled) {
            setTimeout(() => {
                if (rigEl) {
                    const trueCameraPos = new AFRAME.THREE.Vector3();
                    trueCameraPos.copy(this.vr.camera_position);
                    trueCameraPos.z = - trueCameraPos.z;
                    rigEl.setAttribute('position', trueCameraPos);
                    const trueCamerarot = new AFRAME.THREE.Vector3();
                    trueCamerarot.copy(this.vr.camera_rotation);
                    trueCamerarot.y = 0 - this.vr.camera_rotation.y;
                    camEl.setAttribute('custom-look-controls', {enabled: false});
                    camEl.setAttribute('rotation', trueCamerarot);
                    const newX = camEl.object3D.rotation.x;
                    const newY = camEl.object3D.rotation.y;
                    try {
                        camEl.components['custom-look-controls'].pitchObject.rotation.x = newX;
                        camEl.components['custom-look-controls'].yawObject.rotation.y = newY;
                    } catch (ex) {}
                    camEl.setAttribute('custom-look-controls', {enabled: true});
                }
            }, 0);
            return;
        } else {
            setTimeout(() => {
                if (rigEl && camera_pos) {
                    const trueCameraPos = new AFRAME.THREE.Vector3();
                    trueCameraPos.copy(camera_pos.position);
                    trueCameraPos.z = - trueCameraPos.z;
                    rigEl.setAttribute('position', trueCameraPos);
                    const trueCamerarot = new AFRAME.THREE.Vector3();
                    trueCamerarot.copy(camera_pos.rotation);
                    trueCamerarot.y = 0 - camera_pos.rotation.y;
                    camEl.setAttribute('custom-look-controls', {enabled: false});
                    camEl.setAttribute('rotation', trueCamerarot);
                    const newX = camEl.object3D.rotation.x;
                    const newY = camEl.object3D.rotation.y;
                    try {
                        camEl.components['custom-look-controls'].pitchObject.rotation.x = newX;
                        camEl.components['custom-look-controls'].yawObject.rotation.y = newY;
                    } catch (ex) {}
                    camEl.setAttribute('custom-look-controls', {enabled: true});
                }
            }, 0);
        }
    }

    updateCameraPos(posDetails, changeCam = true) {
        if (posDetails && posDetails.name === this._currentPos) {
            return;
        }
        const skyBG = document.getElementById('aframe_sky_background');
        const skyFG = document.getElementById('aframe_sky_foreground');
        const viewpointsList = <any> document.getElementById('aframe_viewpoints');
        this.staticCamOn = false;
        if (!posDetails || !posDetails.pos || posDetails.pos.length < 2) {
            if (this._currentPos !== null) {
                this._currentPos = null;
                this.updateSky();
                if (viewpointsList) {
                    for (let i = 1; i < this.camPosList.length; i++) {
                        const extra = this.camPosList[i].background_url ? 1 : 0;
                        viewpointsList.children[(i - 1) * 2 + extra].setAttribute('visible', true);
                    }
                }
            }
            return;
        }
        this._currentPos = posDetails.name;

        if (viewpointsList) {
            for (const vp of viewpointsList.children) {
                vp.setAttribute('visible', false);
            }
        }
        const disablePosInput = <HTMLInputElement> document.getElementById('aframe-disablePosUpdate');
        if (disablePosInput) {
            disablePosInput.value = '1';
            setTimeout(() => disablePosInput.value = null, CAMERA_SNAP_DELAY);
        }

        const rigEl = <any> document.getElementById('aframe_camera_rig');
        const camPos = new AFRAME.THREE.Vector3(0, 0, 0);
        camPos.x = posDetails.pos[0];
        camPos.z = (0 - posDetails.pos[1]);
        camPos.y = posDetails.pos[2];
        if (!camPos.y && camPos.y !== 0) {
            camPos.y = 10;
        }
        rigEl.setAttribute('position', camPos);

        if (changeCam) {
            const camEl = <any> document.getElementById('aframe_look_camera');
            if (posDetails.camera_rotation) {
                camEl.setAttribute('rotation', new AFRAME.THREE.Vector3(0, 0 - posDetails.camera_rotation, 0));
                const newX = camEl.object3D.rotation.x;
                const newY = camEl.object3D.rotation.y;
                try {
                    camEl.components['custom-look-controls'].pitchObject.rotation.x = newX;
                    camEl.components['custom-look-controls'].yawObject.rotation.y = newY;
                } catch (ex) {}
            }
        }

        let bgCorrection = [0, 0]
        // if there's a adjustment attribute
        if (posDetails.correction ) {
            let adj_dir = posDetails.correction[0];
            const adj_rot = posDetails.correction[1];
            adj_dir = adj_dir + (90 + posDetails.background_rotation + this.north_rotation);

            const rad_dir = adj_dir * Math.PI / 180;
            const rotX = adj_rot * Math.cos(rad_dir)
            const rotY = adj_rot * Math.sin(rad_dir)
            bgCorrection = [rotX, rotY]
        }

        if (posDetails.background_url) {
            skyBG.setAttribute('src', '');
            skyBG.setAttribute('rotation', '0 0 0');
            const bgUrl = processDownloadURL(posDetails.background_url)
            fetch(bgUrl).then(res => {
                if (!res.ok) {
                    const notifyButton = <HTMLButtonElement> document.getElementById('hidden_notify_button');
                    if (!notifyButton) { return; }
                    notifyButton.value = `Unable to retrieve background image from URL<br>${posDetails.background_url}`;
                    notifyButton.click();
                    return;
                }
                const assetEnt = document.getElementById('aframe_assets');
                const allImages = document.querySelectorAll('img');
                allImages.forEach(img => {
                    if (img.id !== 'aframe_sky_background_img') { return; }
                    img.id = 'aframe_sky_background_img_tbr';
                    try {
                        assetEnt.removeChild(img);
                    } catch (ex) {}
                    img.removeEventListener('load', postloadSkyBGImg);
                });
                const imgEnt = document.createElement('img');
                imgEnt.id = 'aframe_sky_background_img';
                imgEnt.setAttribute('crossorigin', 'anonymous');
                imgEnt.setAttribute('src', bgUrl);
                assetEnt.appendChild(imgEnt);
                imgEnt.addEventListener('load', postloadSkyBGImg);
                skyBG.setAttribute('rotation',
                    `${bgCorrection[0]} ` +
                    `${90 + posDetails.background_rotation + this.north_rotation} ` +
                    `${bgCorrection[1]}`
                );
            });
        } else {
            this.updateSky();
        }
        if (posDetails.foreground_url) {
            skyFG.setAttribute('src', '');
            skyFG.setAttribute('visible', 'false');
            skyFG.setAttribute('rotation', '0 0 0');
            const fgUrl = processDownloadURL(posDetails.foreground_url)
            fetch(fgUrl).then(res => {
                if (!res.ok) {
                    const notifyButton = <HTMLButtonElement> document.getElementById('hidden_notify_button');
                    if (!notifyButton) { return; }
                    notifyButton.value = `Unable to retrieve foreground image from URL<br>${posDetails.foreground_url}`;
                    notifyButton.click();
                    return;
                }
                const assetEnt = document.getElementById('aframe_assets');
                const allImages = document.querySelectorAll('img');
                allImages.forEach(img => {
                    if (img.id !== 'aframe_sky_foreground_img') { return; }
                    img.id = 'aframe_sky_foreground_img_tbr';
                    try {
                        assetEnt.removeChild(img);
                    } catch (ex) {}
                    img.removeEventListener('load', postloadSkyFGImg);
                });
                const imgEnt = document.createElement('img');
                imgEnt.id = 'aframe_sky_foreground_img';
                imgEnt.setAttribute('crossorigin', 'anonymous');
                imgEnt.setAttribute('src', fgUrl);
                assetEnt.appendChild(imgEnt);
                imgEnt.addEventListener('load', postloadSkyFGImg);
                skyFG.setAttribute('rotation',
                `${bgCorrection[0]} ` +
                `${90 + posDetails.foreground_rotation + this.north_rotation} ` +
                `${bgCorrection[1]}`);
                skyFG.setAttribute('visible', 'true');
            });
        } else {
            skyFG.setAttribute('src', '');
            skyFG.setAttribute('visible', 'false');
        }
    }

    updateHUD() {
        if (!this.model || !this.model.modeldata) { return; }
        const hud = document.getElementById('aframe_hud');
        if (!this.sim_funcs.model.hasModelAttrib('hud')) {
            hud.innerHTML = '';
            hud.style.visibility = 'hidden';
            return;
        }
        hud.innerHTML = this.sim_funcs.model.getModelAttribVal('hud') as string;
    }

    detachAframeView() {
        const assetEnt = document.getElementById('aframe_assets');
        const allImages = document.querySelectorAll('img');

        this._currentPos = null;

        allImages.forEach(img => {
            try {
                assetEnt.removeChild(img);
            } catch (ex) {}
            img.id = 'tbr_' + img.id;
            img.removeEventListener('load', postloadSkyBGImg);
        });

        const tbrElements = [   'aframe_ambientLight', 'aframe_hemisphereLight', 'aframe_directionalLight',
                                'aframe_viewpoints',
                                'aframe_assets', 'aframe_viewpoint_assets',
                                'aframe_camera_rig', 'aframe_sky_background', 'mobius_geom', 'aframe_ground',
                                'aframe_hud'];
        for (const tbrElmName of tbrElements) {
            const tbr = document.getElementById(tbrElmName);
            if (!tbr) { continue; }
            tbr.id = 'tbr_' + tbrElmName;
        }
        if (!this.scene || !this.scene.renderer) { return; }
        this.scene.renderer.forceContextLoss();
        this.scene.renderer.dispose();
        // this.scene.renderer = null;
        for (const childObj of this.scene.children) {
            childObj.id = childObj.id + '_';
            childObj.remove();
        }
        AFRAME.THREE.Cache.clear();
    }

    updateVRSettings(vr_settings: any) {
        this.vr.enabled = vr_settings.enabled;
        this.vr.background_url = vr_settings.background_url;
        this.vr.background_rotation = vr_settings.background_rotation;
        this.vr.foreground_url = vr_settings.foreground_url;
        this.vr.foreground_rotation = vr_settings.foreground_rotation;
        this.vr.camera_position.copy(vr_settings.camera_position);
        this.vr.camera_rotation.copy(vr_settings.camera_rotation);
    }
}

