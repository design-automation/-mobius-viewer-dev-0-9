import { Model } from '@design-automation/mobius-sim-funcs';
import { OnDestroy } from '@angular/core';
// import @angular stuff
import { Component, Input } from '@angular/core';
// import app services
import { DataService as MD } from '@services';
import { Vector3 } from 'three';
import { DataGeoService } from './data/data.geo.service';
import { GeoSettings, geo_default_settings } from './gi-geo-viewer.settings';
import { DataService as ThreeJSDataService } from '../gi-viewer/data/data.service';
import { ModalService } from '@shared/services/modal-window.service';

/**
 * GIViewerComponent
 * This component is used in /app/model-viewers/model-viewers-container.component.html
 */
@Component({
    selector: 'gi-geo-viewer',
    templateUrl: './gi-geo-viewer.component.html',
    styleUrls: ['./gi-geo-viewer.component.scss'],
})
export class GIGeoViewerComponent implements OnDestroy {
    // model data passed to the viewer
    @Input() data: Model;
    @Input() nodeIndex: number;
    temp_camera_pos = new Vector3(0, 0, 0);
    temp_camera_rot = new Vector3(0, 0, 0);

    public settings: GeoSettings;
    public backup_settings: GeoSettings;
    public colorLayerList: string[];
    public elevLayerList: string[];

    public viewerDate: string;
    public viewerTime: string;
    public viewerTimeSlider: number;
    public viewerTimeText: string;

    private settingsUpdateInterval;

    /**
     * constructor
     * @param dataService
     */
    constructor(private dataService: DataGeoService,
                private modalService: ModalService,
                private threeJSDataService: ThreeJSDataService,
                private mainDataService: MD) {
        this.settings = JSON.parse(JSON.stringify(geo_default_settings));
        setTimeout(() => {
            this.settings = JSON.parse(JSON.stringify(this.dataService.getGeoScene().settings));
            this.temp_camera_pos.set(this.settings.camera.pos.x, this.settings.camera.pos.y, this.settings.camera.pos.z);
            this.temp_camera_rot.set(this.settings.camera.rot.x, this.settings.camera.rot.y, this.settings.camera.rot.z);
            this.preModalSettings();
        }, 0);

        // this.settingsUpdateInterval = setInterval(() => {
        //     if (this.mainDataService.geoViewerSettingsUpdated) {
        //         const geoScene = this.dataService.getGeoScene();
        //         if (!geoScene.model) { return; }

        //         const loadedSettings = JSON.parse(localStorage.getItem('geo_settings'));
        //         this.updateSettings(this.settings, loadedSettings);
        //         geoScene.settings = JSON.parse(JSON.stringify(loadedSettings));
        //         geoScene.refreshModel(this.threeJSDataService.getThreejsScene(), true);
        //         this.mainDataService.geoViewerSettingsUpdated = false;
        //     }
        // }, 100);

    }

    ngOnDestroy() {
        clearInterval(this.settingsUpdateInterval);
        this.settingsUpdateInterval = null;
    }

    zoomfit() {
        const view = this.dataService.getGeoScene();
        const threejs = this.threeJSDataService.getThreejsScene();
        view.lookAtObj(threejs);
    }

    /**
     * settingOnChange
     * @param setting
     * @param value
     */
    public settingOnChange(setting: string, value?: number) {
        const scene = this.threeJSDataService.getThreejsScene();
        switch (setting) {
            case 'time.date':
                const current_time = (new Date()).toISOString().split(':');
                this.settings.time.date = current_time[0] + ':' + current_time[1];
                break;
            case 'time.current':
                const reset_time = (new Date()).toISOString().split(':');
                this.settings.time.date = reset_time[0] + ':' + reset_time[1];
                this.dataService.getGeoScene().updateLightPos(this.settings.time.date);
                break;
            case 'camera.pos_x':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_pos.x = value;
                break;
            case 'camera.pos_y':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_pos.y = value;
                break;
            case 'camera.pos_z':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_pos.z = value;
                break;
            case 'camera.get_camera_pos':
                const cam_pos = this.dataService.getGeoScene().view.camera.camera3D.position;
                this.temp_camera_pos.x = cam_pos.x;
                this.temp_camera_pos.y = cam_pos.y;
                this.temp_camera_pos.z = cam_pos.z;
                this.settings.camera.pos = this.temp_camera_pos;
                break;
            case 'camera.target_x':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_rot.x = value;
                break;
            case 'camera.target_y':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_rot.y = value;
                break;
            case 'camera.target_z':
                if (isNaN(value)) {
                    return;
                }
                this.temp_camera_rot.z = value;
                break;
            case 'camera.get_camera_rot':
                const cam_rot = this.dataService.getGeoScene().view.camera.camera3D.rotation;
                this.temp_camera_rot.x = cam_rot.x;
                this.temp_camera_rot.y = cam_rot.y;
                this.temp_camera_rot.z = cam_rot.z;
                this.settings.camera.rot = this.temp_camera_rot;
                break;
            case 'camera.reset_camera':
                this.temp_camera_pos.x = 0;
                this.temp_camera_pos.y = 0;
                this.temp_camera_pos.z = 0;
                this.temp_camera_rot.x = 0;
                this.temp_camera_rot.y = 0;
                this.temp_camera_rot.z = 0;
                this.settings.camera.pos = this.temp_camera_pos;
                this.settings.camera.rot = this.temp_camera_rot;
                break;

        }
    }

