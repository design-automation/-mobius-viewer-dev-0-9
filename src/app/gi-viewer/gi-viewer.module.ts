import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalService } from '@shared/services/modal-window.service';
import { SharedViewerModule } from '@shared/shared-viewer.module';
import { AngularSplitModule } from 'angular-split';
import { ColorPickerModule } from 'ngx-color-picker';

import { AttributeComponent } from './attribute/attribute.component';
import { AttributeModule } from './attribute/attribute.module';
import { ATabComponent } from './attribute/tab.component';
import { ATabsComponent } from './attribute/tabs.component';
import { GIViewerComponent } from './gi-viewer.component';
import { ThreejsViewerComponent } from './threejs/threejs-viewer.component';
import { ThreeJSViewerService } from './threejs/threejs-viewer.service';

// import @angular stuff
// import app components
/**
 * GIViewer
 * A viewer for Geo-Info models.
 */
@NgModule({
    declarations: [
        GIViewerComponent,
        ThreejsViewerComponent,
        AttributeComponent,
        ATabComponent,
        ATabsComponent,
    ],
    exports: [
        GIViewerComponent
    ],
    imports: [
        CommonModule,
        AngularSplitModule,
        MatSliderModule,
        MatIconModule,
        MatExpansionModule,
        MatTooltipModule,
        AttributeModule,
        FormsModule,
        ColorPickerModule,
        SharedViewerModule
    ],
    providers: [
        ModalService,
        ThreeJSViewerService
    ]
})
export class GIViewerModule {
     static forRoot(): ModuleWithProviders<GIViewerModule> {
        return {
            ngModule: GIViewerModule
        };
    }
}
