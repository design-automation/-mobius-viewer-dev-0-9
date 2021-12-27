/*
 *  This module is to be imported ONLY by the AppModule
 *  Contains all global services
 *
 */

import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

// import { ViewerSelectNodeComponent } from './components-viewer/viewer-select-node/viewer-select-node.component';
import { TabComponent } from './components-viewer/tab/tab.component';
import { TabsComponent } from './components-viewer/tabs/tabs.component';
import { ModalWindowComponent } from './components-viewer/modal-window/modal-window.component';
import { DropdownMenuComponent } from './components-viewer/dropdown-menu/dropdown-menu.component';
@NgModule({
    providers: [ ],
    declarations: [
        // ViewerSelectNodeComponent,
        TabComponent,
        TabsComponent,
        ModalWindowComponent,
        DropdownMenuComponent
    ],
    imports: [
        CommonModule
    ],
    entryComponents: [],
    exports: [
        // ViewerSelectNodeComponent,
        TabComponent,
        TabsComponent,
        ModalWindowComponent,
        DropdownMenuComponent
    ]
})
export class SharedViewerModule {
    constructor(@Optional() @SkipSelf() sharedViewer: SharedViewerModule) {
        /*
        /// Prevents any module apart from AppModule from re-importing
        if(shared){
            throw new Error("Core Module has already been imported");
        }
        */
    }
}
