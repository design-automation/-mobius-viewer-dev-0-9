import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalService } from '@shared/services/modal-window.service';
import { SharedViewerModule } from '@shared/shared-viewer.module';
import { AngularSplitModule } from 'angular-split';
import { ColorPickerModule } from 'ngx-color-picker';

import { AframeViewerComponent } from './aframe-viewer.component';
import { AframeMainComponent } from './main/aframe-main.component';

// import @angular stuff
// import app components
/**
 * GIViewer
 * A viewer for Geo-Info models.
 */
@NgModule({
    declarations: [
        AframeViewerComponent,
        AframeMainComponent,
    ],
    exports: [
        AframeViewerComponent
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
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AframeViewerModule {
     static forRoot(): ModuleWithProviders<AframeViewerModule> {
        return {
            ngModule: AframeViewerModule
        };
    }
}
