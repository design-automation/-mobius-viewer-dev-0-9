import { AngularSplitModule } from 'angular-split';
import { NgxPaginationModule} from 'ngx-pagination';
// import @angular stuff
import { NgModule, ModuleWithProviders } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule} from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule} from '@angular/material/expansion';
import { ColorPickerModule } from 'ngx-color-picker';

// import app components
import { GIGeoViewerComponent } from './gi-geo-viewer.component';

import { ThreeGeoComponent } from './threejs/three-geo-viewer.component';
import { SharedViewerModule } from '@shared/shared-viewer.module';
import { ModalService } from '@shared/services/modal-window.service';

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
        NgxPaginationModule,
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
