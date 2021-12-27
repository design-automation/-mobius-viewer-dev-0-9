import { AngularSplitModule } from 'angular-split';
import { NgxPaginationModule} from 'ngx-pagination';
// import @angular stuff
import { NgModule, ModuleWithProviders, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule} from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule} from '@angular/material/expansion';
import { ColorPickerModule } from 'ngx-color-picker';

// import app components
import { AframeViewerComponent } from './aframe-viewer.component';

import { AframeMainComponent } from './main/aframe-main.component';
import { SharedViewerModule } from '@shared/shared-viewer.module';
import { ModalService } from '@shared/services/modal-window.service';

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
        NgxPaginationModule,
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