    formatNumber(value) {
        if (!value) { value = 0; }
        return Math.round(value * 100) / 100;
    }

    /**
     *
     * @param id
     */
     public openModal(id: string) {
        if (localStorage.getItem('geo_settings') !== null) {
            // this.settings = JSON.parse(localStorage.getItem('mpm_settings'));
        }
        if (document.body.className === 'modal-open') {
            this.modalService.close(id);
        } else {
            this.backup_settings = <GeoSettings> JSON.parse(JSON.stringify(this.settings));
            const scene = this.dataService.getGeoScene();
            this.colorLayerList = scene.viewColorLayers.map(layer => layer.source.attribution.name);
            // this.elevLayerList = scene.viewElevationLayers.map(provider => provider.name);
            this.preModalSettings();
            this.modalService.open(id);
        }
    }
    public preModalSettings() {
        [this.viewerDate, this.viewerTime] = this.settings.time.date.split('T');
        const timeSplit = this.viewerTime.split(':');
        const hr = Number(timeSplit[0]);
        this.viewerTimeSlider = hr * 60 + Number(timeSplit[1]);
        if (hr > 11) {
            const hrNum = hr > 12 ? hr - 12 : hr;
            if (hrNum < 10) {
                this.viewerTimeText = '0' + hrNum + ':' + timeSplit[1] + 'pm';
            } else {
                this.viewerTimeText = hrNum + ':' + timeSplit[1] + 'pm';
            }
        } else {
            this.viewerTimeText = this.viewerTime + 'am';
        }
    }

    /**
     *
     * @param id
     * @param save
     */
    public closeModal(id: string, save = false) {
        this.modalService.close(id);
        if (save) {
            this.settings.camera = {
                pos: this.temp_camera_pos,
                rot: this.temp_camera_rot
            };
            this.dataService.getGeoScene().updateSettings(this.settings);
            // document.getElementById('executeButton').click();
        } else {
            this.settings = this.backup_settings;
        }
    }

    // public checkAPIKeyInput() {
    //     if (API_MAPS.indexOf(this.settings.imagery.layer)  !== -1) {
    //         if (!this.settings.imagery.apiKey[API_MAPS_KEY_MAPPING[this.settings.imagery.layer]]) {
    //             this.settings.imagery.apiKey[API_MAPS_KEY_MAPPING[this.settings.imagery.layer]] = '';
    //         }
    //         return true;
    //     }
    //     return false;
    // }

    public onCloseModal() {
        this.settings = this.backup_settings;
        // tslint:disable-next-line: forin
        // for (const setting in this.dataService.getThreejsScene().settings) {
        //     this.settings[setting] = this.dataService.getThreejsScene().settings[setting];
        // }
        // this.threejs.updateModel(this.data);
    }

    openViewerHelp() {
        this.mainDataService.helpView = '...geoviewer/geo-viewer';
        this.mainDataService.toggleHelp(true);
    }

    public updateSettings(thisSettings: any, newSettings: any) {
        if (thisSettings === newSettings) { return; }
        for (const i in thisSettings) {
            if (newSettings.hasOwnProperty(i)) {
                if (thisSettings[i].constructor !== {}.constructor) {
                    thisSettings[i] = newSettings[i];
                } else {
                    this.updateSettings(thisSettings[i], newSettings[i]);
                }
            }
        }
    }

    resetToDefault() {
        this.settings = JSON.parse(JSON.stringify(geo_default_settings));
    }

    public updateLighting(date, time) {
        this.settings.time.date = date + 'T' + time;
        this.dataService.getGeoScene().updateLightPos(this.settings.time.date);
    }
    public updateLightingFromSlider(timeNum) {
        const hr = Math.floor(timeNum / 60);
        const mn = timeNum % 60;
        const mnStr = mn < 10 ? '0' + mn : mn.toString();
        let timePoint = hr + ':' + mnStr;
        if (hr < 10) {
            timePoint = '0' + timePoint;
        }
        if (hr > 11) {
            const hrNum = hr > 12 ? hr - 12 : hr;
            if (hrNum < 10) {
                this.viewerTimeText = '0' + hrNum + ':' + mnStr + 'pm';
            } else {
                this.viewerTimeText = hrNum + ':' + mnStr + 'pm';
            }
        } else {
            this.viewerTimeText = timePoint + 'am';
        }

        this.settings.time.date = this.viewerDate + 'T' + timePoint;
        this.viewerTime = timePoint;
        this.dataService.getGeoScene().updateLightPos(this.settings.time.date);
        this.dataService.getGeoScene().updateSettings(this.settings);
    }

}
