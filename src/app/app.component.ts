import { Component, Injector, Input,
    ViewChild, ViewContainerRef, ComponentFactoryResolver, OnDestroy, OnInit, DoCheck, HostListener, AfterViewInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { _parameterTypes } from '@design-automation/mobius-sim-funcs';
import { FileHandle } from './directives/dragDropDirective';
import { DataService as GIDataService } from './gi-viewer/data/data.service';
import { Viewers } from './model-viewers.config';
import { DataService } from './shared/services/data.service';
import { IView } from './view.interface';
import {customLookControl, customWASDControl, keyboardControlComponent, movementControlComponent,
    navAgentComponent, navMeshComponent, navSystem} from '@shared/utils';
import * as icon_reg from '@assets/Icons/icon_reg.json';

declare var AFRAME;
function registerAframeComponents() {
    if (AFRAME.components['custom-look-controls']) { return; }
    AFRAME.registerSystem('nav', navSystem);
    AFRAME.registerComponent('custom-wasd-controls', customWASDControl);
    AFRAME.registerComponent('custom-look-controls', customLookControl);
    AFRAME.registerComponent('nav-mesh', navMeshComponent);
    AFRAME.registerComponent('nav-agent', navAgentComponent);
    AFRAME.registerComponent('keyboard-controls', keyboardControlComponent);
    AFRAME.registerComponent('movement-controls', movementControlComponent);
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements DoCheck, OnInit, OnDestroy, AfterViewInit {
    files: FileHandle[] = [];

    @ViewChild('vc', { read: ViewContainerRef, static: true }) vc: ViewContainerRef;
    data = null;
    private views = [];
    private activeView: IView;
    Viewers = Viewers;

    constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer,
        private injector: Injector, private r: ComponentFactoryResolver, private dataService: DataService,
        private giDataService: GIDataService) {
        registerAframeComponents()
        // this.matIconRegistry.addSvgIcon('settings', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/Settings.svg'));
        // this.matIconRegistry.addSvgIcon('select', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/Select.svg'));
        // this.matIconRegistry.addSvgIcon('cZoom', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/Zoom.svg'));
        // this.matIconRegistry.addSvgIcon('cControlCam', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/ControlCam.svg'));
        // this.matIconRegistry.addSvgIcon('cVisibility', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/visibility.svg'));
        // this.matIconRegistry.addSvgIcon('c3D Viewer', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/3D2.svg'));
        // this.matIconRegistry.addSvgIcon('cThree Geo Viewer', this.domSanitizer.bypassSecurityTrustResourceUrl('assets/Icons/Geo.svg'));
        this.registerIcons();
        const newModel = _parameterTypes.newFn();
        this.data = newModel;
    }

    registerIcons() {
        // @ts-ignore
        icon_reg.default.data.forEach(
            entry => this.matIconRegistry.addSvgIcon(entry.name, this.domSanitizer.bypassSecurityTrustResourceUrl(entry.url))
        );
    }

    /**
     * ngOnInit
     */
    ngOnInit() {
        this.activeView = this.Viewers[0];
        if (this.dataService.activeView) {
            for (const view of this.Viewers) {
                if (view.name === this.dataService.activeView) {
                    this.activeView = view;
                }
            }
        }
        if (this.activeView.name !== '3D Viewer') {
            this.giDataService.switch_page = false;
        }
        this.updateView( this.activeView );
    }
    /**
     * ngOnDestroy
     */
    ngOnDestroy() {
        this.dataService.activeView = this.activeView.name;
        this.vc.clear();
        for (const view in this.views) {
            if (this.views[view]) {
                this.views[view].destroy();
            }
        }
    }
    /**
     * ngDoCheck
     */
    ngDoCheck() {
        if (this.dataService.helpView[0] === true) {
            let view;
            for (const v of this.Viewers) {
                if (v.name === 'Help') { view = v; }
            }
            this.dataService.toggleViewHelp(false);
            this.updateView(view);
        } else { this.updateValue(); }
    }
    ngAfterViewInit() {
        console.log(window.location);
        const urlSplit = new URLSearchParams(window.location.search);
        const promiseList = [null, null];
        if (urlSplit.get('file')) {
            try {
                this.setSpinner(true);
                const p = fetch(urlSplit.get('file')).then(res => {
                    if (!res.ok) { return null; }
                    return res.text();
                });
                promiseList[0] = p
            } catch (ex) {
                this.setSpinner(false);
            }
        }
        if (urlSplit.get('context')) {
            try {
                this.setSpinner(true);
                const p = fetch(urlSplit.get('context')).then(res => {
                    if (!res.ok) { return null; }
                    return res.text();
                });
                promiseList[1] = p
            } catch (ex) {
                this.setSpinner(false);
            }
        }
        setTimeout(async () => {
            const newModel = _parameterTypes.newFn();
            for (const p of promiseList) {
                const resultText = await p;
                if (!resultText) { continue; }
                if (resultText.startsWith('{"type":"GIJson"')) {
                    newModel.importGI(resultText)
                } else {
                    newModel.importSIM(resultText);
                }
            }
            this.data = newModel;
            setTimeout(() => {
                const giZoom = document.getElementById('zoomingfit');
                if (giZoom) { giZoom.click(); }
                this.setSpinner(false);
            }, 50);
        }, 0);


        // if (urlSplit.get('file')) {
        //     try {
        //         this.setSpinner(true);
        //         fetch(urlSplit.get('file')).then(
        //             res => {
        //                 if (!res.ok) { return null; }
        //                 return res.text();
        //         }).then(
        //             resultText => {
        //                 if (!resultText) {
        //                     this.setSpinner(false);
        //                     return;
        //                 }
        //                 const newModel = _parameterTypes.newFn();
        //                 newModel.importSIM(resultText);
        //                 this.data = newModel;
        //                 setTimeout(() => {
        //                     const giZoom = document.getElementById('zoomingfit');
        //                     if (giZoom) { giZoom.click(); }
        //                     this.setSpinner(false);
        //                 }, 50);
        //         })
        //     } catch (ex) {
        //         this.setSpinner(false);
        //     }
        // }
        // if (urlSplit.get('context')) {
        //     try {
        //         fetch(urlSplit.get('context')).then(
        //             res => {
        //                 if (!res.ok) { return null; }
        //                 return res.text();
        //         }).then(
        //             resultText => {
        //                 if (!resultText) {
        //                     return;
        //                 }
        //                 this.data.importSIM(resultText);
        //                 setTimeout(() => {
        //                     const giZoom = document.getElementById('zoomingfit');
        //                     if (giZoom) { giZoom.click(); }
        //                 }, 50);
        //         })
        //     } catch (ex) {
        //     }
        // }
        // setTimeout(() => {
        //     const container = document.getElementById('dummy_container');
        //     if (container.childElementCount === 0) {
        //         const publishElement = document.createElement('div');
        //         publishElement.setAttribute('id', 'published');
        //         container.appendChild(publishElement);
        //         this.dataService.attribVal = 0;
        //     }
        // }, 0);
    }
    /**
     * createView
     * @param view
     */
     createView(view: IView) {
        const component = view.component;
        const factory = this.r.resolveComponentFactory(component);
        const componentRef = factory.create(this.injector);
        componentRef.instance['nodeIndex'] = 1;
        componentRef.instance['data'] = this.data;
        componentRef.instance['data'].setActiveSnapshot(1);
        /*
        if (view.name != 'Console'){
            componentRef.instance["data"] = this.data;
        }
        */
        return componentRef;
    }
    /**
     * updateView
     * @param view
     */
     updateView(view: IView, viewCheck = false): void {
        if (viewCheck && view.name === this.activeView.name) { return; }
        this.activeView = view;

        if (this.views['VR Viewer']) {
            (<HTMLElement> document.getElementById('save_aframe_camera')).click();
            setTimeout(() => {
                this.views['VR Viewer'].destroy();
                this.views['VR Viewer'] = undefined;
            }, 0);
        }

        if ( this.views[ this.activeView.name ] === undefined) {
            this.views[ this.activeView.name ] = this.createView(view);
        }

        this.updateValue();

        this.vc.detach();
        this.vc.insert( this.views[ this.activeView.name ].hostView );
    }
    /**
     * updateValue
     */
    updateValue() {
        try {
            const componentRef =  this.views[ this.activeView.name ];
            if (this.activeView.name === 'Help') {
                // componentRef.instance['output'] = this.dataService.helpView[1];
            } else if (this.activeView.name !== 'Console') {
                componentRef.instance['data'] = this.data;
                componentRef.instance['nodeIndex'] = 1;
            // } else {
            //     componentRef.instance['scrollcheck'] = true;
            }
        } catch (ex) {
            // console.log(`Active View not defined`);
        }
    }

    setSpinner(isOn) {
        if (isOn) {
            document.getElementById('spinner-on').click();
        } else {
            document.getElementById('spinner-off').click();
        }
    }


    async filesDropped(files: FileHandle[]) {
        if (files.length === 0) { return; }
        const f = files[0];
        this.setSpinner(true);
        try {
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                this.data = _parameterTypes.newFn();
                if ((<string>fileReader.result).startsWith('{"type":"GIJson"')) {
                    this.data.importGI(fileReader.result)
                } else {
                    this.data.importSIM(fileReader.result);
                }

                this.setSpinner(false);
            };
            fileReader.readAsText(f.file, 'json/applications');
        } catch (ex) {
            this.setSpinner(false);
        }
    }

    @HostListener('window:message', ['$event'])
    async onWindowMessage(event: MessageEvent) {
        if (!event.data.messageType) {
            return;
        }
        this.setSpinner(true);
        try {
            switch (event.data.messageType) {
                case 'ping':
                    console.log('ping message')
                    this.setSpinner(false);
                    return;
                case 'update':
                    if (!event.data.url && !event.data.model) {
                        this.setSpinner(false);
                        return;
                    }
                    const newModel = _parameterTypes.newFn();
                    const allGIData = [];
                    if (event.data.url) {
                        if (typeof event.data.url === 'string') {
                            allGIData.push(fetch(event.data.url).then(
                                res => {
                                    if (!res.ok) { return null; }
                                    return res.text();
                            }));
                        } else if (Array.isArray(event.data.url)) {
                            event.data.url.forEach((url: string) => {
                                allGIData.push(fetch(url).then(
                                    res => {
                                    if (!res.ok) {
                                        return null;
                                    }
                                    return res.text();
                                }));
                            });
                        }
                    }
                    let results;
                    if (event.data.model) {
                        if ((<string>event.data.model).startsWith('{"type":"GIJson"')) {
                            newModel.importGI(event.data.model)
                        } else {
                            newModel.importSIM(event.data.model);
                        }
                    }
                    await Promise.all(allGIData).then((r) => results = r);
                    for (const data of results) {
                        if ((<string>data).startsWith('{"type":"GIJson"')) {
                            newModel.importGI(data)
                        } else {
                            newModel.importSIM(data);
                        }
                    }
                    this.data = newModel;
                    if (event.data.keepSettings || event.data.keepCamera) {
                    } else {
                        setTimeout(() => {
                            const zoomfit = document.getElementById('zoomingfit');
                            if (zoomfit) { zoomfit.click(); }
                        }, 0);
                    }
                    break;
                case 'update_settings':
                    if (event.data.GI_settings) {
                        const oldSettings = JSON.parse(localStorage.getItem('mpm_settings'));
                        let newSettings = event.data.GI_settings;
                        if (typeof newSettings === 'string') {
                            newSettings = JSON.parse(newSettings);
                        }
                        this.settingsCheck(newSettings, oldSettings)
                        localStorage.setItem('mpm_settings', JSON.stringify(newSettings));
                        this.dataService.viewerSettingsUpdated = true
                    }
                    if (event.data.Geo_settings) {
                        const oldSettings = JSON.parse(localStorage.getItem('geo_settings'));
                        let newSettings = event.data.Geo_settings;
                        if (typeof newSettings === 'string') {
                            newSettings = JSON.parse(newSettings);
                        }
                        this.settingsCheck(newSettings, oldSettings)
                        localStorage.setItem('geo_settings', JSON.stringify(newSettings));
                        this.dataService.viewerSettingsUpdated = true
                    }
                    // const model = this.data;
                    // const newModel = _parameterTypes.newFn();
                    // this.data = newModel;
                    // setTimeout(() => {
                    //     this.data = model;
                    // }, 0);
                    break;
                case 'get_localstorage_list':
                    let fileList = JSON.parse(localStorage.getItem('mobius_backup_list'));
                    if (!fileList) {
                        fileList = [];
                    }
                    window.parent.postMessage({
                        messageType: 'localstorage_list',
                        file_list: fileList
                    }, '*');
                    break;
                case 'zoom_to_fit':
                    const giZoom = document.getElementById('zoomingfit');
                    if (giZoom) { giZoom.click(); }
                    // const cesiumZoom = document.getElementById('cesium_zoom_fit');
                    // if (cesiumZoom) { cesiumZoom.click(); }
                    break;
            }
            // const container = document.getElementById('dummy_container');
            // if (!event.data.showAttrTable) {
            //     if (container.childElementCount === 0) {
            //         const publishElement = document.createElement('div');
            //         publishElement.setAttribute('id', 'published');
            //         container.appendChild(publishElement);
            //         this.dataService.attribVal = 0;
            //     }
            // } else if (container.childElementCount > 0) {
            //     container.removeChild(container.firstElementChild);
            //     this.dataService.attribVal = 34;
            // }
        } catch( ex ) {}
        this.setSpinner(false);
    }

    settingsCheck(obj1, obj2, checkChildren = true) {
        for (const i in obj2) {
            if (!obj1.hasOwnProperty(i)) {
                obj1[i] = JSON.parse(JSON.stringify(obj2[i]));
            } else if (checkChildren && obj1[i].constructor === {}.constructor && obj2[i].constructor === {}.constructor) {
                this.settingsCheck(obj1[i], obj2[i], false);
            }
        }
    }
}
