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

import { GIGeoViewerComponent } from './gi-geo-viewer.component';
import { ThreeGeoComponent } from './threejs/three-geo-viewer.component';

// import @angular stuff
// import app components
/**
 * GIViewer
 * A viewer for Geo-Info models.
 */
@NgModule({
    declarations: [
        GIGeoViewerComponent,
        ThreeGeoComponent,
    ],
    exports: [
        GIGeoViewerComponent
    ],
    imports: [
        CommonModule,
        AngularSplitModule,
        MatSliderModule,
        MatIconModule,
        MatExpansionModule,
        MatTooltipModule,
        FormsModule,
        ColorPickerModule,
        SharedViewerModule
    ],
    providers: [
        ModalService
    ]
})
export class GIGeoViewerModule {
     static forRoot(): ModuleWithProviders<GIGeoViewerModule> {
        return {
            ngModule: GIGeoViewerModule
        };
    }
}
