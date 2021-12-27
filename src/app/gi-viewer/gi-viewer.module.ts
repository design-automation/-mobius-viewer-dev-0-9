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

import { AttributeModule } from './attribute/attribute.module';

// import app components
import { GIViewerComponent } from './gi-viewer.component';
import { ThreejsViewerComponent } from './threejs/threejs-viewer.component';
import { AttributeComponent } from './attribute/attribute.component';

import { ATabComponent } from './attribute/tab.component';
import { ATabsComponent } from './attribute/tabs.component';
import { ThreeJSViewerService } from './threejs/threejs-viewer.service';
import { SharedViewerModule } from '@shared/shared-viewer.module';
import { ModalService } from '@shared/services/modal-window.service';

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
        NgxPaginationModule,
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
