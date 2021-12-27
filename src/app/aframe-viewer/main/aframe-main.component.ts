import { OnChanges, Component, Input, AfterViewInit, OnDestroy, Output, EventEmitter, DoCheck } from '@angular/core';
// import @angular stuff
import {  } from '@angular/core';
// import app services
import { DataAframeService } from '../data/data.aframe.service';
import { DataService as ThreeJSDataService } from '../../gi-viewer/data/data.service';
import { Model } from '@design-automation/mobius-sim-funcs';

declare var AFRAME;
// const SKY_REFRESH_RATE = 200;

let prevCamPos = new AFRAME.THREE.Vector3();
/**
 * GIViewerComponent
 * This component is used in /app/model-viewers/model-viewers-container.component.html
 */
@Component({
    selector: 'aframe-main',
    templateUrl: './aframe-main.component.html',
    styleUrls: ['./aframe-main.component.scss'],
})
export class AframeMainComponent implements AfterViewInit, OnChanges, OnDestroy, DoCheck {
    // model data passed to the viewer
    @Input() model: Model;
    @Input() nodeIndex: number;
    @Output() eventAction = new EventEmitter();

    camPosSaved = false;
    interval: NodeJS.Timer;
    container;
    private _width;
    private _height;



    /**
     * constructor
     * @param dataService
     */
    constructor(private dataService: DataAframeService, private threeJSDataService: ThreeJSDataService) {
        // this.interval = setInterval(AframeMainComponent.updateCamSkyPos, SKY_REFRESH_RATE);
    }

    static updateCamSkyPos() {
        const cameraEl = <any> document.getElementById('aframe_camera_rig');
        if (!cameraEl) { return; }
        const posVec = new AFRAME.THREE.Vector3();
        cameraEl.object3D.getWorldPosition(posVec);
        if (!prevCamPos || (posVec.x !== prevCamPos.x && posVec.z !== prevCamPos.z)) {
            prevCamPos = posVec;
        }
    }

    ngOnDestroy() {
        // clearInterval(this.interval);
        const data = this.dataService.getAframeData();
        if (!this.camPosSaved) {
            this.dataService.aframe_cam = data.getCameraPos();
        }
        data.detachAframeView();
    }

    ngAfterViewInit() {
        const data = this.dataService.getAframeData();
        const threejsScene = this.threeJSDataService.getThreejsScene();
        if (!threejsScene || !data) { return; }
        data.scene = <any> document.getElementById('aframe_scene');
        data.camera = <any> document.getElementById('aframe_camera_rig');
        data.model = this.model;
        data.refreshModel(threejsScene);
        if (this.dataService.aframe_cam) {
            setTimeout(() => {
                data.updateCamera(this.dataService.aframe_cam);
                this.dataService.aframe_cam = null;
                data.disableCamSwitch = true;
                setTimeout(() => {
                    data.disableCamSwitch = false;
                }, 1000);
            }, 0);
        }
        setTimeout(() => {
            this.updateCamList(data);
        }, 0);
    }

    ngOnChanges(changes) {
        if (changes.model || changes.nodeIndex) {
            if (this.model && this.nodeIndex) {
                const data = this.dataService.getAframeData();
                const threejsScene = this.threeJSDataService.getThreejsScene();
                if (!threejsScene || !data) { return; }
                if (!this.model) {
                    data.removeMobiusObjs();
                    return;
                }
                if ((changes.model && !changes.model.previousValue) || (changes.nodeIndex && !changes.nodeIndex.previousValue)) {
                    if (threejsScene.model === this.model && threejsScene.nodeIndex === this.nodeIndex) {
                        return;
                    }
                }
                data.model = this.model;
                if (!threejsScene.model || threejsScene.model !== this.model || threejsScene.nodeIndex !== this.nodeIndex) {
                    threejsScene.model = this.model;
                    threejsScene.nodeIndex = this.nodeIndex;
                    threejsScene.populateScene(this.model, null);
                }
                data.refreshModel(threejsScene);
                if (this.dataService.aframe_cam) {
                    data.updateCamera(this.dataService.aframe_cam);
                    this.dataService.aframe_cam = null;
                }
                // ###############################
                this.updateCamList(data);
            }
        }
    }

    ngDoCheck() {
        if (!this.container) {
            this.container = <HTMLDivElement> document.getElementById('aframe-container');
            if (!this.container) {
                console.error('No container in Three Viewer');
                return;
            }
        }
        const width: number = this.container.offsetWidth;
        const height: number = this.container.offsetHeight;

        // this is when dimensions change
        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;
            const scene = <any> document.getElementById('aframe_scene');
            if (scene.renderer) {
                scene.resize(width, height);
            }
        }
    }

    saveCamPos() {
        const data = this.dataService.getAframeData();
        this.dataService.aframe_cam = data.getCameraPos();
        this.camPosSaved = true;
    }

    updateCamList(data) {
        this.eventAction.emit({
            'type': 'posListUpdate',
            'posList': data.camPosList
        });
    }

    onmousedown(event) {
        (<HTMLElement> document.activeElement).blur();
        event.preventDefault();
    }
}
